# -*- coding: utf-8 -*-
"""
Entrenamiento y evaluacion reproducible del modelo supervisado (Seccion
"Modelo de Machine Learning supervisado" del PFI).

Entrada:  ml/data/dataset.json.gz  (snapshot congelado; se genera con
          node scripts/export_ml_training_data.js > ml/data/dataset.json && gzip -n ml/data/dataset.json)
Salidas:  ml/model.joblib       modelo de produccion + metadatos
          ml/model_card.json    version, hash del dataset, cortes, features,
                                hiperparametros, semilla y todas las metricas
          ml/results.md         reporte legible
          pfi_latex/images/ml/  figuras para la tesis

Decisiones metodologicas (todas verificables en este archivo):
  - Etiqueta: el score sube >= LABEL_THRESHOLD puntos entre una corrida y la
    siguiente. Solo se usan pares de corridas consecutivas separadas por menos
    de MAX_LABEL_GAP_H horas (si el producto dejo de aparecer y volvio dias
    despues, la "etiqueta" compararia dos estados sin relacion).
  - Split temporal con purga y embargo: entrenamiento = filas cuya etiqueta
    (nextComputedAt) ya se conoce antes del corte; validacion = filas cuyas
    features empiezan despues de corte + EMBARGO_DAYS, para que ninguna
    ventana de 7 dias de validacion comparta capturas con el entrenamiento.
  - Evaluacion con origen movil (varios cortes) para medir estabilidad.
  - Metricas para clase desbalanceada: PR-AUC (vs. prevalencia), matriz de
    confusion, tasa de falsos positivos y tabla por umbral; Brier y curva de
    calibracion para decidir si la salida puede llamarse "probabilidad".

Uso: python ml/train_model.py
"""
import gzip
import hashlib
import json
import platform
from datetime import timedelta
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
from sklearn.calibration import CalibratedClassifierCV, calibration_curve  # noqa: E402
from sklearn.ensemble import RandomForestClassifier  # noqa: E402
from sklearn.inspection import permutation_importance  # noqa: E402
from sklearn.linear_model import LogisticRegression  # noqa: E402
from sklearn.metrics import (  # noqa: E402
    average_precision_score, brier_score_loss, confusion_matrix,
    precision_recall_curve, roc_auc_score,
)

ROOT = Path(__file__).resolve().parent
DATASET_PATH = ROOT / "data" / "dataset.json.gz"
FIG_DIR = ROOT.parent / "pfi_latex" / "images" / "ml"

SEED = 42
LABEL_THRESHOLD = 5
MAX_LABEL_GAP_H = 24
# Cambio de metodo de la estabilidad (promedio entre vendedores) que no se
# refleja en los pesos persistidos; el cambio de pesos se detecta por formula.
METHOD_CHANGES = ["2026-09-23T17:51:08Z"]
ACTIVE_HOURS = 48
EMBARGO_DAYS = 7
TRAIN_FRAC = 0.8
ROLLING_FRACS = [0.6, 0.7, 0.8]
RECALL_TARGET = 0.70

FEATURES = [
    "frecuencia", "permanencia", "ranking", "estabilidad",
    "delta_frecuencia", "delta_permanencia", "delta_ranking", "delta_estabilidad",
]
RF_PARAMS = dict(
    n_estimators=300, max_depth=8, min_samples_leaf=5,
    class_weight="balanced", random_state=SEED, n_jobs=-1,
)
LOGREG_PARAMS = dict(max_iter=2000, class_weight="balanced")


