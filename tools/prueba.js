/* ============================================================
   AUN - banco de pruebas del nucleo
   ------------------------------------------------------------
   Ejecuta aun.js, obra-001.js y atrio.js contra un contexto de
   canvas simulado: comprueba el azar determinista (R1), el corte
   y la clasificacion de oraciones, y que ningun gesto lance una
   excepcion ni produzca un numero no finito.

   Desde la raiz del repositorio:
       jjs tools/prueba.js          (JDK 8-14, Nashorn)
       node tools/prueba.js         (con el apano de abajo)
   ============================================================ */

/* apano: node no trae load() ni print() */
if (typeof load === 'undefined') {
  var fs = require('fs');
  load = function (ruta) { (0, eval)(fs.readFileSync(ruta, 'utf8')); };
  print = console.log;
}

/* Banco de pruebas: ejecuta el nucleo y el sketch de la obra 001 contra un
   contexto de canvas simulado. No dibuja nada: cuenta gestos y vigila errores.
   Se ejecuta con jjs (Nashorn, ES5.1), por eso los polyfills de abajo. */

if (!Math.imul) {
  Math.imul = function (a, b) {
    a = a | 0; b = b | 0;
    var ah = (a >>> 16) & 0xffff, al = a & 0xffff,
        bh = (b >>> 16) & 0xffff, bl = b & 0xffff;
    return ((al * bl) + (((ah * bl + al * bh) << 16) >>> 0) | 0);
  };
}
if (typeof Float32Array === 'undefined') { Float32Array = Array; }

/* ---- stubs de navegador ---- */
var eventos = [];
function Nodo(attrs) {
  this.attrs = attrs || {};
  this.style = {};
  this.classList = { add: function () {}, remove: function () {} };
}
Nodo.prototype.getAttribute = function (k) { return (k in this.attrs) ? this.attrs[k] : null; };
Nodo.prototype.setAttribute = function (k, v) { this.attrs[k] = v; };
Nodo.prototype.removeAttribute = function (k) { delete this.attrs[k]; };
Nodo.prototype.hasAttribute = function (k) { return k in this.attrs; };
Nodo.prototype.querySelector = function () { return null; };
Nodo.prototype.querySelectorAll = function () { return []; };
Nodo.prototype.appendChild = function () {};
Nodo.prototype.addEventListener = function () {};

var html = new Nodo({ 'data-idioma': 'es', 'data-modo': 'noche' });

/* el contexto simulado: cuenta llamadas y comprueba numeros finitos */
var cuenta = {}, problemas = [];
function apunta(nombre, args) {
  cuenta[nombre] = (cuenta[nombre] || 0) + 1;
  for (var i = 0; i < args.length; i++) {
    if (typeof args[i] === 'number' && !isFinite(args[i])) {
      problemas.push(nombre + ' recibio ' + args[i] + ' en el argumento ' + i);
    }
  }
}
function Degradado() { this.paradas = 0; }
Degradado.prototype.addColorStop = function (p, c) {
  this.paradas++;
  if (!isFinite(p) || p < 0 || p > 1) problemas.push('addColorStop fuera de rango: ' + p);
  if (typeof c !== 'string' || c.indexOf('NaN') >= 0) problemas.push('color invalido: ' + c);
};
function Ctx() {
  this.globalCompositeOperation = 'source-over';
  this.globalAlpha = 1;
}
['save', 'restore', 'beginPath', 'closePath', 'fill', 'stroke', 'clearRect', 'fillRect',
 'moveTo', 'lineTo', 'arc', 'setTransform', 'rect'].forEach(function (m) {
  Ctx.prototype[m] = function () { apunta(m, arguments); };
});
Ctx.prototype.createRadialGradient = function () { apunta('createRadialGradient', arguments); return new Degradado(); };
Ctx.prototype.createLinearGradient = function () { apunta('createLinearGradient', arguments); return new Degradado(); };

var ctx = new Ctx();
var canvas = new Nodo({ id: 'lienzo-001' });
canvas.getContext = function () { return ctx; };
canvas.getBoundingClientRect = function () { return { width: 1440, height: 900 }; };
canvas.clientWidth = 1440; canvas.clientHeight = 900;

