# Modelo `rf_2026-10-09_22ca0dd3`

- Dataset sha256 `22ca0dd38d54fbaa`: 13655 filas exportadas, 8923 usadas (129 descartadas por hueco > 24 h, 82 por cruzar un cambio de formula, 4521 de productos sin aparecer en 48 h), 262 productos, 2026-07-18 a 2026-10-09, 8.92% positivos.
- Corte 2026-09-19T15:00; validacion desde 2026-09-26T15:00 (embargo 7 dias).
- Train: 7113 filas, 2026-07-18 a 2026-09-19, ultima etiqueta 2026-09-19T15:00, 9.80% positivos.
- Validacion: 1238 filas, 71 productos, 2026-09-26 a 2026-10-09, 5.74% positivos. Purgadas/embargadas: 572.

## Modelos (validacion)
- Random Forest: ROC-AUC 0.804, PR-AUC 0.321 (prevalencia 0.057), umbral 0.5 -> P 0.116 R 0.535 FPR 0.249 [TN 877 FP 290 FN 33 TP 38], Brier 0.2
- Regresion Logistica: ROC-AUC 0.805, PR-AUC 0.296 (prevalencia 0.057), umbral 0.5 -> P 0.107 R 0.676 FPR 0.342 [TN 768 FP 399 FN 23 TP 48], Brier 0.215
- RF al umbral para recall >= 0.7: thr 0.4119 P 0.123 R 0.704 FPR 0.304 [TN 812 FP 355 FN 21 TP 50]

## Baselines
- Regla: frecuencia en aumento (delta_frecuencia > 0): ROC-AUC 0.489, PR-AUC 0.056 | regla: P 0.055 R 0.592 FPR 0.614
- Regla: persistencia (ya subio >= 5 en la corrida anterior): ROC-AUC 0.514, PR-AUC 0.059 | regla: P 0.078 R 0.099 FPR 0.071
- Score descriptivo (mas alto = mas chance): ROC-AUC 0.23, PR-AUC 0.035
- Score descriptivo invertido (mas bajo = mas chance): ROC-AUC 0.77, PR-AUC 0.281

## Tabla por umbral (RF)
- 0.1: P 0.077 R 1.0 FPR 0.732 alertas 0.747
- 0.2: P 0.09 R 0.958 FPR 0.587 alertas 0.608
- 0.3: P 0.115 R 0.93 FPR 0.434 alertas 0.462
- 0.4: P 0.127 R 0.732 FPR 0.308 alertas 0.332
- 0.5: P 0.116 R 0.535 FPR 0.249 alertas 0.265
- 0.6: P 0.12 R 0.521 FPR 0.233 alertas 0.25
- 0.7: P 0.122 R 0.507 FPR 0.222 alertas 0.238
- 0.8: P 0.17 R 0.451 FPR 0.134 alertas 0.152
- 0.9: P 0.564 R 0.31 FPR 0.015 alertas 0.032

## Controles de fuga
- temporal_purga_embargo: ROC-AUC 0.804, PR-AUC 0.321
- temporal_purga_sin_embargo: ROC-AUC 0.857, PR-AUC 0.375
- aleatorio_con_fuga: ROC-AUC 0.928, PR-AUC 0.645
- etiquetas_permutadas_10_corridas: ROC-AUC 0.499, PR-AUC 0.086

## Origen movil
- corte 2026-09-02 (2707 filas): ROC-AUC 0.869 PR-AUC 0.401 prev 0.062 R@0.5 0.702 P@0.5 0.23
- corte 2026-09-10 (1965 filas): ROC-AUC 0.867 PR-AUC 0.406 prev 0.06 R@0.5 0.675 P@0.5 0.189
- corte 2026-09-19 (1238 filas): ROC-AUC 0.804 PR-AUC 0.321 prev 0.057 R@0.5 0.535 P@0.5 0.116

## Productos no vistos
- rep 1 (12 prod, 240 filas): ROC-AUC 0.788 PR-AUC 0.329 prev 0.046 R@0.5 0.545
- rep 2 (13 prod, 224 filas): ROC-AUC 0.734 PR-AUC 0.238 prev 0.054 R@0.5 0.417
- rep 3 (13 prod, 204 filas): ROC-AUC 0.85 PR-AUC 0.548 prev 0.064 R@0.5 0.692
- rep 4 (7 prod, 121 filas): ROC-AUC 0.8 PR-AUC 0.32 prev 0.05 R@0.5 0.5
- rep 5 (14 prod, 223 filas): ROC-AUC 0.852 PR-AUC 0.576 prev 0.054 R@0.5 0.667