# ── Datos ────────────────────────────────────────────────────────────────────
def load_dataset():
    raw = gzip.decompress(DATASET_PATH.read_bytes())
    df = pd.DataFrame(json.loads(raw))
    df["computedAt"] = pd.to_datetime(df["computedAt"])
    df["nextComputedAt"] = pd.to_datetime(df["nextComputedAt"])
    n_raw = len(df)
    df = df.dropna(subset=FEATURES)
    n_complete = len(df)
    gap_h = (df["nextComputedAt"] - df["computedAt"]).dt.total_seconds() / 3600
    df = df[gap_h <= MAX_LABEL_GAP_H]
    n_gap_ok = len(df)
    # Pares que cruzan un cambio de metodologia del score: la diferencia mide
    # el cambio de formula, no el mercado (Seccion "Definicion formal del score").
    crosses = df["formula"] != df["formula_siguiente"]
    for change in METHOD_CHANGES:
        t = pd.Timestamp(change)
        crosses |= (df["computedAt"] < t) & (df["nextComputedAt"] >= t)
    df = df[~crosses]
    n_method_ok = len(df)
    # Misma poblacion que en produccion: solo productos activos (aparecieron
    # en las ultimas ACTIVE_HOURS horas). Despues de dejar de aparecer, el
    # score se sigue calculando mientras la ventana se vacia.
    df = df[df["horas_desde_aparicion"].notna() & (df["horas_desde_aparicion"] <= ACTIVE_HOURS)]
    df["label"] = ((df["score_siguiente"] - df["score"]) >= LABEL_THRESHOLD).astype(int)
    df = df.sort_values("computedAt").reset_index(drop=True)
    info = {
        "sha256": hashlib.sha256(raw).hexdigest(),
        "rows_raw": n_raw,
        "rows_with_features": n_complete,
        "rows_used": len(df),
        "rows_dropped_gap": n_complete - n_gap_ok,
        "rows_dropped_method_change": n_gap_ok - n_method_ok,
        "rows_dropped_inactive": n_method_ok - len(df),
        "products": int(df["productId"].nunique()),
        "from": df["computedAt"].min().isoformat(),
        "to": df["computedAt"].max().isoformat(),
        "positive_rate": float(df["label"].mean()),
    }
    return df, info


def temporal_split(df, frac, embargo_days=EMBARGO_DAYS):
    cutoff = df["computedAt"].quantile(frac)
    train = df[df["nextComputedAt"] < cutoff]
    val_start = cutoff + timedelta(days=embargo_days)
    val = df[df["computedAt"] >= val_start]
    assert train["nextComputedAt"].max() < val["computedAt"].min(), "fuga: etiqueta de train posterior a validacion"
    return train, val, cutoff, val_start


def X(df):
    return df[FEATURES].to_numpy()


# ── Metricas ─────────────────────────────────────────────────────────────────
def threshold_for_recall(y, proba, target):
    prec, rec, thr = precision_recall_curve(y, proba)
    ok = np.where(rec[:-1] >= target)[0]
    return float(thr[ok[-1]]) if len(ok) else 0.5


def metrics_at(y, proba, thr):
    pred = (proba >= thr).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, pred, labels=[0, 1]).ravel()
    return {
        "threshold": round(float(thr), 4),
        "tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp),
        "precision": tp / (tp + fp) if tp + fp else 0.0,
        "recall": tp / (tp + fn) if tp + fn else 0.0,
        "fpr": fp / (fp + tn) if fp + tn else 0.0,
        "f1": 2 * tp / (2 * tp + fp + fn) if tp else 0.0,
        "alert_rate": float(pred.mean()),
    }


def ranking_metrics(y, score):
    return {
        "roc_auc": float(roc_auc_score(y, score)) if len(set(y)) > 1 else float("nan"),
        "pr_auc": float(average_precision_score(y, score)) if y.sum() else float("nan"),
        "prevalence": float(y.mean()),
    }


def r(x, n=3):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), n)


# ── Modelos y baselines ──────────────────────────────────────────────────────
def fit_rf(train):
    return RandomForestClassifier(**RF_PARAMS).fit(X(train), train["label"])


def fit_logreg(train):
    return LogisticRegression(**LOGREG_PARAMS).fit(X(train), train["label"])


def baselines(val):
    return {
        "Regla: frecuencia en aumento (delta_frecuencia > 0)": (val["delta_frecuencia"] > 0).astype(float).to_numpy(),
        "Regla: persistencia (ya subio >= 5 en la corrida anterior)": (val["delta_score_prev"] >= LABEL_THRESHOLD).astype(float).to_numpy(),
        "Score descriptivo (mas alto = mas chance)": val["score"].to_numpy(),
        "Score descriptivo invertido (mas bajo = mas chance)": (100 - val["score"]).to_numpy(),
    }


