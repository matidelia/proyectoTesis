# -*- coding: utf-8 -*-
"""
Corre el modelo de ML supervisado (ml/model.joblib, entrenado por
train_model.py) sobre el estado actual de cada producto activo.

La salida es un indice de prioridad entre 0 y 1 (se muestra como 0-100), NO
una probabilidad calibrada: ver ml/model_card.json, seccion "calibration".

No lee la base directamente: toma ml/latest_features.json (generado por
scripts/export_latest_features.js) y escribe ml/predictions.json, que
scripts/import_ml_predictions.js despues guarda en la tabla MLPrediction
junto con la version del modelo.

Uso:
  node scripts/export_latest_features.js > ml/latest_features.json
  python ml/predict.py
  node scripts/import_ml_predictions.js
"""
import json
from pathlib import Path

import joblib
import pandas as pd

ROOT = Path(__file__).resolve().parent
FEATURES_PATH = ROOT / "latest_features.json"
MODEL_PATH = ROOT / "model.joblib"
OUTPUT_PATH = ROOT / "predictions.json"


def main():
    if not MODEL_PATH.exists():
        raise SystemExit("No existe ml/model.joblib todavia. Corré primero: python ml/train_model.py")

    bundle = joblib.load(MODEL_PATH)
    model = bundle["model"]
    feature_cols = bundle["feature_cols"]
    model_version = bundle["model_version"]

    with open(FEATURES_PATH, encoding="utf-8") as f:
        df = pd.DataFrame(json.load(f))

    df = df.dropna(subset=feature_cols) if not df.empty else df
    if df.empty:
        print("Sin productos con features completas para predecir.")
        OUTPUT_PATH.write_text("[]", encoding="utf-8")
        return

    scores = model.predict_proba(df[feature_cols].to_numpy())[:, 1]
    predictions = [
        {"productId": pid, "probability": round(float(s), 4), "modelVersion": model_version}
        for pid, s in zip(df["productId"], scores)
    ]

    OUTPUT_PATH.write_text(json.dumps(predictions), encoding="utf-8")
    print(f"{len(predictions)} predicciones escritas en {OUTPUT_PATH} (modelo {model_version})")


if __name__ == "__main__":
    main()
