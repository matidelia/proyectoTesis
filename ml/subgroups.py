"""
Analisis por subgrupos pedido en la revision del 75 % (P3): desempeno del
modelo en validacion segun la cantidad de registros historicos del producto y
segun la cantidad de vendedores.

Usa el mismo dataset, filtros, separacion temporal e hiperparametros que
train_model.py. Antes de cualquier metrica informa filas y positivos por
grupo; las metricas se calculan solo si el grupo tiene al menos MIN_POS
positivos (el mismo minimo que se fija por categoria en la Seccion 8.10).

Uso: python ml/subgroups.py  ->  ml/subgroups.json
"""
import gzip
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, roc_auc_score

import train_model as tm

MIN_POS = 30
HIST_CORTE = 21  # registros previos: 21 corridas ~ 7 dias (3 por dia)


def grupo(df, mask, nombre, proba):
    sub = df[mask]
    pos = int(sub["label"].sum())
    out = {"grupo": nombre, "filas": int(len(sub)), "productos": int(sub["productId"].nunique()),
           "positivos": pos, "prevalencia": tm.r(sub["label"].mean()) if len(sub) else None}
    if pos >= MIN_POS and pos < len(sub):
        p = proba[mask.to_numpy()]
        out["roc_auc"] = tm.r(roc_auc_score(sub["label"], p))
        out["pr_auc"] = tm.r(average_precision_score(sub["label"], p))
    else:
        out["roc_auc"] = out["pr_auc"] = None
        out["nota"] = f"menos de {MIN_POS} positivos: sin metricas"
    return out


def main():
    df, _ = tm.load_dataset()
    # Registros historicos: scores previos del mismo producto en el export
    # completo (antes de filtros), contados hasta el instante t.
    raw = pd.DataFrame(json.loads(gzip.decompress(tm.DATASET_PATH.read_bytes())))
    raw["computedAt"] = pd.to_datetime(raw["computedAt"])
    raw = raw.sort_values("computedAt")
    raw["registros_previos"] = raw.groupby("productId").cumcount()
    df = df.merge(raw[["productId", "computedAt", "registros_previos"]], on=["productId", "computedAt"], how="left")

    train, val, _, _ = tm.temporal_split(df, tm.TRAIN_FRAC)
    model = tm.fit_rf(train)
    proba = model.predict_proba(tm.X(val))[:, 1]
    val = val.reset_index(drop=True)

    vend = df["vendedores_promedio"].notna()
    res = {
        "min_positivos": MIN_POS,
        "historial": [
            grupo(val, val["registros_previos"] < HIST_CORTE, f"corto (< {HIST_CORTE} registros previos)", proba),
            grupo(val, val["registros_previos"] >= HIST_CORTE, f"largo (>= {HIST_CORTE} registros previos)", proba),
        ],
        "vendedores": {
            "filas_con_dato_dataset": int(vend.sum()),
            "pct_filas_con_dato_dataset": tm.r(vend.mean() * 100, 1),
            "filas_con_dato_validacion": int(val["vendedores_promedio"].notna().sum()),
            "filas_con_dato_entrenamiento": int(train["vendedores_promedio"].notna().sum()),
            "grupos_validacion": [
                grupo(val, val["vendedores_promedio"].notna() & (val["vendedores_promedio"] <= 1), "un vendedor", proba),
                grupo(val, val["vendedores_promedio"] > 1, "multiples vendedores", proba),
            ],
        },
    }
    out = Path(__file__).resolve().parent / "subgroups.json"
    out.write_text(json.dumps(res, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(res, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    np.random.seed(tm.SEED)
    main()
