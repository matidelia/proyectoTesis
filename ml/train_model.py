# -*- coding: utf-8 -*-
"""
Modelo de Machine Learning supervisado (etapa 75%, Seccion 1.4.4 del PFI).

Sigue exactamente el diseno metodologico ya documentado en la tesis:
  - Variable objetivo: clasificacion binaria (score sube >=5 puntos en la
    ventana siguiente = 1, si no 0).
  - Etiquetado automatico y retrospectivo a partir del historico de TrendScore.
  - Features: los 4 componentes del score (frecuencia, permanencia, ranking,
    estabilidad), su variacion respecto de la ventana anterior, la categoria
    del producto y la variacion porcentual de precio.
  - Separacion entrenamiento/validacion por corte de fecha (time-based split),
    NO aleatoria, para evitar fuga de informacion del futuro hacia el pasado.
  - Metricas: precision, recall, F1 y AUC-ROC, con foco en el recall de la
    clase positiva (perder una tendencia real es mas costoso que una alerta
    de mas).

Uso: python ml/train_model.py
"""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score,
    classification_report, confusion_matrix,
)

ROOT = Path(__file__).resolve().parent
DATASET_PATH = ROOT / "dataset.json"
RESULTS_PATH = ROOT / "results.md"

FEATURE_COLS_BASE = [
    "frecuencia", "permanencia", "ranking", "estabilidad",
    "delta_frecuencia", "delta_permanencia", "delta_ranking", "delta_estabilidad",
    "variacion_precio_pct",
]


def load_dataset():
    with open(DATASET_PATH, encoding="utf-8") as f:
        rows = json.load(f)
    df = pd.DataFrame(rows)
    df["computedAt"] = pd.to_datetime(df["computedAt"])
    df = df.dropna(subset=FEATURE_COLS_BASE)
    df = df.sort_values("computedAt").reset_index(drop=True)
    return df


def time_based_split(df, train_frac=0.8):
    """Corte de fecha: el primer train_frac de la linea de tiempo es train,
    el resto (mas reciente) es validacion. No es aleatorio."""
    cutoff_idx = int(len(df) * train_frac)
    cutoff_date = df.iloc[cutoff_idx]["computedAt"]
    train = df[df["computedAt"] < cutoff_date]
    val = df[df["computedAt"] >= cutoff_date]
    return train, val, cutoff_date


def build_features(df, categoria_cols):
    X = df[FEATURE_COLS_BASE].copy()
    dummies = pd.get_dummies(df["categoria"], prefix="cat")
    for c in categoria_cols:
        if c not in dummies.columns:
            dummies[c] = 0
    dummies = dummies[categoria_cols]
    X = pd.concat([X.reset_index(drop=True), dummies.reset_index(drop=True)], axis=1)
    return X


def evaluate(name, y_true, y_pred, y_proba):
    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    try:
        auc = roc_auc_score(y_true, y_proba)
    except ValueError:
        auc = float("nan")
    cm = confusion_matrix(y_true, y_pred)
    report = classification_report(y_true, y_pred, target_names=["No crece (0)", "Crece (1)"], zero_division=0)
    return {
        "name": name, "precision": precision, "recall": recall, "f1": f1, "auc": auc,
        "confusion_matrix": cm.tolist(), "report": report,
    }


def main():
    df = load_dataset()
    print(f"Dataset: {len(df)} ejemplos, {df['label'].mean()*100:.1f}% positivos")

    train_df, val_df, cutoff = time_based_split(df, train_frac=0.8)
    print(f"Corte de fecha: {cutoff}")
    print(f"Train: {len(train_df)} ejemplos ({train_df['label'].mean()*100:.1f}% positivos)")
    print(f"Val:   {len(val_df)} ejemplos ({val_df['label'].mean()*100:.1f}% positivos)")

    categoria_cols = sorted(pd.get_dummies(df["categoria"], prefix="cat").columns.tolist())

    X_train = build_features(train_df, categoria_cols)
    y_train = train_df["label"].values
    X_val = build_features(val_df, categoria_cols)
    y_val = val_df["label"].values

    results = []

    # --- Baseline: Regresion Logistica (interpretable, referencia minima) ---
    logreg = LogisticRegression(max_iter=2000, class_weight="balanced")
    logreg.fit(X_train, y_train)
    proba = logreg.predict_proba(X_val)[:, 1]
    pred = (proba >= 0.5).astype(int)
    results.append(evaluate("Regresion Logistica (baseline)", y_val, pred, proba))

    # --- Modelo principal: Random Forest (no lineal, maneja bien features correlacionadas) ---
    rf = RandomForestClassifier(
        n_estimators=300, max_depth=8, min_samples_leaf=5,
        class_weight="balanced", random_state=42, n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    proba_rf = rf.predict_proba(X_val)[:, 1]
    pred_rf = (proba_rf >= 0.5).astype(int)
    results.append(evaluate("Random Forest", y_val, pred_rf, proba_rf))

    importances = sorted(
        zip(X_train.columns, rf.feature_importances_), key=lambda x: -x[1]
    )

    # --- Reporte ---
    lines = []
    lines.append("# Resultados del modelo supervisado (checkpoint exploratorio)\n")
    lines.append(f"- Dataset: {len(df)} ejemplos, {df['label'].mean()*100:.2f}% positivos, "
                  f"{df['productId'].nunique()} productos distintos.")
    lines.append(f"- Rango temporal: {df['computedAt'].min()} a {df['computedAt'].max()}.")
    lines.append(f"- Split por fecha de corte (80/20, no aleatorio): corte en {cutoff}.")
    lines.append(f"- Train: {len(train_df)} ejemplos ({train_df['label'].mean()*100:.2f}% positivos).")
    lines.append(f"- Validacion: {len(val_df)} ejemplos ({val_df['label'].mean()*100:.2f}% positivos).\n")

    for r in results:
        lines.append(f"## {r['name']}")
        lines.append(f"- Precision: {r['precision']:.3f}")
        lines.append(f"- Recall: {r['recall']:.3f}")
        lines.append(f"- F1-score: {r['f1']:.3f}")
        lines.append(f"- AUC-ROC: {r['auc']:.3f}")
        lines.append(f"- Matriz de confusion [[TN,FP],[FN,TP]]: {r['confusion_matrix']}")
        lines.append("```")
        lines.append(r["report"])
        lines.append("```\n")

    lines.append("## Importancia de features (Random Forest)")
    for feat, imp in importances:
        lines.append(f"- {feat}: {imp:.4f}")

    RESULTS_PATH.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nResultados guardados en {RESULTS_PATH}")

    for r in results:
        print(f"\n{r['name']}: P={r['precision']:.3f} R={r['recall']:.3f} F1={r['f1']:.3f} AUC={r['auc']:.3f}")


if __name__ == "__main__":
    main()
