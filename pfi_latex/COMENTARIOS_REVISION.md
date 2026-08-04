# Comentarios de revisión — reestructuración LaTeX (04/08/2026)

Notas sobre los cambios pedidos (sacar carátula, promover portada a página 1, reemplazar propuesta escaneada). No se dejó ningún comentario dentro del PDF — todo queda documentado acá.

## 1. Texto de la Propuesta de Tema — verificado

Comparé el texto del PDF nuevo (`propuestaPfiDelia.docx.pdf`, sin firmar) contra el que tenía la versión escaneada anterior. Es **idéntico palabra por palabra** en las 7 páginas: Tipo de proyecto, Objetivo, Alcance, Descripción, Recursos/atributos disponibles, Dependencia de fuente externa. No falta nada.

**Única diferencia real**: la versión nueva tiene los campos de firma en blanco. La versión escaneada anterior tenía las firmas reales tuyas y del tutor Joaquín Salas. Lo uso porque así lo pediste explícitamente, pero quedó como dato a tener en cuenta — si en algún momento piden la propuesta firmada, es la versión vieja la que la tiene.

## 2. Bug encontrado y corregido: la propuesta se veía cortada del lado izquierdo

Al recompilar con la propuesta nueva noté que las páginas 2 a 8 (toda la propuesta incrustada) se veían con el margen izquierdo cortado — el logo de UADE, el encabezado y la primera columna de la tabla quedaban parcialmente invisibles. No era un problema del PDF que me pasaste (ese se ve perfecto en forma independiente), sino un bug de cómo LaTeX incrusta PDFs externos (`\includepdf`) cuando el documento tiene márgenes personalizados (`vmargin`): el offset de margen del documento se aplicaba también al PDF incrustado, corriéndolo fuera de la hoja.

Lo arreglé en `main.tex` (línea ~252) neutralizando el offset justo alrededor del `\includepdf` de la propuesta. Verifiqué visualmente las 7 páginas después del fix y ahora se ven completas y centradas, igual que el original.

## 3. Comentarios de revisión que sí quedaban visibles en el PDF (los saqué)

Encontré dos comentarios de trabajo que venían del template original de UADE y que se renderizaban como cajas verdes visibles en el PDF final (no eran comentarios de PDF/anotaciones, sino texto normal del documento):

- En `chapters/summary.tex` (Resumen, página 9): una nota de ejemplo tipo broma ("He encontrado una demostración maravillosa pero el margen es demasiado estrecho...") más una línea de debug sobre interlineado.
- En `chapters/conclusion.tex` (Conclusión, "Trabajo futuro"): "Este es un ejemplo de comentario".

Los saqué de los dos archivos y dejé el placeholder estándar `Completar.` en su lugar, consistente con el resto de las secciones que aún faltan.

## 4. Secciones que quedan con "Completar." (pendientes, no las toqué)

Estas ya estaban así antes de mis cambios y no las completé porque no correspondían al pedido de esta corrección — quedan igual que estaban, solo para que las tengas presentes antes de la entrega final del 50%:

- **Resumen** (pág. 9) — vacío.
- **Abstract** (pág. 10) — vacío.
- **Agradecimientos** (pág. 9 original, ahora antes del Resumen) — vacío.
- **Conclusión** — "Resumen de aportes" y "Trabajo futuro" vacíos.

Si corresponde completarlos para el 50%, avisame y los redactamos.

## 5. Pedido posterior: sacar las páginas de Agradecimientos/Resumen/Abstract

Pediste sacar las hojas 9, 10 y 11 (eran Agradecimientos, Resumen y Abstract, todas con solo "Completar." como contenido). Las saqué de `main.tex` — ahora después de la Propuesta (págs. 2–8) va directo el Índice. Los archivos `chapters/acknowledgments.tex`, `summary.tex` y `abstract.tex` siguen existiendo en el proyecto por si se completan para la entrega final, pero no se incluyen en este documento. El total bajó de 63 a 60 páginas.

## 6. Citas en el texto — sí son clickeables

Las citas con `\textcite{}`/`\cite{}` en el cuerpo (por ejemplo, en Estado del Arte) son enlaces internos reales: hacen click directo a la entrada correspondiente en la Bibliografía, gracias a la integración nativa de `biblatex` + `hyperref` que ya trae el template. Lo verifiqué abriendo el link embebido de la cita de Kulkarni et al. y confirmando que apunta a su entrada en la bibliografía. Ahora mismo se ven en rojo porque `hyperref` está en modo `colorlinks` (draft) — el propio `main.tex` ya tiene comentado el bloque para sacar el color en la entrega final (`\hypersetup{colorlinks=false, hidelinks}`), pero el link en sí sigue funcionando aunque el texto quede en negro.

