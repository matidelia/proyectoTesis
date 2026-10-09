# Modelo `rf_2026-10-09_b73a1efc`

- Dataset sha256 `b73a1efc76ae39a2`: 13655 filas exportadas, 13444 usadas (129 descartadas por hueco > 24 h, 82 por cruzar un cambio de formula), 263 productos, 2026-07-18 a 2026-10-09, 6.26% positivos.
- Corte 2026-09-19T08:22; validacion desde 2026-09-26T08:22 (embargo 7 dias).
- Train: 10708 filas, 2026-07-18 a 2026-09-18, ultima etiqueta 2026-09-19T08:22, 6.85% positivos.
- Validacion: 1784 filas, 83 productos, 2026-09-26 a 2026-10-09, 4.26% positivos. Purgadas/embargadas: 952.

## Modelos (validacion)
- Random Forest: ROC-AUC 0.802, PR-AUC 0.203 (prevalencia 0.043), umbral 0.5 -> P 0.105 R 0.513 FPR 0.195 [TN 1375 FP 333 FN 37 TP 39], Brier 0.176
- Regresion Logistica: ROC-AUC 0.772, PR-AUC 0.184 (prevalencia 0.043), umbral 0.5 -> P 0.073 R 0.658 FPR 0.372 [TN 1072 FP 636 FN 26 TP 50], Brier 0.235
- RF al umbral para recall >= 0.7: thr 0.3737 P 0.111 R 0.711 FPR 0.254 [TN 1274 FP 434 FN 22 TP 54]

## Baselines
- Regla: frecuencia en aumento (delta_frecuencia > 0): ROC-AUC 0.553, PR-AUC 0.048 | regla: P 0.052 R 0.579 FPR 0.472
- Regla: persistencia (ya subio >= 5 en la corrida anterior): ROC-AUC 0.521, PR-AUC 0.046 | regla: P 0.076 R 0.092 FPR 0.05
- Score descriptivo (mas alto = mas chance): ROC-AUC 0.287, PR-AUC 0.028
- Score descriptivo invertido (mas bajo = mas chance): ROC-AUC 0.713, PR-AUC 0.147

## Tabla por umbral (RF)
- 0.1: P 0.05 R 1.0 FPR 0.838 alertas 0.845
- 0.2: P 0.07 R 0.961 FPR 0.567 alertas 0.584
- 0.3: P 0.098 R 0.882 FPR 0.361 alertas 0.383
- 0.4: P 0.099 R 0.592 FPR 0.241 alertas 0.256
- 0.5: P 0.105 R 0.513 FPR 0.195 alertas 0.209
- 0.6: P 0.106 R 0.5 FPR 0.187 alertas 0.2
- 0.7: P 0.102 R 0.461 FPR 0.181 alertas 0.193
- 0.8: P 0.099 R 0.355 FPR 0.144 alertas 0.153
- 0.9: P 0.391 R 0.118 FPR 0.008 alertas 0.013

## Controles de fuga
- temporal_purga_embargo: ROC-AUC 0.802, PR-AUC 0.203
- temporal_purga_sin_embargo: ROC-AUC 0.855, PR-AUC 0.222
- aleatorio_con_fuga: ROC-AUC 0.934, PR-AUC 0.497
- etiquetas_permutadas_10_corridas: ROC-AUC 0.517, PR-AUC 0.057

## Origen movil
- corte 2026-09-03 (4059 filas): ROC-AUC 0.861 PR-AUC 0.28 prev 0.039 R@0.5 0.633 P@0.5 0.179
- corte 2026-09-11 (2868 filas): ROC-AUC 0.874 PR-AUC 0.278 prev 0.038 R@0.5 0.618 P@0.5 0.139
- corte 2026-09-19 (1784 filas): ROC-AUC 0.802 PR-AUC 0.203 prev 0.043 R@0.5 0.513 P@0.5 0.105

## Productos no vistos
- rep 1 (16 prod, 340 filas): ROC-AUC 0.835 PR-AUC 0.141 prev 0.026 R@0.5 0.444
- rep 2 (15 prod, 342 filas): ROC-AUC 0.731 PR-AUC 0.128 prev 0.041 R@0.5 0.429
- rep 3 (17 prod, 337 filas): ROC-AUC 0.901 PR-AUC 0.487 prev 0.045 R@0.5 0.667
- rep 4 (13 prod, 283 filas): ROC-AUC 0.872 PR-AUC 0.289 prev 0.032 R@0.5 0.444
- rep 5 (15 prod, 279 filas): ROC-AUC 0.902 PR-AUC 0.512 prev 0.039 R@0.5 0.727