document = {
  documentElement: html,
  body: new Nodo({}),
  readyState: 'complete',
  querySelector: function () { return null; },
  querySelectorAll: function () { return []; },
  getElementById: function () { return null; },
  addEventListener: function () {},
  createElement: function () { return new Nodo({}); }
};
window = {
  devicePixelRatio: 2,
  addEventListener: function () {},
  matchMedia: function () { return { matches: false }; },
  requestAnimationFrame: function () { return 0; },
  console: { warn: function (a, b) { problemas.push('console.warn: ' + a + ' ' + b); } },
  dispatchEvent: function (e) { eventos.push(e); }
};
requestAnimationFrame = window.requestAnimationFrame;
cancelAnimationFrame = function () {};
setTimeout = function () { return 0; };
clearTimeout = function () {};
navigator = { language: 'es-ES' };
localStorage = { getItem: function () { return null; }, setItem: function () {} };
getComputedStyle = function () {
  var v = { '--noche': '#08070b', '--papel': '#ece6dc', '--acento': '#7a3fd6',
            '--luz': '#c9a6ff', '--hueso': '#e8e3da', '--tinta': '#14131a' };
  return { getPropertyValue: function (k) { return v[k] || ''; } };
};
CustomEvent = function (nombre, d) { this.type = nombre; this.detail = d && d.detail; };
console = window.console;

/* ---- carga del codigo real ---- */
load('docs/assets/js/aun.js');

var fallos = 0;
function comprueba(nombre, cond, extra) {
  if (cond) { print('  ok   ' + nombre + (extra ? '  ' + extra : '')); }
  else { print('  FALLA ' + nombre + (extra ? '  ' + extra : '')); fallos++; }
}

print('\n--- nucleo ---');
var TEXTO_ES = 'No todo se trata del reciente corte de cabello púrpura. ' +
  'No todo se trata de eso. También es tu voz que no cesa desde entonces. ' +
  'No todo se trata de esto pero sí, también es esto lo que yo veo.';

var h1 = AUN.hash('obra-001|es|' + TEXTO_ES), h2 = AUN.hash('obra-001|en|' + TEXTO_ES);
comprueba('hash es entero sin signo', h1 >= 0 && h1 <= 4294967295 && h1 === (h1 >>> 0), '0x' + h1.toString(16));
comprueba('hash estable', AUN.hash('aun') === AUN.hash('aun'));
comprueba('R6: es y en dan semillas distintas', h1 !== h2);

var r = AUN.rng(h1), muestras = [], i, min = 1, max = 0, suma = 0;
for (i = 0; i < 20000; i++) { var v = r(); muestras.push(v); if (v < min) min = v; if (v > max) max = v; suma += v; }
comprueba('rng en [0,1)', min >= 0 && max < 1, 'min ' + min.toFixed(5) + ' max ' + max.toFixed(5));
comprueba('rng media ~0.5', Math.abs(suma / 20000 - 0.5) < 0.01, 'media ' + (suma / 20000).toFixed(4));
var ra = AUN.rng(h1), rb = AUN.rng(h1);
comprueba('R1: misma semilla, misma secuencia', ra() === rb() && ra() === rb());

var n2 = AUN.ruido(AUN.rng(h1)), nmin = 1, nmax = 0;
for (i = 0; i < 3000; i++) {
  var vv = n2(i * 0.37, i * 0.71), fb = n2.fbm(i * 0.11, i * 0.13, 4);
  if (!isFinite(vv) || !isFinite(fb)) { problemas.push('ruido no finito'); break; }
  if (vv < nmin) nmin = vv; if (vv > nmax) nmax = vv;
}
comprueba('ruido en [0,1]', nmin >= 0 && nmax <= 1, 'min ' + nmin.toFixed(3) + ' max ' + nmax.toFixed(3));

var frases = AUN.oraciones(TEXTO_ES);
comprueba('corte de oraciones', frases.length === 4, frases.length + ' oraciones');
comprueba('clasificacion neg', AUN.clasificar(frases[0]) === 'neg', AUN.clasificar(frases[0]));
comprueba('clasificacion ad', AUN.clasificar(frases[2]) === 'ad', AUN.clasificar(frases[2]));
comprueba('clasificacion giro', AUN.clasificar(frases[3]) === 'giro', AUN.clasificar(frases[3]));
var med = AUN.medir(frases[0]);
comprueba('medir cuenta letras', med.letras === 45 && med.palabras === 10, med.letras + ' letras, ' + med.palabras + ' palabras');
comprueba('rgba desde hex', AUN.rgba('#7a3fd6', 0.5) === 'rgba(122,63,214,0.5)', AUN.rgba('#7a3fd6', 0.5));
comprueba('rgba tolera basura', AUN.rgba('', 0.5).indexOf('rgba(') === 0);

