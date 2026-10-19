# Modelo `rf_2026-10-09_679888a0`

- Dataset sha256 `679888a085694969`: 13654 filas exportadas, 8922 usadas (129 descartadas por hueco > 24 h, 82 por cruzar un cambio de formula, 4521 de productos sin aparecer en 48 h), 262 productos, 2026-07-18 a 2026-10-09, 8.91% positivos.
- Corte 2026-09-19T15:00; validacion desde 2026-09-26T15:00 (embargo 7 dias).
- Train: 7112 filas, 2026-07-18 a 2026-09-19, ultima etiqueta 2026-09-19T15:00, 9.80% positivos.
- Validacion: 1238 filas, 71 productos, 2026-09-26 a 2026-10-09, 5.74% positivos. Purgadas/embargadas: 572.

## Modelos (validacion)
- Random Forest: ROC-AUC 0.803, PR-AUC 0.321 (prevalencia 0.057), umbral 0.5 -> P 0.118 R 0.535 FPR 0.243 [TN 884 FP 283 FN 33 TP 38], Brier 0.2
- Regresion Logistica: ROC-AUC 0.805, PR-AUC 0.296 (prevalencia 0.057), umbral 0.5 -> P 0.107 R 0.676 FPR 0.342 [TN 768 FP 399 FN 23 TP 48], Brier 0.215
- RF al umbral para recall >= 0.7: thr 0.4163 P 0.125 R 0.704 FPR 0.3 [TN 817 FP 350 FN 21 TP 50]

## Baselines
- Regla: frecuencia en aumento (delta_frecuencia > 0): ROC-AUC 0.489, PR-AUC 0.056 | regla: P 0.055 R 0.592 FPR 0.614
- Regla: persistencia (ya subio >= 5 en la corrida anterior): ROC-AUC 0.514, PR-AUC 0.059 | regla: P 0.078 R 0.099 FPR 0.071
- Score descriptivo (mas alto = mas chance): ROC-AUC 0.23, PR-AUC 0.035
- Score descriptivo invertido (mas bajo = mas chance): ROC-AUC 0.77, PR-AUC 0.281

## Tabla por umbral (RF)
- 0.1: P 0.077 R 1.0 FPR 0.73 alertas 0.746
- 0.2: P 0.089 R 0.958 FPR 0.596 alertas 0.616
- 0.3: P 0.116 R 0.93 FPR 0.432 alertas 0.46
- 0.4: P 0.128 R 0.746 FPR 0.309 alertas 0.334
- 0.5: P 0.118 R 0.535 FPR 0.243 alertas 0.259
- 0.6: P 0.119 R 0.521 FPR 0.234 alertas 0.25
- 0.7: P 0.122 R 0.507 FPR 0.222 alertas 0.238
- 0.8: P 0.161 R 0.451 FPR 0.143 alertas 0.161
- 0.9: P 0.611 R 0.31 FPR 0.012 alertas 0.029

## Controles de fuga
- temporal_purga_embargo: ROC-AUC 0.803, PR-AUC 0.321
- temporal_purga_sin_embargo: ROC-AUC 0.863, PR-AUC 0.378
- aleatorio_con_fuga: ROC-AUC 0.933, PR-AUC 0.663
- etiquetas_permutadas_10_corridas: ROC-AUC 0.529, PR-AUC 0.091

## Origen movil
- corte 2026-09-02 (2706 filas): ROC-AUC 0.868 PR-AUC 0.4 prev 0.062 R@0.5 0.713 P@0.5 0.231
- corte 2026-09-10 (1964 filas): ROC-AUC 0.874 PR-AUC 0.408 prev 0.059 R@0.5 0.69 P@0.5 0.185
- corte 2026-09-19 (1238 filas): ROC-AUC 0.803 PR-AUC 0.321 prev 0.057 R@0.5 0.535 P@0.5 0.118

## Productos no vistos
- rep 1 (12 prod, 240 filas): ROC-AUC 0.794 PR-AUC 0.329 prev 0.046 R@0.5 0.545
- rep 2 (13 prod, 224 filas): ROC-AUC 0.735 PR-AUC 0.218 prev 0.054 R@0.5 0.417
- rep 3 (13 prod, 204 filas): ROC-AUC 0.841 PR-AUC 0.537 prev 0.064 R@0.5 0.692
- rep 4 (7 prod, 121 filas): ROC-AUC 0.797 PR-AUC 0.319 prev 0.05 R@0.5 0.5
- rep 5 (14 prod, 223 filas): ROC-AUC 0.852 PR-AUC 0.576 prev 0.054 R@0.5 0.667

