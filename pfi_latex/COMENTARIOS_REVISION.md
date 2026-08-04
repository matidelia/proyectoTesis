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

## 8. Estructura final verificada

- Página 1: portada interna (título, autor, tutor, UADE) — antes era la carátula amarilla genérica, ahora es la primera página como pediste.
- Páginas 2–8: Propuesta de Tema completa (7 páginas), centrada, sin firmas.
- Página 1: portada. Páginas 2–2: Índice (con "Propuesta de Tema" como primera entrada). Páginas 3–9: Propuesta de Tema (7 páginas). De ahí en más: capítulos 1 a 7 → Conclusión → Bibliografía → Anexos → Lista de Figuras → Lista de Tablas.
- Total: 60 páginas. Compilación limpia (`pdflatex` → `biber` → `pdflatex` ×2), sin errores, sin overfull hbox de contenido.
