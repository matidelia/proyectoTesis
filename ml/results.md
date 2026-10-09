# Modelo `rf_2026-10-09_a39b3ef3`

- Dataset sha256 `a39b3ef37d20d521`: 13655 filas exportadas, 13526 usadas (129 descartadas por hueco > 24 h), 263 productos, 2026-07-18 a 2026-10-09, 6.36% positivos.
- Corte 2026-09-19T15:00; validacion desde 2026-09-26T15:00 (embargo 7 dias).
- Train: 10772 filas, 2026-07-18 a 2026-09-19, ultima etiqueta 2026-09-19T15:00, 6.82% positivos.
- Validacion: 1736 filas, 83 productos, 2026-09-26 a 2026-10-09, 4.38% positivos. Purgadas/embargadas: 1018.

## Modelos (validacion)
- Random Forest: ROC-AUC 0.798, PR-AUC 0.199 (prevalencia 0.044), umbral 0.5 -> P 0.108 R 0.526 FPR 0.2 [TN 1328 FP 332 FN 36 TP 40], Brier 0.179
- Regresion Logistica: ROC-AUC 0.77, PR-AUC 0.185 (prevalencia 0.044), umbral 0.5 -> P 0.074 R 0.658 FPR 0.376 [TN 1036 FP 624 FN 26 TP 50], Brier 0.236
- RF al umbral para recall >= 0.7: thr 0.3884 P 0.115 R 0.711 FPR 0.251 [TN 1244 FP 416 FN 22 TP 54]

## Baselines
- Regla: frecuencia en aumento (delta_frecuencia > 0): ROC-AUC 0.556, PR-AUC 0.05 | regla: P 0.054 R 0.579 FPR 0.466
- Regla: persistencia (ya subio >= 5 en la corrida anterior): ROC-AUC 0.521, PR-AUC 0.047 | regla: P 0.078 R 0.092 FPR 0.05
- Score descriptivo (mas alto = mas chance): ROC-AUC 0.284, PR-AUC 0.029
- Score descriptivo invertido (mas bajo = mas chance): ROC-AUC 0.716, PR-AUC 0.149

## Tabla por umbral (RF)
- 0.1: P 0.053 R 1.0 FPR 0.819 alertas 0.827
- 0.2: P 0.073 R 0.947 FPR 0.549 alertas 0.566
- 0.3: P 0.1 R 0.882 FPR 0.364 alertas 0.387
- 0.4: P 0.103 R 0.618 FPR 0.247 alertas 0.263
- 0.5: P 0.108 R 0.526 FPR 0.2 alertas 0.214
- 0.6: P 0.107 R 0.5 FPR 0.192 alertas 0.205
- 0.7: P 0.101 R 0.461 FPR 0.187 alertas 0.199
- 0.8: P 0.099 R 0.355 FPR 0.149 alertas 0.158
- 0.9: P 0.44 R 0.145 FPR 0.008 alertas 0.014

## Controles de fuga
- temporal_purga_embargo: ROC-AUC 0.798, PR-AUC 0.199
- temporal_purga_sin_embargo: ROC-AUC 0.839, PR-AUC 0.213
- aleatorio_con_fuga: ROC-AUC 0.929, PR-AUC 0.498
- etiquetas_permutadas_10_corridas: ROC-AUC 0.505, PR-AUC 0.067

## Origen movil
- corte 2026-09-04 (4074 filas): ROC-AUC 0.843 PR-AUC 0.271 prev 0.043 R@0.5 0.574 P@0.5 0.181
- corte 2026-09-11 (2848 filas): ROC-AUC 0.845 PR-AUC 0.252 prev 0.045 R@0.5 0.543 P@0.5 0.156
- corte 2026-09-19 (1736 filas): ROC-AUC 0.798 PR-AUC 0.199 prev 0.044 R@0.5 0.526 P@0.5 0.108

## Productos no vistos
- rep 1 (16 prod, 327 filas): ROC-AUC 0.831 PR-AUC 0.147 prev 0.028 R@0.5 0.556
- rep 2 (15 prod, 333 filas): ROC-AUC 0.731 PR-AUC 0.17 prev 0.042 R@0.5 0.429
- rep 3 (17 prod, 328 filas): ROC-AUC 0.899 PR-AUC 0.491 prev 0.046 R@0.5 0.667
- rep 4 (13 prod, 274 filas): ROC-AUC 0.868 PR-AUC 0.3 prev 0.033 R@0.5 0.444
- rep 5 (15 prod, 272 filas): ROC-AUC 0.905 PR-AUC 0.52 prev 0.04 R@0.5 0.727

