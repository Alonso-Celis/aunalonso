#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUN — compilador del archivo (reglas R1)
========================================

    docs/*.md   ->   docs/obra/*/index.html   +   docs/index.html

No es un generador de sitios. Es el paso que aplica la *tabla de reglas*
al texto: parte el texto en oraciones, clasifica cada una (negacion,
adicion, giro, resto) y escribe ese analisis en el HTML como atributos.
El dibujo del navegador no vuelve a analizar nada: lee la pagina (R2).

Uso:
    python tools/build.py            # compila
    python tools/build.py --check    # no escribe; dice que cambiaria

Convencion de nombres en docs/:
    <slug>_<fecha>.<lang>.md     no_todo_se_trata_2026.es.md
    <slug>_<fecha>.md            habito_18-08-2024.md   (lang = es)
    <fecha> = dd-mm-aaaa | aaaa | date-inconnue

Una pagina de obra declara su texto fuente en el <head>:
    <!-- AUN:FUENTE no_todo_se_trata_2026 -->
y deja los huecos:
    <!-- AUN:TEXTO es --> ... <!-- /AUN:TEXTO es -->
"""

import io
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(RAIZ, 'docs')
IGNORAR = {'readme.md', 'poetica.md', 'poetics.md', 'license.md'}

# --- tabla de reglas R1: identica a AUN.TABLA en assets/js/aun.js ----------
TABLA = [
    ('giro', re.compile(r'\b(pero s[ií]|but yes)\b', re.I)),
    ('neg',  re.compile(r'^\s*(no todo|not everything|no\b|not\b)', re.I)),
    ('ad',   re.compile(r'^\s*(tambi[eé]n|it is also|also\b)', re.I)),
]

RE_NOMBRE = re.compile(r'^(?P<base>.+?)(?:\.(?P<lang>es|en|fr))?\.md$', re.I)
RE_FECHA = re.compile(r'_(?P<f>\d{2}-\d{2}-\d{4}|\d{4}|date-inconnue)$')


def clasificar(frase):
    for tipo, prueba in TABLA:
        if prueba.search(frase) if tipo == 'giro' else prueba.match(frase):
            return tipo
    return 'resto'


def oraciones(texto):
    """Corte de oraciones equivalente al de AUN.oraciones (sin lookbehind)."""
    t = re.sub(r'\s+', ' ', texto).strip()
    cierres = '.!?”»")'
    fuera, ini, i = [], 0, 0
    while i < len(t):
        c = t[i]
        if c in '.!?':
            while i + 1 < len(t) and t[i + 1] in cierres:
                i += 1
            fuera.append(t[ini:i + 1].strip())
            ini = i + 1
        i += 1
    resto = t[ini:].strip()
    if resto:
        fuera.append(resto)
    return [s for s in fuera if len(s) > 1]


def escapar(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


class Texto(object):
    def __init__(self, ruta):
        self.ruta = ruta
        self.archivo = os.path.basename(ruta)
        m = RE_NOMBRE.match(self.archivo)
        base = m.group('base') if m else self.archivo
        self.lang = (m.group('lang') or 'es').lower() if m else 'es'
        f = RE_FECHA.search(base)
        self.fecha = f.group('f') if f else ''
        self.slug = base
        crudo = io.open(ruta, encoding='utf-8').read().replace('\r\n', '\n')
        lineas = crudo.split('\n')
        self.titulo = ''
        if lineas and lineas[0].startswith('#'):
            self.titulo = lineas[0].lstrip('#').strip()
            lineas = lineas[1:]
        cuerpo = '\n'.join(lineas).strip()
        self.parrafos = [p.strip() for p in re.split(r'\n\s*\n', cuerpo) if p.strip()]
        if not self.titulo:
            nombre = RE_FECHA.sub('', base).replace('_', ' ').strip()
            if nombre:
                nombre = nombre[0].upper() + nombre[1:]
            self.titulo = nombre or (self.fecha or base)

    @property
    def anio(self):
        if not self.fecha:
            return ''
        return self.fecha[-4:] if re.match(r'^\d', self.fecha) else ''

    @property
    def orden(self):
        f = self.fecha
        if re.match(r'^\d{2}-\d{2}-\d{4}$', f):
            d, m, a = f.split('-')
            return a + m + d
        if re.match(r'^\d{4}$', f):
            return f + '0000'
        return '00000000'

    def bloque(self):
        """HTML del texto: una oracion, una linea, con su tipo declarado."""
        salida = ['<div data-texto lang="%s" data-reglas="R1" data-fuente="%s">'
                  % (self.lang, self.archivo)]
        n = 0
        for p in self.parrafos:
            if re.match(r'^(alonso|a\.)\b', p, re.I) and p is self.parrafos[-1]:
                salida.append('    <p class="firma">%s</p>'
                              % '<br>'.join(escapar(l.strip()) for l in p.split('\n')))
                continue
            if re.match(r'^\*{3,}$', p):
                salida.append('    <hr class="regla">')
                continue
            for frase in oraciones(p):
                n += 1
                salida.append('    <p class="o" data-tipo="%s" data-n="%d">%s</p>'
                              % (clasificar(frase), n, escapar(frase)))
        salida.append('  </div>')
        return '\n  '.join(salida)


def leer(ruta):
    return io.open(ruta, encoding='utf-8').read().replace('\r\n', '\n')


def escribir(ruta, contenido, cambios, check):
    antes = leer(ruta) if os.path.exists(ruta) else None
    if antes == contenido:
        return
    cambios.append(os.path.relpath(ruta, RAIZ))
    if not check:
        io.open(ruta, 'w', encoding='utf-8', newline='\n').write(contenido)


def entre(html, ini, fin, nuevo):
    pat = re.compile(re.escape(ini) + r'.*?' + re.escape(fin), re.S)
    if not pat.search(html):
        return html, False
    return pat.sub(lambda _: ini + '\n  ' + nuevo + '\n  ' + fin, html, count=1), True


def main(argv):
    check = '--check' in argv
    cambios = []

    # 1. corpus
    textos = {}
    for nombre in sorted(os.listdir(DOCS)):
        if not nombre.lower().endswith('.md') or nombre.lower() in IGNORAR:
            continue
        t = Texto(os.path.join(DOCS, nombre))
        textos.setdefault(t.slug, {})[t.lang] = t

    # 2. paginas que declaran un texto fuente (obra, sala, camara...)
    paginas = []          # [(slug, ruta)]
    obras, sellados = {}, {}
    for raiz, dirs, ficheros in os.walk(DOCS):
        dirs[:] = [d for d in dirs if d not in ('assets', '.git')]
        for f in sorted(ficheros):
            if not f.endswith('.html'):
                continue
            ruta = os.path.join(raiz, f)
            m = re.search(r'<!--\s*AUN:FUENTE\s+([\w\-.]+)\s*-->', leer(ruta))
            if not m:
                continue
            slug = m.group(1)
            paginas.append((slug, ruta))
            rel = os.path.relpath(ruta, DOCS).replace(os.sep, '/')
            # el enlace del indice apunta al index.html de la obra;
            # una camara marca el texto como sellado
            if rel.startswith('obra/') and f == 'index.html':
                obras[slug] = ruta
            elif rel.startswith('camara/'):
                sellados[slug] = ruta

    # 3. rellenar cada pagina con sus textos
    for slug, ruta in paginas:
        html = leer(ruta)
        original = html
        for lang, t in sorted(textos.get(slug, {}).items()):
            html, ok = entre(html,
                             '<!-- AUN:TEXTO %s -->' % lang,
                             '<!-- /AUN:TEXTO %s -->' % lang,
                             t.bloque())
            if not ok:
                sys.stderr.write('  ! %s: falta el hueco AUN:TEXTO %s\n'
                                 % (os.path.relpath(ruta, RAIZ), lang))
        if html != original:
            escribir(ruta, html, cambios, check)

    # 4. indice del atrio
    filas = []
    orden = sorted(textos.items(), key=lambda kv: max(t.orden for t in kv[1].values()), reverse=True)
    for slug, porLang in orden:
        t = porLang.get('es') or list(porLang.values())[0]
        langs = '/'.join(sorted(porLang.keys()))
        if slug in obras:
            rel = os.path.relpath(os.path.dirname(obras[slug]), DOCS).replace(os.sep, '/')
            href = rel + '/'
            folio = re.match(r'^(\d+)', os.path.basename(rel))
            folio = folio.group(1) if folio else (t.anio or '·')
            marca = ' data-obra'
        elif slug in sellados:
            href = os.path.relpath(sellados[slug], DOCS).replace(os.sep, '/')
            folio = t.anio or '·'
            marca = ' data-sellado'
        else:
            # sin obra construida: el lector aplica R1 al vuelo
            href = 'leer/?t=' + porLang[sorted(porLang.keys())[0]].archivo
            folio = t.anio or '·'
            marca = ''
        fecha = t.fecha.replace('-', '.') if t.fecha else 's/f'
        filas.append(
            '<li data-slug="%s"%s><a href="%s">'
            '<span class="n">%s</span>'
            '<span class="t">%s</span>'
            '<span class="meta">%s · %s</span></a></li>'
            % (slug, marca, href, folio, escapar(t.titulo), fecha, langs))

    indice = os.path.join(DOCS, 'index.html')
    html = leer(indice)
    lista = '<ol class="corpus">\n    ' + '\n    '.join(filas) + '\n  </ol>'
    html, ok = entre(html, '<!-- AUN:CORPUS -->', '<!-- /AUN:CORPUS -->', lista)
    if not ok:
        sys.stderr.write('  ! docs/index.html: falta el hueco AUN:CORPUS\n')
    escribir(indice, html, cambios, check)

    print('AUN R1 — %d textos, %d obras, %d sellados' % (len(textos), len(obras), len(sellados)))
    if cambios:
        print(('cambiaria: ' if check else 'escrito: ') + ', '.join(cambios))
    else:
        print('sin cambios')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