# ── Experimentos ─────────────────────────────────────────────────────────────
def main():
    FIG_DIR.mkdir(parents=True, exist_ok=True)
    df, data_info = load_dataset()
    print(f"Dataset {data_info['sha256'][:12]}: {data_info['rows_used']} filas, "
          f"{data_info['products']} productos, {data_info['positive_rate']*100:.2f}% positivos")

    # 1) Split principal con purga + embargo
    train, val, cutoff, val_start = temporal_split(df, TRAIN_FRAC)
    y_tr, y_val = train["label"].to_numpy(), val["label"].to_numpy()
    split_info = {
        "cutoff": cutoff.isoformat(), "validation_from": val_start.isoformat(),
        "train_rows": len(train), "train_products": int(train["productId"].nunique()),
        "train_from": train["computedAt"].min().isoformat(), "train_to": train["computedAt"].max().isoformat(),
        "train_last_label_at": train["nextComputedAt"].max().isoformat(),
        "train_positive_rate": float(y_tr.mean()),
        "val_rows": len(val), "val_products": int(val["productId"].nunique()),
        "val_from": val["computedAt"].min().isoformat(), "val_to": val["computedAt"].max().isoformat(),
        "val_positive_rate": float(y_val.mean()),
        "rows_purged_or_embargoed": int(len(df) - len(train) - len(val)),
        "val_products_seen_in_train": int(val["productId"].isin(set(train["productId"])).sum()),
    }

    rf = fit_rf(train)
    lr = fit_logreg(train)
    p_rf = rf.predict_proba(X(val))[:, 1]
    p_lr = lr.predict_proba(X(val))[:, 1]

    thr_rf = threshold_for_recall(y_val, p_rf, RECALL_TARGET)
    models = {
        "Random Forest": {**ranking_metrics(y_val, p_rf),
                          "at_0.5": metrics_at(y_val, p_rf, 0.5),
                          "at_recall_target": metrics_at(y_val, p_rf, thr_rf),
                          "brier": brier_score_loss(y_val, p_rf),
                          "mean_output": float(p_rf.mean())},
        "Regresion Logistica": {**ranking_metrics(y_val, p_lr),
                                "at_0.5": metrics_at(y_val, p_lr, 0.5),
                                "brier": brier_score_loss(y_val, p_lr),
                                "mean_output": float(p_lr.mean())},
    }
    base = {name: ranking_metrics(y_val, s) for name, s in baselines(val).items()}
    for name, s in baselines(val).items():
        if set(np.unique(s)) <= {0.0, 1.0}:
            base[name]["at_rule"] = metrics_at(y_val, s, 0.5)

    threshold_table = [metrics_at(y_val, p_rf, t) for t in [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]]

    # 2) Control de fuga: split aleatorio (con fuga) vs temporal; etiquetas permutadas
    rng = np.random.default_rng(SEED)
    idx = rng.permutation(len(df))
    cut = int(len(df) * TRAIN_FRAC)
    rnd_tr, rnd_val = df.iloc[idx[:cut]], df.iloc[idx[cut:]]
    p_rnd = fit_rf(rnd_tr).predict_proba(X(rnd_val))[:, 1]
    shuf_runs = []
    for k in range(10):
        shuffled = train.copy()
        shuffled["label"] = np.random.default_rng(SEED + 100 + k).permutation(shuffled["label"].to_numpy())
        shuf_runs.append(ranking_metrics(y_val, fit_rf(shuffled).predict_proba(X(val))[:, 1]))
    _, val_noemb, _, _ = temporal_split(df, TRAIN_FRAC, embargo_days=0)
    p_noemb = rf.predict_proba(X(val_noemb))[:, 1]
    leakage = {
        "temporal_purga_embargo": ranking_metrics(y_val, p_rf),
        "temporal_purga_sin_embargo": ranking_metrics(val_noemb["label"].to_numpy(), p_noemb),
        "aleatorio_con_fuga": ranking_metrics(rnd_val["label"].to_numpy(), p_rnd),
        "etiquetas_permutadas_10_corridas": {
            "roc_auc": float(np.mean([x["roc_auc"] for x in shuf_runs])),
            "roc_auc_std": float(np.std([x["roc_auc"] for x in shuf_runs])),
            "pr_auc": float(np.mean([x["pr_auc"] for x in shuf_runs])),
            "pr_auc_std": float(np.std([x["pr_auc"] for x in shuf_runs])),
        },
    }

    # 3) Origen movil
    rolling = []
    for frac in ROLLING_FRACS:
        tr, va, c, vs = temporal_split(df, frac)
        if va["label"].sum() == 0 or len(va) < 100:
            continue
        p = fit_rf(tr).predict_proba(X(va))[:, 1]
        y = va["label"].to_numpy()
        rolling.append({"train_frac": frac, "cutoff": c.isoformat(), "val_rows": len(va),
                        **ranking_metrics(y, p), "recall_at_0.5": metrics_at(y, p, 0.5)["recall"],
                        "precision_at_0.5": metrics_at(y, p, 0.5)["precision"]})

    # 4) Productos no vistos: productos de validacion que nunca aparecen en train
    unseen = []
    prods = df["productId"].unique()
    for k in range(5):
        rng_k = np.random.default_rng(SEED + k)
        test_prods = set(rng_k.choice(prods, size=int(len(prods) * 0.2), replace=False))
        tr = train[~train["productId"].isin(test_prods)]
        va = val[val["productId"].isin(test_prods)]
        if va["label"].sum() == 0:
            continue
        p = fit_rf(tr).predict_proba(X(va))[:, 1]
        y = va["label"].to_numpy()
        unseen.append({"repeticion": k + 1, "val_rows": len(va), "val_products": int(va["productId"].nunique()),
                       **ranking_metrics(y, p), "recall_at_0.5": metrics_at(y, p, 0.5)["recall"]})

    # 5) Por categoria
    by_cat = []
    for cat, g in val.assign(p=p_rf).groupby("categoria"):
        y = g["label"].to_numpy()
        m = metrics_at(y, g["p"].to_numpy(), 0.5)
        by_cat.append({"categoria": cat, "filas": len(g), "productos": int(g["productId"].nunique()),
                       "positivos": int(y.sum()), **ranking_metrics(y, g["p"].to_numpy()),
                       "recall": m["recall"], "precision": m["precision"], "fpr": m["fpr"]})
    coverage = (df.groupby("categoria").agg(filas=("label", "size"), productos=("productId", "nunique"),
                                            prevalencia=("label", "mean")).reset_index().to_dict("records"))

    # 6) Variable objetivo: sensibilidad del umbral, estabilidad y sostenimiento
    sens = []
    for t in [3, 5, 7, 10]:
        d = df.assign(label=((df["score_siguiente"] - df["score"]) >= t).astype(int))
        tr, va, _, _ = temporal_split(d, TRAIN_FRAC)
        p = fit_rf(tr).predict_proba(X(va))[:, 1]
        sens.append({"umbral": t, "prevalencia": float(d["label"].mean()),
                     **{k: v for k, v in ranking_metrics(va["label"].to_numpy(), p).items() if k != "prevalence"}})
    deltas = df["score_siguiente"] - df["score"]
    weekly = (df.set_index("computedAt").resample("W")["label"].agg(["size", "mean"]).reset_index())
    weekly = [{"semana": w.strftime("%Y-%m-%d"), "filas": int(s), "prevalencia": float(m)}
              for w, s, m in weekly.itertuples(index=False) if s > 0]
    # Sostenimiento: de los saltos >= +5, cuantos siguen arriba 3 corridas (~1 dia) despues
    sustained = sustained_rise(df)
    # Efecto de llenado de ventana: un producto que recien empieza a aparecer
    # sube de score por construccion mientras acumula dias en la ventana de 7.
    first_seen = df.groupby("productId")["computedAt"].transform("min")
    age_days = (df["computedAt"] - first_seen).dt.total_seconds() / 86400
    young = age_days < EMBARGO_DAYS
    window_fill = {
        "filas_primeros_7_dias": int(young.sum()),
        "prevalencia_primeros_7_dias": float(df.loc[young, "label"].mean()),
        "prevalencia_despues": float(df.loc[~young, "label"].mean()),
        "positivos_en_primeros_7_dias": float(df.loc[young, "label"].sum() / df["label"].sum()),
        "por_umbral": [
            {"umbral": t, "share_primeros_7_dias": float(
                ((df["score_siguiente"] - df["score"] >= t) & young).sum()
                / max(1, (df["score_siguiente"] - df["score"] >= t).sum()))}
            for t in [3, 5, 7, 10]
        ],
    }
    mature = df[~young]
    tr_m, va_m, _, _ = temporal_split(mature, TRAIN_FRAC)
    p_m = fit_rf(tr_m).predict_proba(X(va_m))[:, 1]
    window_fill["validacion_sin_productos_nuevos"] = {"val_rows": len(va_m), **ranking_metrics(va_m["label"].to_numpy(), p_m)}
    target_info = {
        "window_fill": window_fill,
        "delta_quantiles": {str(q): float(deltas.quantile(q)) for q in [0.05, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99]},
        "delta_iqr": float(deltas.quantile(0.75) - deltas.quantile(0.25)),
        "threshold_percentile": float((deltas < LABEL_THRESHOLD).mean()),
        "sensitivity": sens, "weekly_prevalence": weekly, "sustained": sustained,
    }

    # 7) Calibracion: isotonica ajustada con validacion cruzada temporal dentro del train
    cal = CalibratedClassifierCV(RandomForestClassifier(**RF_PARAMS), method="isotonic",
                                 cv=_time_folds(train, 3)).fit(X(train), y_tr)
    p_cal = cal.predict_proba(X(val))[:, 1]
    calibration = {
        "raw": {"brier": brier_score_loss(y_val, p_rf), "mean_output": float(p_rf.mean()),
                "prevalence": float(y_val.mean()), **_ece(y_val, p_rf)},
        "isotonic": {"brier": brier_score_loss(y_val, p_cal), "mean_output": float(p_cal.mean()),
                     **_ece(y_val, p_cal), **ranking_metrics(y_val, p_cal)},
        "brier_climatologico": brier_score_loss(y_val, np.full(len(y_val), y_tr.mean())),
    }

    perm = permutation_importance(rf, X(val), y_val, scoring="average_precision",
                                  n_repeats=10, random_state=SEED, n_jobs=-1)
    importance = sorted([{"feature": f, "pr_auc_drop": float(m), "std": float(s)}
                         for f, m, s in zip(FEATURES, perm.importances_mean, perm.importances_std)],
                        key=lambda x: -x["pr_auc_drop"])

    # 8) Modelo de produccion: misma configuracion validada, entrenado con todo.
    # Sin calibrar: la calibracion isotonica no supera al Brier climatologico y
    # empeora la PR-AUC, asi que la salida se publica como indice de prioridad
    # (0-100), no como probabilidad. Los cortes alto/medio/bajo salen de la
    # validacion: "alto" = umbral que alcanza el recall objetivo.
    prod = RandomForestClassifier(**RF_PARAMS).fit(X(df), df["label"])
    version = f"rf_{df['computedAt'].max().date()}_{data_info['sha256'][:8]}"
    levels = {"alto": round(thr_rf, 4), "medio": 0.2}
    joblib.dump({"model": prod, "feature_cols": FEATURES, "model_version": version, "levels": levels},
                ROOT / "model.joblib")

    figures(y_val, p_rf, p_cal, thr_rf, base, val)

    card = {
        "model_version": version, "dataset": data_info, "levels": levels,
        "config": {"seed": SEED, "label_threshold": LABEL_THRESHOLD, "max_label_gap_h": MAX_LABEL_GAP_H,
                   "method_changes": METHOD_CHANGES, "active_hours": ACTIVE_HOURS, "embargo_days": EMBARGO_DAYS, "train_frac": TRAIN_FRAC, "features": FEATURES,
                   "random_forest": RF_PARAMS, "logistic_regression": LOGREG_PARAMS,
                   "balanceo": "class_weight='balanced' (sin sobremuestreo)",
                   "calibracion": "isotonica, CalibratedClassifierCV con 3 particiones temporales"},
        "environment": {"python": platform.python_version(), "sklearn": sklearn.__version__,
                        "pandas": pd.__version__, "numpy": np.__version__},
        "split": split_info, "models": models, "baselines": base, "threshold_table": threshold_table,
        "leakage_checks": leakage, "rolling_origin": rolling, "unseen_products": unseen,
        "by_category": by_cat, "coverage": coverage, "target": target_info,
        "calibration": calibration, "permutation_importance": importance,
    }
    (ROOT / "model_card.json").write_text(
        json.dumps(_clean(card), indent=2, ensure_ascii=False, allow_nan=False), encoding="utf-8")
    (ROOT / "results.md").write_text(report(card), encoding="utf-8")
    print(report(card))


