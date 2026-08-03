# Proyecto Final de Ingeniería

**Template para el Proyecto Final de Ingeniería**
Universidad Argentina de la Empresa (UADE)

---

## Instalación de entorno en Windows

1. **Instalar MikTeX**.
2. Abrir la **consola de MikTeX** y actualizar.
3. Seleccionar todos los paquetes **no instalados** (ordenar por “No instalados”) e instalarlos.

**Opcional:**

* Instalar **LaTeX Workshop** en VS Code.
* Automatizar la compilación en VS Code mediante una carpeta de configuración.

---

## Compilar el PDF

Para generar el documento PDF, abrir **cmd**, **bash** o **PowerShell** en la carpeta del proyecto y ejecutar:

```shell
pdflatex main
biber main
pdflatex main
```

> Cada pasada realiza cambios en el documento. La última pasada genera la versión final.

En caso de error, obtener más detalles con:

```shell
pdflatex -file-line-error -interaction=errorstopmode main
```

---

## Comentarios generales sobre el repositorio

* Usar **fork** en lugar de trabajar directamente sobre el repositorio.
* **No** pushear cambios al repositorio original.

---

### Antes de las entregas

* **Color de referencias**: deben ser negras en la entrega final (en el template están en rojo para facilitar la revisión durante el desarrollo).
* Revisar **warnings** de *biber*.
* Eliminar ejemplos del template.
* Verificar que no haya notas de corrección:

  * Comentar el paquete `pdfcomment`.
  * Comentar comandos como `\Nico`.
  * Si compila sin ellos, no hay comentarios pendientes.
* Generar la portada con [este enlace](https://biblioteca.uade.edu.ar/custom/web/content/biblioteca/pdf/tif-pfi/generarCaratulas/crearCaratula.html).
* En `biblio.bib`, el campo **note** debe estar actualizado si corresponde.
* No hacer el **resumen** ni el **abstract** hasta la entrega final.
* Todo contenido no propio debe estar citado, incluidas imágenes y tablas.
* El **marco teórico** solo debe incluir lo necesario para que el lector entienda la tesis.
* La fecha completa en la portada solo en la entrega final; de lo contrario, solo el año.

---

### Sobre la entrega final

* **No** incluir la portada (comentar el código LaTeX que la genera).
* **No** incluir el anexo de cronograma.
* Incluir **resumen** y **abstract**.

---

## Recomendaciones para tesis de proyecto

*(Opcional)*

* Incluir un **FODA**.

---

## Estructura sugerida para tesis de proyecto

El template está estructurado como una tesis de investigación, pero aquí se propone una organización típica para **Proyecto Final**.
En el contexto de esta tesis:

* `chapter` → **Sección**
* `section` → **Subsección**
* `subsection` → **Sub-subsección**

El índice debe mostrar hasta **4 niveles de profundidad** (configurado en el template), aunque internamente se puede usar hasta `paragraph`.

**Estructura:**

1. **Introducción**
   - **Objetivos**
     - Objetivos generales
     - Objetivos específicos
   - **Alcance**
     - Características del prototipo funcional *(puede variar el nombre)*
     - Limitaciones y exclusiones
     - Estructura del documento

2. **Antecedentes**
   - **Marco Teórico**
     - Subtemas del marco teórico
   - **Estado del Arte**
     - Temas relevantes
     - Conclusiones *(verificar si corresponde en la entrega final)*

3. **Descripción**
   - **User Research** *(opcional, toda la tesis lo incluye)*
     - Encuesta sobre…
     - Entrevista a…
     - User Persona *(opcional)*

4. **Metodología de desarrollo**
   - Metodología
   - Arquitectura y tecnologías utilizadas
   - Validación del sistema

5. **Conclusión general**

6. **Bibliografía**

7. **Anexos**
8. **Lista de Figuras**
9. **Lista de Tablas**