## Por categoria (validacion, umbral 0.5)
- Alimentos y Bebidas: 230 filas, 12 prod, 8 pos, ROC-AUC 0.686 PR-AUC 0.063 prev 0.035 R 0.375 P 0.077 FPR 0.162
- Celulares: 284 filas, 17 prod, 22 pos, ROC-AUC 0.833 PR-AUC 0.436 prev 0.077 R 0.636 P 0.187 FPR 0.233
- Computación: 576 filas, 19 prod, 13 pos, ROC-AUC 0.778 PR-AUC 0.062 prev 0.023 R 0.308 P 0.049 FPR 0.139
- Electrónica: 126 filas, 6 prod, 7 pos, ROC-AUC 0.849 PR-AUC 0.527 prev 0.056 R 0.571 P 0.148 FPR 0.193
- Limpieza del Hogar: 473 filas, 25 prod, 26 pos, ROC-AUC 0.777 PR-AUC 0.215 prev 0.055 R 0.538 P 0.101 FPR 0.28
- Ropa y Accesorios: 95 filas, 4 prod, 0 pos, ROC-AUC None PR-AUC None prev 0.0 R 0.0 P 0.0 FPR 0.105

## Variable objetivo
- Cuantiles del cambio de score: {"0.05": -5.2, "0.25": -0.9, "0.5": 0.0, "0.75": 1.2, "0.9": 4.2, "0.95": 5.2, "0.99": 13.6}; +5 = percentil 93.7
- umbral +3: prevalencia 0.14, ROC-AUC 0.78, PR-AUC 0.36
- umbral +5: prevalencia 0.063, ROC-AUC 0.802, PR-AUC 0.203
- umbral +7: prevalencia 0.027, ROC-AUC 0.967, PR-AUC 0.448
- umbral +10: prevalencia 0.025, ROC-AUC 0.976, PR-AUC 0.449
- Sostenimiento: {'saltos': 817, 'sostenidos_1_dia': 773, 'proporcion': 0.9461444308445532}
- Llenado de ventana: {"filas_primeros_7_dias": 5569, "prevalencia_primeros_7_dias": 0.10594361644819537, "prevalencia_despues": 0.032, "positivos_en_primeros_7_dias": 0.7007125890736342, "por_umbral": [{"umbral": 3, "share_primeros_7_dias": 0.6711087420042644}, {"umbral": 5, "share_primeros_7_dias": 0.7007125890736342}, {"umbral": 7, "share_primeros_7_dias": 0.6592797783933518}, {"umbral": 10, "share_primeros_7_dias": 0.6627565982404692}], "validacion_sin_productos_nuevos": {"val_rows": 1033, "roc_auc": 0.7959406963021243, "pr_auc": 0.1159365891858104, "prevalence": 0.03969022265246854}}
- Prevalencia semanal: [('2026-07-19', 0.0), ('2026-07-26', 0.118), ('2026-08-02', 0.09), ('2026-08-09', 0.129), ('2026-08-16', 0.023), ('2026-08-23', 0.042), ('2026-08-30', 0.021), ('2026-09-06', 0.08), ('2026-09-13', 0.062), ('2026-09-20', 0.05), ('2026-09-27', 0.038), ('2026-10-04', 0.025), ('2026-10-11', 0.092)]

## Calibracion
- Sin calibrar: Brier 0.176, ECE 0.287, salida media 0.329 vs prevalencia 0.043
- Isotonica: Brier 0.055, ECE 0.076, salida media 0.099, PR-AUC 0.199
- Brier de referencia (predecir siempre la prevalencia de train): 0.041

## Importancia por permutacion (caida de PR-AUC)
- estabilidad: 0.1403 ± 0.0109
- frecuencia: 0.1185 ± 0.0076
- permanencia: 0.117 ± 0.0142
- delta_frecuencia: 0.0846 ± 0.0161
- delta_permanencia: 0.0324 ± 0.0191
- ranking: 0.0164 ± 0.0201
- delta_ranking: 0.0049 ± 0.0055
- delta_estabilidad: 0.0009 ± 0.0043