/* ---- la obra 001 contra el contexto simulado ---- */
print('\n--- obra 001 (partitura completa) ---');
var partitura = {
  lang: 'es',
  texto: TEXTO_ES,
  oraciones: AUN.oraciones(TEXTO_ES).map(function (f) { return AUN.medir(f); })
};
/* se recarga el sketch con una partitura inyectada */
document.getElementById = function () { return null; };   /* que no se monte solo */
load('docs/assets/js/obra-001.js');
comprueba('el sketch se registra', typeof AUN.obra001 === 'function');

var esc = {
  w: 1440, h: 900, min: 900, dpr: 2,
  rand: AUN.rng(h1), ruido: AUN.ruido(AUN.rng(h1)),
  texto: partitura.texto, lang: 'es', oraciones: partitura.oraciones,
  paleta: AUN.paleta(), semilla: h1, canvas: canvas
};
var gestos = AUN.obra001(esc);
comprueba('devuelve gestos', gestos.length > 30, gestos.length + ' gestos');
var fuera = gestos.filter(function (g) { return !(g.t >= 0 && g.t <= 1); });
comprueba('todos los gestos en [0,1]', fuera.length === 0, fuera.length + ' fuera');

gestos.sort(function (a, b) { return a.t - b.t; });
var explotados = 0;
gestos.forEach(function (g, k) {
  try { g.dibujar(ctx, esc, g); }
  catch (e) { explotados++; problemas.push('gesto ' + k + ' (t=' + g.t + '): ' + e); }
});
comprueba('ningun gesto lanza excepcion', explotados === 0, explotados + ' explotados');
comprueba('se dibujo de verdad', (cuenta.stroke || 0) + (cuenta.fill || 0) > 500,
          'fill ' + (cuenta.fill || 0) + ' stroke ' + (cuenta.stroke || 0));
comprueba('hubo sustraccion y deposito',
          (cuenta.createLinearGradient || 0) > 0 && (cuenta.createRadialGradient || 0) > 0,
          'lineales ' + cuenta.createLinearGradient + ' radiales ' + cuenta.createRadialGradient);
comprueba('sin numeros no finitos ni colores invalidos', problemas.length === 0,
          problemas.length ? problemas.slice(0, 4).join(' | ') : '');

print('\n' + (fallos === 0 ? 'TODO EN PIE' : fallos + ' FALLOS'));

print('\n--- atrio (indice de 11 entradas) ---');
load('docs/assets/js/atrio.js');
if (typeof AUN.atrio !== 'function') { print('  FALLA no se exporta el sketch del atrio'); }
else {
  var titulos = ['No todo se trata','Habito','22.04.2022','No','Similitud','M',
                 'M','Titre inconnu','Las esquirlas de Buttes Chaumont','Inconnu','Titre inconnu'];
  var tipos = ['ad','resto','resto','resto','resto','resto','resto','resto','resto','resto','neg'];
  var ors = titulos.map(function (t, i) { return AUN.medir(t + ' 2020 es', tipos[i]); });
  var e2 = { w: 1200, h: 2400, min: 1200, dpr: 2, rand: AUN.rng(7), ruido: AUN.ruido(AUN.rng(11)),
             texto: titulos.join(' '), lang: 'es', oraciones: ors, paleta: AUN.paleta(),
             semilla: 12345, canvas: canvas };
  var g2 = AUN.atrio(e2), rotos = 0;
  g2.sort(function (a, b) { return a.t - b.t; });
  g2.forEach(function (g, k) { try { g.dibujar(ctx, e2, g); } catch (err) { rotos++; print('  FALLA gesto ' + k + ': ' + err); } });
  print((rotos === 0 ? '  ok   ' : '  FALLA ') + g2.length + ' gestos del atrio, ' + rotos + ' explotados');
  print('  ok   problemas numericos acumulados: ' + problemas.length);
}
