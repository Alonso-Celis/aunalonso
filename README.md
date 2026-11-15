# AÚN

Archivo de escrituras de **Alonso Celis**, y de las formas que esas escrituras generan.
Sitio estático en GitHub Pages, servido desde `docs/`.

> *Aún*: todavía, lo que no ha cesado.

La propuesta en una frase: **cada texto genera su propia forma mediante reglas públicas y
deterministas**. La forma no ilustra el texto — lo lee. El mismo texto da siempre la misma
imagen, porque la semilla del azar es el hash del texto.

Las reglas completas, la tabla de correspondencias y las fases del proyecto están en la
**[poética](docs/poetica/index.html)** (versión actual del cuaderno de reglas: `R1`).

---

## Estructura

```
docs/                        raíz publicada (GitHub Pages · master /docs)
  *.md                       los textos. Única fuente de verdad.
  index.html                 el atrio: el archivo como campo
  poetica/                   la poética: las reglas, bilingüe
  obra/001-no-todo-se-trata/ obra con forma construida a mano
  leer/                      lector: aplica las reglas a cualquier .md del archivo
  sala/                      sala WebGL (three.js): el texto como volumen
  camara/                    acceso restringido: textos sellados (AES-GCM en el navegador)
  taller/                    el taller y sus fuentes (Processing, SuperCollider)
  assets/css, assets/js      motor propio, sin dependencias
tools/build.py               el compilador: aplica la tabla de reglas a los .md
tools/prueba.js              banco de pruebas del nucleo (jjs o node)
```

## Convención de nombres de los textos

```
<slug>_<fecha>.<lang>.md     no_todo_se_trata_2026.es.md
<slug>_<fecha>.md            habito_18-08-2024.md          (lang = es)
<fecha> = dd-mm-aaaa | aaaa | date-inconnue
```

Un texto con versiones en varios idiomas comparte el `<slug>_<fecha>` y cambia el sufijo de
idioma: el sitio los presenta como hermanos, no como original y traducción.

## Añadir un texto

```bash
# 1. escribir el texto
$EDITOR docs/mi_texto_20-08-2026.es.md

# 2. compilar: parte el texto en oraciones, las clasifica y escribe el HTML
python tools/build.py            # --check para ver qué cambiaría sin escribir

# 3. mirar
python -m http.server 8000 --directory docs    # http://localhost:8000
```

El texto aparece en el atrio y se puede leer con forma en `leer/?t=mi_texto_20-08-2026.es.md`.
Si un texto pide forma propia, se le crea una carpeta en `docs/obra/` con su sketch, y se
declara la fuente en la página:

```html
<!-- AUN:FUENTE mi_texto_20-08-2026 -->
<!-- AUN:TEXTO es --> <div data-texto lang="es"></div> <!-- /AUN:TEXTO es -->
```

## Local

Un servidor local hace falta para el lector y para la sala (`fetch` y módulos ES no funcionan
sobre `file://`). El atrio, la obra 001 y la cámara sí se abren como archivo local.

```bash
python -m http.server 8000 --directory docs
```

## Pruebas

```bash
jjs tools/prueba.js          # JDK 8-14 (Nashorn)
node tools/prueba.js         # o Node
```

Ejecuta el motor contra un canvas simulado: azar determinista, corte y clasificación de
oraciones, y que ningún gesto lance excepción ni produzca un número no finito.

## Acceso restringido

`docs/camara/` sirve textos **sellados**, no escondidos: la cifra es pública, la llave se
entrega a mano. AES-GCM 256 con PBKDF2-SHA256 (310 000 iteraciones), todo en el navegador —
la frase de paso nunca viaja. Para sellar un texto: `docs/camara/sellar.html`.

Límite conocido y asumido: la seguridad es la de la frase de paso. Acceso por persona y
revocable en la fase 2 (ver la poética).

## Herramientas

| oficio | herramienta |
| --- | --- |
| el sitio | Canvas 2D propio, sin dependencias |
| volumen | [three.js](https://threejs.org/) en `docs/sala/` |
| tinta, plotter, gran formato | [Processing](https://processing.org/) en `docs/taller/processing/` |
| la voz | [SuperCollider](https://supercollider.github.io/) en `docs/taller/supercollider/` |
| cuaderno abierto | [OpenProcessing](https://openprocessing.org/discover/#/generativeart) |

Sin analítica, sin rastreadores, sin cookies, sin bucles infinitos.

---

Alonso Celis · Paris · 2026