## 7. Pedido posterior: Índice inmediatamente después de la portada

Moví el Índice para que vaya justo después de la portada (antes iba después de la Propuesta). Como la Propuesta de Tema es un PDF incrustado (no un capítulo LaTeX), no generaba entrada automática en el índice — le agregué una entrada manual ("Propuesta de Tema", apuntando a su primera página) para que quede listada igual que el resto de las secciones que arrancan justo después del índice.

## 9. Bug de fondo encontrado y corregido: la numeración de página estaba desfasada en TODO el documento

Cuando pediste que "Propuesta de Tema" en el índice lleve a la hoja 4, until entonces decía "3". Investigando encontré que no era un problema puntual de esa entrada: el entorno de la portada (`titlepage`) resetea internamente el contador de página a 0, lo que hacía que **todo número impreso en el documento** (índice, pies de página "Página X de Y") quedara corrido en -1 respecto de la posición física real dentro del PDF. Por eso también el pie de página decía "de 59" cuando el documento en realidad tiene 60 páginas.

Lo corregí con un `\setcounter{page}{2}` justo después de la portada (`main.tex`), para que el número que se imprime en cada página coincida siempre con la página física que muestra cualquier lector de PDF. Ya no hace falta pensar "el índice dice X pero hay que sumarle 1" — ahora el número coincide 1 a 1. Verificado: "Marco Teórico" dice página 11 en el índice y la página física 11 tiene el capítulo, con pie de página "Página 11 de 60".

## 10. Enlaces del documento en negro

Por pedido tuyo, saqué el color de todos los enlaces (índice, citas, referencias cruzadas) — ahora se ven en negro, sin caja ni resaltado, pero siguen siendo clickeables igual que antes.

## 12. Se sacan las capturas de Supabase y del endpoint JSON

Saqué las Figuras 7.4 (tabla TrendScore en Supabase) y 7.5 (respuesta JSON cruda del endpoint `/api/trend-scores`) del capítulo de Demo. El capítulo queda con las 3 capturas más ilustrativas (dashboard completo, panel de disponibilidad de endpoints, ranking por score).

## 13. Página de Conclusión — aclaración

La sección "8 Conclusión" (con "Resumen de aportes" y "Trabajo futuro") **no es algo que yo haya inventado**: es una sección obligatoria de la estructura del template oficial de UADE para el PFI (todo trabajo final necesita una conclusión). Lo que sí es cierto es que el contenido todavía no está redactado — sigue con el placeholder "Completar." porque no corresponde escribir conclusiones de un trabajo que está al 50%. No inventé ni completé ningún contenido ahí.

## 14. Bibliografía movida al final del documento

Ahora va después de Anexos, Lista de Figuras y Lista de Tablas — es la última página del documento (58 de 58).

## 15. Entrevistas — sigue pendiente, no las completé

Ya habíamos hablado de esto antes: no puedo redactar yo las respuestas de las 3 entrevistas (2 vendedores + 1 comprador) haciéndolas pasar por reales, porque sería fabricar datos de investigación — eso constituye fraude académico, incluso si después se usa para "analizar" lo inventado. La guía completa de las 3 entrevistas ya está en el Anexo C, lista para usarse. Si las hacés (aunque sea de forma rápida, 20-30 min cada una) y me pasás las respuestas reales, con gusto redacto el análisis temático completo. La alternativa honesta, que ya está reflejada en el documento, es dejarlo pendiente tal cual está ahora.

## 16. Estructura final verificada

- Página 1: portada interna (título, autor, tutor, UADE) — antes era la carátula amarilla genérica, ahora es la primera página como pediste.
- Páginas 2–8: Propuesta de Tema completa (7 páginas), centrada, sin firmas.
- Página 1: portada. Páginas 2–3: Índice (con "Propuesta de Tema" como primera entrada, apunta a la página 4). Páginas 4–10: Propuesta de Tema (7 páginas). De ahí en más: capítulos 1 a 7 (Demo con 3 capturas) → Conclusión → Anexos → Lista de Figuras → Lista de Tablas → Bibliografía (última página).
- Total: 58 páginas. Numeración impresa y física sincronizadas en todo el documento. Enlaces en negro. Compilación limpia (`pdflatex` → `biber` → `pdflatex` ×2), sin errores, sin overfull hbox de contenido.
