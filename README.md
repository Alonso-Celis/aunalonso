# AÚN

Archivo de escrituras de **Alonso Celis**. Sitio estático en GitHub Pages (rama `master`, carpeta raíz).

La única página publicada es **[docs/line/](https://alonso-celis.github.io/aunalonso/docs/line/)**:
cada archivo `.md` de `docs/line/` es una pestaña de la página. La raíz del sitio redirige allí.

## Estructura

```
index.html          redirige a docs/line/
docs/line/          la página publicada
  index.html        lee los .md al cargar y los muestra en pestañas
  *.md              los textos, una pestaña cada uno
_archivo/           otros textos; Jekyll no publica carpetas que empiezan por "_"
```

## Añadir una pestaña

1. Escribir el texto en `docs/line/mi_texto.md`. La primera línea `## ...` es el título;
   `### ...` abre un apartado; una línea en blanco separa párrafos; un salto simple es un verso.
2. Añadir una línea a la lista `TEXTOS` al final de `docs/line/index.html`.

## Local

```bash
python3 -m http.server 8000      # http://localhost:8000/docs/line/
```

Alonso Celis · Paris · 2026