## Por categoria (validacion, umbral 0.5)
- Alimentos y Bebidas: 140 filas, 9 prod, 8 pos, ROC-AUC 0.616 PR-AUC 0.093 prev 0.057 R 0.25 P 0.059 FPR 0.242
- Celulares: 243 filas, 16 prod, 22 pos, ROC-AUC 0.846 PR-AUC 0.524 prev 0.091 R 0.682 P 0.195 FPR 0.281
- Computación: 357 filas, 17 prod, 9 pos, ROC-AUC 0.776 PR-AUC 0.175 prev 0.025 R 0.333 P 0.051 FPR 0.161
- Electrónica: 75 filas, 6 prod, 7 pos, ROC-AUC 0.813 PR-AUC 0.647 prev 0.093 R 0.571 P 0.182 FPR 0.265
- Limpieza del Hogar: 381 filas, 20 prod, 25 pos, ROC-AUC 0.815 PR-AUC 0.339 prev 0.066 R 0.56 P 0.109 FPR 0.323
- Ropa y Accesorios: 42 filas, 3 prod, 0 pos, ROC-AUC None PR-AUC None prev 0.0 R 0.0 P 0.0 FPR 0.167

## Variable objetivo
- Cuantiles del cambio de score: {"0.05": -3.0, "0.25": 0.0, "0.5": 0.6, "0.75": 1.8, "0.9": 4.8, "0.95": 5.6, "0.99": 14.3}; +5 = percentil 91.1
- umbral +3: prevalencia 0.202, ROC-AUC 0.782, PR-AUC 0.434
- umbral +5: prevalencia 0.089, ROC-AUC 0.804, PR-AUC 0.321
- umbral +7: prevalencia 0.036, ROC-AUC 0.987, PR-AUC 0.592
- umbral +10: prevalencia 0.034, ROC-AUC 0.987, PR-AUC 0.581
- Sostenimiento: {'saltos': 792, 'sostenidos_1_dia': 759, 'proporcion': 0.9583333333333334}
- Llenado de ventana: {"filas_primeros_7_dias": 4566, "prevalencia_primeros_7_dias": 0.12768287341217696, "prevalencia_despues": 0.04888684874913932, "positivos_en_primeros_7_dias": 0.7324120603015075, "por_umbral": [{"umbral": 3, "share_primeros_7_dias": 0.6868070953436807}, {"umbral": 5, "share_primeros_7_dias": 0.7324120603015075}, {"umbral": 7, "share_primeros_7_dias": 0.7244582043343654}, {"umbral": 10, "share_primeros_7_dias": 0.7311475409836066}], "validacion_sin_productos_nuevos": {"val_rows": 610, "roc_auc": 0.7690007361059994, "pr_auc": 0.1470158043815939, "prevalence": 0.06229508196721312}}
- Prevalencia semanal: [('2026-07-19', 0.0), ('2026-07-26', 0.148), ('2026-08-02', 0.144), ('2026-08-09', 0.154), ('2026-08-16', 0.038), ('2026-08-23', 0.063), ('2026-08-30', 0.031), ('2026-09-06', 0.121), ('2026-09-13', 0.096), ('2026-09-20', 0.083), ('2026-09-27', 0.045), ('2026-10-04', 0.036), ('2026-10-11', 0.112)]

## Calibracion
- Sin calibrar: Brier 0.2, ECE 0.296, salida media 0.353 vs prevalencia 0.057
- Isotonica: Brier 0.088, ECE 0.126, salida media 0.161, PR-AUC 0.293
- Brier de referencia (predecir siempre la prevalencia de train): 0.056

## Importancia por permutacion (caida de PR-AUC)
- estabilidad: 0.2289 ± 0.0212
- permanencia: 0.219 ± 0.0258
- frecuencia: 0.2087 ± 0.0213
- delta_frecuencia: 0.0979 ± 0.0249
- delta_permanencia: 0.037 ± 0.0256
- delta_estabilidad: 0.0055 ± 0.0153
- ranking: 0.0039 ± 0.0235
- delta_ranking: 0.0019 ± 0.0141
