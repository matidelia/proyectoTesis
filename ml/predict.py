# -*- coding: utf-8 -*-
"""
Corre el modelo de ML supervisado (ml/model.joblib, entrenado por
train_model.py) sobre el estado actual de cada producto, para mostrar la
probabilidad de crecimiento sostenido en el dashboard (RF02 + Seccion 1.5.4).

No lee la base directamente: toma ml/latest_features.json (generado por
scripts/export_latest_features.js) y escribe ml/predictions.json, que
scripts/import_ml_predictions.js despues guarda en la tabla MLPrediction.

Uso:
  node scripts/export_latest_features.js > ml/latest_features.json
  python ml/predict.py
  node scripts/import_ml_predictions.js
"""
import json
from pathlib import Path

import pandas as pd
import joblib

ROOT = Path(__file__).resolve().parent
FEATURES_PATH = ROOT / "latest_features.json"
MODEL_PATH = ROOT / "model.joblib"
OUTPUT_PATH = ROOT / "predictions.json"


def build_features(df, feature_cols, categoria_cols):
    X = df[feature_cols].copy()
    dummies = pd.get_dummies(df["categoria"], prefix="cat")
    for c in categoria_cols:
        if c not in dummies.columns:
            dummies[c] = 0
    dummies = dummies[categoria_cols]
    X = pd.concat([X.reset_index(drop=True), dummies.reset_index(drop=True)], axis=1)
    return X


def main():
    if not MODEL_PATH.exists():
        raise SystemExit(
            "No existe ml/model.joblib todavia. Corré primero: python ml/train_model.py"
        )

    bundle = joblib.load(MODEL_PATH)
    model = bundle["model"]
    feature_cols = bundle["feature_cols"]
    categoria_cols = bundle["categoria_cols"]
    model_version = bundle["model_version"]

    with open(FEATURES_PATH, encoding="utf-8") as f:
        rows = json.load(f)

    df = pd.DataFrame(rows)
    df = df.dropna(subset=feature_cols)

    if df.empty:
        print("Sin productos con features completas para predecir.")
        OUTPUT_PATH.write_text("[]", encoding="utf-8")
        return

    X = build_features(df, feature_cols, categoria_cols)
    probabilities = model.predict_proba(X)[:, 1]

    predictions = [
        {
            "productId": row.productId,
            "probability": round(float(p), 4),
            "modelVersion": model_version,
        }
        for row, p in zip(df.itertuples(), probabilities)
    ]

    OUTPUT_PATH.write_text(json.dumps(predictions), encoding="utf-8")
    print(f"{len(predictions)} predicciones escritas en {OUTPUT_PATH} (modelo {model_version})")


if __name__ == "__main__":
    main()
