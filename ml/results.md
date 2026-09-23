# Resultados del modelo supervisado (checkpoint exploratorio)

- Dataset: 11312 ejemplos, 6.88% positivos, 227 productos distintos.
- Rango temporal: 2026-07-14 22:58:54.760000+00:00 a 2026-09-22 22:04:30.410000+00:00.
- Split por fecha de corte (80/20, no aleatorio): corte en 2026-09-08 22:33:25.278000+00:00.
- Train: 9049 ejemplos (7.34% positivos).
- Validacion: 2263 ejemplos (5.04% positivos).

- Modelo de produccion guardado en `ml/model.joblib` (version `random_forest_checkpoint_2026-09-22`), reentrenado con el dataset completo (train+validacion) despues de reportar las metricas de abajo sobre el split de validacion. Se usa desde `ml/predict.py`.

## Regresion Logistica (baseline)
- Precision: 0.122
- Recall: 0.746
- F1-score: 0.209
- AUC-ROC: 0.804
- Matriz de confusion [[TN,FP],[FN,TP]]: [[1535, 614], [29, 85]]
```
              precision    recall  f1-score   support

No crece (0)       0.98      0.71      0.83      2149
   Crece (1)       0.12      0.75      0.21       114

    accuracy                           0.72      2263
   macro avg       0.55      0.73      0.52      2263
weighted avg       0.94      0.72      0.80      2263

```

## Random Forest
- Precision: 0.298
- Recall: 0.807
- F1-score: 0.435
- AUC-ROC: 0.903
- Matriz de confusion [[TN,FP],[FN,TP]]: [[1932, 217], [22, 92]]
```
              precision    recall  f1-score   support

No crece (0)       0.99      0.90      0.94      2149
   Crece (1)       0.30      0.81      0.43       114

    accuracy                           0.89      2263
   macro avg       0.64      0.85      0.69      2263
weighted avg       0.95      0.89      0.92      2263

```

## Importancia de features (Random Forest)
- delta_frecuencia: 0.3066
- permanencia: 0.1657
- frecuencia: 0.1331
- variacion_precio_pct: 0.1184
- estabilidad: 0.1164
- delta_permanencia: 0.0899
- ranking: 0.0193
- delta_ranking: 0.0170
- delta_estabilidad: 0.0122
- cat_Alimentos y Bebidas: 0.0054
- cat_Celulares: 0.0048
- cat_Electrónica: 0.0047
- cat_Limpieza del Hogar: 0.0033
- cat_Computación: 0.0018
- cat_Ropa y Accesorios: 0.0014