def _clean(o):
    """JSON valido: NaN (metrica indefinida, ej. categoria sin positivos) -> null."""
    if isinstance(o, dict):
        return {k: _clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_clean(v) for v in o]
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, (float, np.floating)):
        return None if np.isnan(o) else float(o)
    return o


def _time_folds(df, n):
    """Particiones temporales para calibrar sin mezclar futuro y pasado."""
    df = df.reset_index(drop=True)
    edges = np.linspace(0, len(df), n + 2).astype(int)
    folds = []
    for i in range(1, n + 1):
        tr_idx = np.arange(0, edges[i])
        cut_time = df.loc[edges[i] - 1, "nextComputedAt"]
        va_idx = np.arange(edges[i], edges[i + 1])
        va_idx = va_idx[df.loc[va_idx, "computedAt"].to_numpy() > cut_time]
        folds.append((tr_idx, va_idx))
    return folds


def _ece(y, p, bins=10):
    frac_pos, mean_pred = calibration_curve(y, p, n_bins=bins, strategy="quantile")
    counts = np.histogram(p, bins=np.quantile(p, np.linspace(0, 1, bins + 1)))[0]
    w = counts[: len(frac_pos)] / max(1, counts[: len(frac_pos)].sum())
    return {"ece": float(np.sum(w * np.abs(frac_pos - mean_pred)))}