## Por categoria (validacion, umbral 0.5)
- Alimentos y Bebidas: 221 filas, 12 prod, 8 pos, ROC-AUC 0.654 PR-AUC 0.061 prev 0.036 R 0.375 P 0.073 FPR 0.178
- Celulares: 279 filas, 17 prod, 22 pos, ROC-AUC 0.835 PR-AUC 0.432 prev 0.079 R 0.682 P 0.197 FPR 0.237
- Computación: 558 filas, 19 prod, 13 pos, ROC-AUC 0.787 PR-AUC 0.07 prev 0.023 R 0.308 P 0.049 FPR 0.141
- Electrónica: 124 filas, 6 prod, 7 pos, ROC-AUC 0.838 PR-AUC 0.522 prev 0.056 R 0.571 P 0.16 FPR 0.179
- Limpieza del Hogar: 463 filas, 25 prod, 26 pos, ROC-AUC 0.773 PR-AUC 0.204 prev 0.056 R 0.538 P 0.101 FPR 0.286
- Ropa y Accesorios: 91 filas, 4 prod, 0 pos, ROC-AUC None PR-AUC None prev 0.0 R 0.0 P 0.0 FPR 0.11

## Variable objetivo
- Cuantiles del cambio de score: {"0.05": -5.2, "0.25": -0.9, "0.5": 0.0, "0.75": 1.2, "0.9": 4.25, "0.95": 5.2, "0.99": 13.48}; +5 = percentil 93.6
- umbral +3: prevalencia 0.14, ROC-AUC 0.775, PR-AUC 0.361
- umbral +5: prevalencia 0.064, ROC-AUC 0.798, PR-AUC 0.199
- umbral +7: prevalencia 0.028, ROC-AUC 0.969, PR-AUC 0.451
- umbral +10: prevalencia 0.026, ROC-AUC 0.976, PR-AUC 0.463
- Sostenimiento: {'saltos': 835, 'sostenidos_1_dia': 791, 'proporcion': 0.9473053892215569}
- Llenado de ventana: {"filas_primeros_7_dias": 5602, "prevalencia_primeros_7_dias": 0.10799714387718672, "prevalencia_despues": 0.032180716809692075, "positivos_en_primeros_7_dias": 0.7034883720930233, "por_umbral": [{"umbral": 3, "share_primeros_7_dias": 0.6717597471022129}, {"umbral": 5, "share_primeros_7_dias": 0.7034883720930233}, {"umbral": 7, "share_primeros_7_dias": 0.6728723404255319}, {"umbral": 10, "share_primeros_7_dias": 0.6666666666666666}], "validacion_sin_productos_nuevos": {"val_rows": 1010, "roc_auc": 0.7952880767197765, "pr_auc": 0.09810655299987008, "prevalence": 0.040594059405940595}}
- Prevalencia semanal: [('2026-07-19', 0.0), ('2026-07-26', 0.118), ('2026-08-02', 0.09), ('2026-08-09', 0.129), ('2026-08-16', 0.023), ('2026-08-23', 0.042), ('2026-08-30', 0.021), ('2026-09-06', 0.08), ('2026-09-13', 0.062), ('2026-09-20', 0.05), ('2026-09-27', 0.052), ('2026-10-04', 0.025), ('2026-10-11', 0.092)]

## Calibracion
- Sin calibrar: Brier 0.179, ECE 0.288, salida media 0.331 vs prevalencia 0.044
- Isotonica: Brier 0.061, ECE 0.081, salida media 0.104, PR-AUC 0.16
- Brier de referencia (predecir siempre la prevalencia de train): 0.042

## Importancia por permutacion (caida de PR-AUC)
- estabilidad: 0.1301 ± 0.0089
- permanencia: 0.1122 ± 0.0087
- frecuencia: 0.1121 ± 0.0075
- delta_frecuencia: 0.0814 ± 0.0111
- delta_permanencia: 0.0286 ± 0.0128
- ranking: 0.0213 ± 0.0128
- delta_ranking: 0.0103 ± 0.0083
- delta_estabilidad: 0.0023 ± 0.0068