## Por categoria (validacion, umbral 0.5)
- Alimentos y Bebidas: 140 filas, 9 prod, 8 pos, ROC-AUC 0.621 PR-AUC 0.093 prev 0.057 R 0.25 P 0.059 FPR 0.242
- Celulares: 243 filas, 16 prod, 22 pos, ROC-AUC 0.845 PR-AUC 0.524 prev 0.091 R 0.682 P 0.2 FPR 0.271
- Computación: 357 filas, 17 prod, 9 pos, ROC-AUC 0.778 PR-AUC 0.178 prev 0.025 R 0.333 P 0.055 FPR 0.149
- Electrónica: 75 filas, 6 prod, 7 pos, ROC-AUC 0.809 PR-AUC 0.646 prev 0.093 R 0.571 P 0.182 FPR 0.265
- Limpieza del Hogar: 381 filas, 20 prod, 25 pos, ROC-AUC 0.816 PR-AUC 0.343 prev 0.066 R 0.56 P 0.109 FPR 0.323
- Ropa y Accesorios: 42 filas, 3 prod, 0 pos, ROC-AUC None PR-AUC None prev 0.0 R 0.0 P 0.0 FPR 0.143

## Variable objetivo
- Cuantiles del cambio de score: {"0.05": -3.0, "0.25": 0.0, "0.5": 0.6, "0.75": 1.8, "0.9": 4.8, "0.95": 5.6, "0.99": 14.3}; +5 = percentil 91.1
- umbral +3: prevalencia 0.202, ROC-AUC 0.778, PR-AUC 0.431
- umbral +5: prevalencia 0.089, ROC-AUC 0.803, PR-AUC 0.321
- umbral +7: prevalencia 0.036, ROC-AUC 0.987, PR-AUC 0.593
- umbral +10: prevalencia 0.034, ROC-AUC 0.987, PR-AUC 0.576
- Sostenimiento: {'saltos': 791, 'sostenidos_1_dia': 759, 'proporcion': 0.9595448798988622}
- Llenado de ventana: {"filas_primeros_7_dias": 4566, "prevalencia_primeros_7_dias": 0.12768287341217696, "prevalencia_despues": 0.048668503213957756, "positivos_en_primeros_7_dias": 0.7333333333333333, "por_umbral": [{"umbral": 3, "share_primeros_7_dias": 0.6871880199667221}, {"umbral": 5, "share_primeros_7_dias": 0.7333333333333333}, {"umbral": 7, "share_primeros_7_dias": 0.7267080745341615}, {"umbral": 10, "share_primeros_7_dias": 0.7335526315789473}], "validacion_sin_productos_nuevos": {"val_rows": 610, "roc_auc": 0.7690007361059994, "pr_auc": 0.1470158043815939, "prevalence": 0.06229508196721312}}
- Prevalencia semanal: [('2026-07-19', 0.0), ('2026-07-26', 0.148), ('2026-08-02', 0.144), ('2026-08-09', 0.154), ('2026-08-16', 0.038), ('2026-08-23', 0.063), ('2026-08-30', 0.031), ('2026-09-06', 0.121), ('2026-09-13', 0.096), ('2026-09-20', 0.083), ('2026-09-27', 0.043), ('2026-10-04', 0.036), ('2026-10-11', 0.112)]

## Calibracion
- Sin calibrar: Brier 0.2, ECE 0.297, salida media 0.354 vs prevalencia 0.057
- Isotonica: Brier 0.088, ECE 0.126, salida media 0.161, PR-AUC 0.293
- Brier de referencia (predecir siempre la prevalencia de train): 0.056

## Importancia por permutacion (caida de PR-AUC)
- estabilidad: 0.2275 ± 0.0215
- permanencia: 0.2198 ± 0.0256
- frecuencia: 0.21 ± 0.0214
- delta_frecuencia: 0.091 ± 0.0266
- delta_permanencia: 0.0359 ± 0.0261
- delta_ranking: 0.0049 ± 0.016
- delta_estabilidad: 0.0047 ± 0.0148
- ranking: 0.0037 ± 0.0232