def sustained_rise(df):
    out = {"saltos": 0, "sostenidos_1_dia": 0}
    for _, g in df.sort_values("computedAt").groupby("productId"):
        s = g["score"].to_numpy()
        nxt = g["score_siguiente"].to_numpy()
        for i in range(len(g)):
            if nxt[i] - s[i] >= LABEL_THRESHOLD and i + 3 < len(g):
                out["saltos"] += 1
                if s[i + 3] - s[i] >= LABEL_THRESHOLD:
                    out["sostenidos_1_dia"] += 1
    out["proporcion"] = out["sostenidos_1_dia"] / out["saltos"] if out["saltos"] else None
    return out


def _c(x):
    return f"{x:.2f}".replace(".", ",")


# ── Figuras ──────────────────────────────────────────────────────────────────
def figures(y, p_rf, p_cal, thr, base, val):
    plt.rcParams.update({"font.size": 9})

    fig, ax = plt.subplots(figsize=(5, 3.6))
    prec, rec, _ = precision_recall_curve(y, p_rf)
    ax.plot(rec, prec, label=f"Random Forest (PR-AUC {_c(average_precision_score(y, p_rf))})", color="#1f6f43")
    s = val["score"].to_numpy()
    for name, sc, col in [("Score descriptivo invertido", 100 - s, "#b45309"), ("Score descriptivo", s, "#6b7280")]:
        pr, rc, _ = precision_recall_curve(y, sc)
        ax.plot(rc, pr, label=f"{name} (PR-AUC {_c(average_precision_score(y, sc))})", color=col, lw=1)
    ax.axhline(y.mean(), ls="--", color="#9ca3af", lw=1, label=f"Azar (prevalencia {_c(y.mean())})")
    ax.set_xlabel("Recall (tendencias reales detectadas)")
    ax.set_ylabel("Precisión")
    ax.legend(fontsize=7, loc="upper right")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    fig.tight_layout()
    fig.savefig(FIG_DIR / "pr_curve.png", dpi=200)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(4.6, 3.6))
    for p, name, col in [(p_rf, "Sin calibrar", "#b91c1c"), (p_cal, "Calibración isotónica", "#1f6f43")]:
        fp, mp = calibration_curve(y, p, n_bins=10, strategy="quantile")
        ax.plot(mp, fp, "o-", label=name, color=col, ms=3)
    ax.plot([0, 1], [0, 1], ls="--", color="#9ca3af", lw=1, label="Calibración perfecta")
    ax.set_xlabel("Salida media del modelo")
    ax.set_ylabel("Frecuencia real de positivos")
    ax.legend(fontsize=7)
    fig.tight_layout()
    fig.savefig(FIG_DIR / "calibration.png", dpi=200)
    plt.close(fig)

    cm = confusion_matrix(y, (p_rf >= thr).astype(int), labels=[0, 1])
    fig, ax = plt.subplots(figsize=(3.4, 3))
    ax.imshow(cm, cmap="Greens")
    for (i, j), v in np.ndenumerate(cm):
        ax.text(j, i, str(v), ha="center", va="center", fontsize=11,
                color="white" if v > cm.max() / 2 else "black")
    ax.set_xticks([0, 1], ["Predice 0", "Predice 1"])
    ax.set_yticks([0, 1], ["Real 0", "Real 1"])
    ax.set_title(f"Umbral {_c(thr)}", fontsize=9)
    fig.tight_layout()
    fig.savefig(FIG_DIR / "confusion_matrix.png", dpi=200)
    plt.close(fig)


# ── Reporte ──────────────────────────────────────────────────────────────────
def report(c):
    L = [f"# Modelo `{c['model_version']}`\n"]
    d, s = c["dataset"], c["split"]
    L.append(f"- Dataset sha256 `{d['sha256'][:16]}`: {d['rows_raw']} filas exportadas, {d['rows_used']} usadas "
             f"({d['rows_dropped_gap']} descartadas por hueco > {c['config']['max_label_gap_h']} h, {d['rows_dropped_method_change']} por cruzar un cambio de formula, {d['rows_dropped_inactive']} de productos sin aparecer en {c['config']['active_hours']} h), "
             f"{d['products']} productos, {d['from'][:10]} a {d['to'][:10]}, {d['positive_rate']*100:.2f}% positivos.")
    L.append(f"- Corte {s['cutoff'][:16]}; validacion desde {s['validation_from'][:16]} (embargo {c['config']['embargo_days']} dias).")
    L.append(f"- Train: {s['train_rows']} filas, {s['train_from'][:10]} a {s['train_to'][:10]}, ultima etiqueta {s['train_last_label_at'][:16]}, "
             f"{s['train_positive_rate']*100:.2f}% positivos.")
    L.append(f"- Validacion: {s['val_rows']} filas, {s['val_products']} productos, {s['val_from'][:10]} a {s['val_to'][:10]}, "
             f"{s['val_positive_rate']*100:.2f}% positivos. Purgadas/embargadas: {s['rows_purged_or_embargoed']}.\n")
    L.append("## Modelos (validacion)")
    for name, m in c["models"].items():
        a = m["at_0.5"]
        L.append(f"- {name}: ROC-AUC {r(m['roc_auc'])}, PR-AUC {r(m['pr_auc'])} (prevalencia {r(m['prevalence'])}), "
                 f"umbral 0.5 -> P {r(a['precision'])} R {r(a['recall'])} FPR {r(a['fpr'])} "
                 f"[TN {a['tn']} FP {a['fp']} FN {a['fn']} TP {a['tp']}], Brier {r(m['brier'])}")
    t = c["models"]["Random Forest"]["at_recall_target"]
    L.append(f"- RF al umbral para recall >= {RECALL_TARGET}: thr {t['threshold']} P {r(t['precision'])} R {r(t['recall'])} "
             f"FPR {r(t['fpr'])} [TN {t['tn']} FP {t['fp']} FN {t['fn']} TP {t['tp']}]\n")
    L.append("## Baselines")
    for name, m in c["baselines"].items():
        extra = ""
        if "at_rule" in m:
            a = m["at_rule"]
            extra = f" | regla: P {r(a['precision'])} R {r(a['recall'])} FPR {r(a['fpr'])}"
        L.append(f"- {name}: ROC-AUC {r(m['roc_auc'])}, PR-AUC {r(m['pr_auc'])}{extra}")
    L.append("\n## Tabla por umbral (RF)")
    for t in c["threshold_table"]:
        L.append(f"- {t['threshold']}: P {r(t['precision'])} R {r(t['recall'])} FPR {r(t['fpr'])} alertas {r(t['alert_rate'])}")
    L.append("\n## Controles de fuga")
    for name, m in c["leakage_checks"].items():
        L.append(f"- {name}: ROC-AUC {r(m['roc_auc'])}, PR-AUC {r(m['pr_auc'])}")
    L.append("\n## Origen movil")
    for x in c["rolling_origin"]:
        L.append(f"- corte {x['cutoff'][:10]} ({x['val_rows']} filas): ROC-AUC {r(x['roc_auc'])} PR-AUC {r(x['pr_auc'])} "
                 f"prev {r(x['prevalence'])} R@0.5 {r(x['recall_at_0.5'])} P@0.5 {r(x['precision_at_0.5'])}")
    L.append("\n## Productos no vistos")
    for x in c["unseen_products"]:
        L.append(f"- rep {x['repeticion']} ({x['val_products']} prod, {x['val_rows']} filas): ROC-AUC {r(x['roc_auc'])} "
                 f"PR-AUC {r(x['pr_auc'])} prev {r(x['prevalence'])} R@0.5 {r(x['recall_at_0.5'])}")
    L.append("\n## Por categoria (validacion, umbral 0.5)")
    for x in c["by_category"]:
        L.append(f"- {x['categoria']}: {x['filas']} filas, {x['productos']} prod, {x['positivos']} pos, ROC-AUC {r(x['roc_auc'])} "
                 f"PR-AUC {r(x['pr_auc'])} prev {r(x['prevalence'])} R {r(x['recall'])} P {r(x['precision'])} FPR {r(x['fpr'])}")
    tg = c["target"]
    L.append("\n## Variable objetivo")
    L.append(f"- Cuantiles del cambio de score: {json.dumps({k: round(v, 2) for k, v in tg['delta_quantiles'].items()})}; "
             f"+{LABEL_THRESHOLD} = percentil {tg['threshold_percentile']*100:.1f}")
    for x in tg["sensitivity"]:
        L.append(f"- umbral +{x['umbral']}: prevalencia {r(x['prevalencia'])}, ROC-AUC {r(x['roc_auc'])}, PR-AUC {r(x['pr_auc'])}")
    L.append(f"- Sostenimiento: {tg['sustained']}")
    L.append(f"- Llenado de ventana: {json.dumps(tg['window_fill'], default=float)}")
    L.append(f"- Prevalencia semanal: {[(w['semana'], round(w['prevalencia'], 3)) for w in tg['weekly_prevalence']]}")
    cal = c["calibration"]
    L.append("\n## Calibracion")
    L.append(f"- Sin calibrar: Brier {r(cal['raw']['brier'])}, ECE {r(cal['raw']['ece'])}, salida media {r(cal['raw']['mean_output'])} "
             f"vs prevalencia {r(cal['raw']['prevalence'])}")
    L.append(f"- Isotonica: Brier {r(cal['isotonic']['brier'])}, ECE {r(cal['isotonic']['ece'])}, salida media "
             f"{r(cal['isotonic']['mean_output'])}, PR-AUC {r(cal['isotonic']['pr_auc'])}")
    L.append(f"- Brier de referencia (predecir siempre la prevalencia de train): {r(cal['brier_climatologico'])}")
    L.append("\n## Importancia por permutacion (caida de PR-AUC)")
    for x in c["permutation_importance"]:
        L.append(f"- {x['feature']}: {r(x['pr_auc_drop'], 4)} ± {r(x['std'], 4)}")
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    main()
