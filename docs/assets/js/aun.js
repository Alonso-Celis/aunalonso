/* ============================================================
   AUN — nucleo / core            reglas R1
   ------------------------------------------------------------
   Principios (ver docs/POETICA.md):
     R1  el texto es la semilla   — todo dibujo se deriva del texto
     R2  la pagina es el dato     — el dibujo lee el DOM, no un JSON
     R3  nada se repite en bucle  — el tiempo acumula, luego se detiene
   Sin dependencias. Script clasico: funciona en file:// y en Pages.
   ============================================================ */
var AUN = (function () {
  'use strict';
  var A = { REGLAS: 'R1', obras: {} };

  /* ---------- 1. semilla: el texto es la semilla ---------- */

  /* FNV-1a 32 bit sobre unidades UTF-16 */
  A.hash = function (s) {
    var h = 0x811c9dc5, i;
    s = String(s);
    for (i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  };

  /* mulberry32: determinista, mismo texto = misma imagen */
  A.rng = function (semilla) {
    var a = (semilla >>> 0) || 0x9e3779b9;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  A.entre = function (r, a, b) { return a + (b - a) * r(); };
  A.gauss = function (r) { return (r() + r() + r() + r() - 2) * 0.7071; };
  A.elige = function (r, lista) { return lista[Math.floor(r() * lista.length) % lista.length]; };

  /* ruido de valor 2D + fbm */
  A.ruido = function (r) {
    var N = 256, tab = new Float32Array(N * N), i;
    for (i = 0; i < tab.length; i++) tab[i] = r();
    function en(x, y) { return tab[((y & 255) << 8) + (x & 255)]; }
    function sua(u) { return u * u * (3 - 2 * u); }
    function n2(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y),
          u = sua(x - xi), v = sua(y - yi),
          a = en(xi, yi), b = en(xi + 1, yi), c = en(xi, yi + 1), d = en(xi + 1, yi + 1);
      return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
    }
    n2.fbm = function (x, y, oct, gan) {
      oct = oct || 4; gan = gan || 0.5;
      var s = 0, amp = 1, tot = 0, k;
      for (k = 0; k < oct; k++) {
        s += n2(x, y) * amp; tot += amp;
        x *= 2; y *= 2; amp *= gan;
      }
      return s / tot;
    };
    return n2;
  };

  /* ---------- 2. materia: color desde el CSS ---------- */

  A.token = function (nombre, alt) {
    var v = '';
    try { v = getComputedStyle(document.documentElement).getPropertyValue(nombre).trim(); } catch (e) {}
    return v || alt || '#ffffff';
  };

  A.rgba = function (color, a) {
    var c = String(color).trim(), n, r, g, b;
    if (c.charAt(0) === '#') {
      c = c.slice(1);
      if (c.length === 3) c = c.charAt(0) + c.charAt(0) + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2);
      n = parseInt(c.slice(0, 6), 16);
      if (isNaN(n)) return 'rgba(255,255,255,' + a + ')';
      r = (n >> 16) & 255; g = (n >> 8) & 255; b = n & 255;
      return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }
    var m = c.match(/(-?[\d.]+)[,\s]+(-?[\d.]+)[,\s]+(-?[\d.]+)/);
    if (m) return 'rgba(' + m[1] + ',' + m[2] + ',' + m[3] + ',' + a + ')';
    return 'rgba(255,255,255,' + a + ')';
  };

  A.paleta = function () {
    return {
      noche:  A.token('--noche', '#08070b'),
      papel:  A.token('--papel', '#ece6dc'),
      acento: A.token('--acento', '#7a3fd6'),
      luz:    A.token('--luz', '#c9a6ff'),
      hueso:  A.token('--hueso', '#e8e3da'),
      papelMode: (document.documentElement.getAttribute('data-modo') === 'papel')
    };
  };

  /* ---------- 3. lectura del texto (tabla de reglas R1) ---------- */

  A.TABLA = [
    { tipo: 'giro', prueba: /\b(pero s[ií]|but yes)\b/i },        /* la bisagra: niega y afirma */
    { tipo: 'neg',  prueba: /^\s*(no todo|not everything|no\b|not\b)/i },
    { tipo: 'ad',   prueba: /^\s*(tambi[eé]n|it is also|also\b)/i }
  ];

  A.clasificar = function (frase) {
    for (var i = 0; i < A.TABLA.length; i++) {
      if (A.TABLA[i].prueba.test(frase)) return A.TABLA[i].tipo;
    }
    return 'resto';
  };

  /* corte de oraciones sin lookbehind (compatibilidad amplia) */
  A.oraciones = function (texto) {
    var t = String(texto).replace(/\s+/g, ' ').trim(),
        cierres = '.!?”»")', out = [], ini = 0, i, c, resto;
    for (i = 0; i < t.length; i++) {
      c = t.charAt(i);
      if (c === '.' || c === '!' || c === '?') {
        while (i + 1 < t.length && cierres.indexOf(t.charAt(i + 1)) >= 0) i++;
        out.push(t.slice(ini, i + 1).trim());
        ini = i + 1;
      }
    }
    resto = t.slice(ini).trim();
    if (resto) out.push(resto);
    return out.filter(function (s) { return s.length > 1; });
  };

  /* [^letras]: se construye en tiempo de ejecucion — un literal con
     \p{L} seria error de sintaxis en motores sin propiedades unicode
     y tumbaria el archivo entero antes de cualquier try/catch */
  var NO_LETRA = (function () {
    try { return new RegExp('[^\\p{L}]', 'gu'); }
    catch (e) { return /[^A-Za-zÀ-ɏ]/g; }
  }());

  A.medir = function (frase, tipo) {
    var pal = frase.split(/\s+/).filter(Boolean), letras;
    letras = frase.replace(NO_LETRA, '').length;
    return {
      txt: frase,
      tipo: tipo || A.clasificar(frase),
      palabras: pal.length,
      letras: letras,
      comas: (frase.match(/,/g) || []).length,
      semilla: A.hash(frase)
    };
  };

  /* R2: la pagina es el dato. Se lee el bloque del idioma activo. */
  A.partitura = function (raiz) {
    var lang = document.documentElement.getAttribute('data-idioma') || 'es',
        ambito = raiz || document,
        bloque = ambito.querySelector('[data-texto][lang="' + lang + '"]') || ambito.querySelector('[data-texto]'),
        oraciones = [], texto = '', nodos;
    if (!bloque) return { lang: lang, texto: '', oraciones: [] };
    nodos = bloque.querySelectorAll('.o');
    if (nodos.length) {
      Array.prototype.forEach.call(nodos, function (n) {
        var s = n.textContent.replace(/\s+/g, ' ').trim();
        if (!s) return;
        oraciones.push(A.medir(s, n.getAttribute('data-tipo')));
        texto += s + ' ';
      });
    } else {
      texto = bloque.textContent;
      A.oraciones(texto).forEach(function (s) { oraciones.push(A.medir(s)); });
    }
    return { lang: lang, texto: texto.replace(/\s+/g, ' ').trim(), oraciones: oraciones };
  };

  /* ---------- 4. utiles de dibujo ---------- */

  /* mancha suave: sin filtros de canvas, solo degradados (compatibilidad) */
  A.mancha = function (ctx, x, y, r, color, alfa) {
    if (r <= 0) return;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, A.rgba(color, alfa));
    g.addColorStop(0.55, A.rgba(color, alfa * 0.42));
    g.addColorStop(1, A.rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  /* banda horizontal de bordes suaves: sirve para depositar o para borrar */
  A.banda = function (ctx, y, alto, color, alfa, w) {
    var g = ctx.createLinearGradient(0, y - alto / 2, 0, y + alto / 2);
    g.addColorStop(0, A.rgba(color, 0));
    g.addColorStop(0.5, A.rgba(color, alfa));
    g.addColorStop(1, A.rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, y - alto / 2, w, alto);
  };

  /* filamento: trazo corto guiado por ruido — la voz */
  A.filamento = function (ctx, x, y, largo, ruido, esc, color, alfa, grosor) {
    var pasos = Math.max(2, Math.round(largo / 6)), i, ang, px = x, py = y;
    ctx.strokeStyle = A.rgba(color, alfa);
    ctx.lineWidth = grosor;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (i = 0; i < pasos; i++) {
      ang = (ruido.fbm(px * 0.004, py * 0.004, 3) - 0.5) * Math.PI * 1.6 - Math.PI / 2;
      px += Math.cos(ang) * 6;
      py += Math.sin(ang) * 6;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  };

  A.grano = function (ctx, esc, cantidad, color, alfa) {
    var i, x, y;
    ctx.fillStyle = A.rgba(color, alfa);
    for (i = 0; i < cantidad; i++) {
      x = esc.rand() * esc.w;
      y = esc.rand() * esc.h;
      ctx.fillRect(x, y, 1, 1);
    }
  };

  /* ---------- 5. motor: partitura de gestos en el tiempo (R3) ---------- */

  A.lienzo = function (canvas, sketch, opts) {
    if (!canvas || !canvas.getContext) return null;
    opts = opts || {};
    var ctx = canvas.getContext('2d'),
        dur = (opts.dur || 28) * 1000,
        quieto = false,
        gestos = [], hechos = 0, t0 = 0, raf = 0, esc = null,
        anchoPrev = 0, altoPrev = 0, tid = 0;

    try { quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    function medidas() {
      var r = canvas.getBoundingClientRect(),
          dpr = Math.min(window.devicePixelRatio || 1, 2),
          w = Math.max(1, Math.round(r.width || canvas.clientWidth || 320)),
          h = Math.max(1, Math.round(r.height || canvas.clientHeight || 320));
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      anchoPrev = w; altoPrev = h;
      return { w: w, h: h, dpr: dpr };
    }

    function ejecutar(av) {
      while (hechos < gestos.length && gestos[hechos].t <= av) {
        var g = gestos[hechos++];
        ctx.save();
        try { g.dibujar(ctx, esc, g); }
        catch (e) { if (window.console && console.warn) console.warn('AUN gesto:', e); }
        ctx.restore();
      }
    }

    function paso(ts) {
      if (!t0) t0 = ts;
      var av = Math.min(1, (ts - t0) / dur);
      ejecutar(av);
      if (av < 1) raf = requestAnimationFrame(paso);
      else { canvas.setAttribute('data-final', ''); raf = 0; }
    }

    function construir() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      var m = medidas(),
          p = (opts.partitura || A.partitura)(),
          semilla = A.hash((opts.clave || '') + '|' + p.lang + '|' + p.texto);
      esc = {
        w: m.w, h: m.h, dpr: m.dpr, min: Math.min(m.w, m.h),
        rand: A.rng(semilla),
        ruido: A.ruido(A.rng((semilla ^ 0x9e3779b9) >>> 0)),
        texto: p.texto, lang: p.lang, oraciones: p.oraciones,
        paleta: A.paleta(), semilla: semilla, canvas: canvas
      };
      ctx.setTransform(m.dpr, 0, 0, m.dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, m.w, m.h);
      gestos = (sketch(esc) || []).slice().sort(function (a, b) { return a.t - b.t; });
      hechos = 0;
      canvas.removeAttribute('data-final');
      if (quieto || opts.instantaneo) { ejecutar(1); canvas.setAttribute('data-final', ''); return; }
      t0 = 0;
      raf = requestAnimationFrame(paso);
    }

    function alRedimensionar() {
      clearTimeout(tid);
      tid = setTimeout(function () {
        var r = canvas.getBoundingClientRect();
        /* se ignoran los saltos de barra de direcciones en movil */
        if (Math.abs(r.width - anchoPrev) < 24 && Math.abs(r.height - altoPrev) < 96) return;
        construir();
      }, 240);
    }

    window.addEventListener('resize', alRedimensionar);
    window.addEventListener('aun:idioma', construir);
    window.addEventListener('aun:modo', construir);

    /* se construye tras el layout para medir bien */
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      requestAnimationFrame(construir);
    } else {
      window.addEventListener('DOMContentLoaded', function () { requestAnimationFrame(construir); });
    }

    var ctrl = {
      canvas: canvas,
      rehacer: construir,
      escena: function () { return esc; },
      guardar: function (nombre) { A.guardar(canvas, nombre); }
    };
    A.obras[canvas.id || ('lienzo' + Object.keys(A.obras).length)] = ctrl;
    return ctrl;
  };

  A.guardar = function (canvas, nombre) {
    try {
      var a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = (nombre || 'aun') + '.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) { if (window.console) console.warn('AUN guardar:', e); }
  };

  /* ---------- 6. preferencias: idioma y modo ---------- */

  A.pref = function (clave, valor) {
    try {
      if (valor === undefined) return localStorage.getItem('aun:' + clave);
      localStorage.setItem('aun:' + clave, valor);
    } catch (e) {}
    return valor;
  };

  function marcar(accion, valor) {
    var nodos = document.querySelectorAll('[data-accion="' + accion + '"]');
    Array.prototype.forEach.call(nodos, function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-valor') === valor));
    });
  }

  A.idioma = function (v) {
    var html = document.documentElement;
    if (v === undefined) return html.getAttribute('data-idioma') || 'es';
    html.setAttribute('data-idioma', v);
    html.setAttribute('lang', v);
    A.pref('idioma', v);
    marcar('idioma', v);
    window.dispatchEvent(new CustomEvent('aun:idioma', { detail: v }));
    return v;
  };

  A.modo = function (v) {
    var html = document.documentElement;
    if (v === undefined) return html.getAttribute('data-modo') || 'noche';
    html.setAttribute('data-modo', v);
    A.pref('modo', v);
    marcar('modo', v);
    window.dispatchEvent(new CustomEvent('aun:modo', { detail: v }));
    return v;
  };

  /* ---------- 7. arranque ---------- */

  function entradas() {
    if (!('IntersectionObserver' in window)) {
      Array.prototype.forEach.call(document.querySelectorAll('.aparece'), function (n) { n.classList.add('dentro'); });
      return;
    }
    var io = new IntersectionObserver(function (filas) {
      filas.forEach(function (f) {
        if (f.isIntersecting) { f.target.classList.add('dentro'); io.unobserve(f.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    Array.prototype.forEach.call(document.querySelectorAll('.aparece'), function (n) { io.observe(n); });
  }

  A.arrancar = function () {
    document.addEventListener('click', function (ev) {
      var b = ev.target.closest ? ev.target.closest('[data-accion]') : null;
      if (!b) return;
      var accion = b.getAttribute('data-accion'), valor = b.getAttribute('data-valor');
      if (accion === 'idioma') { ev.preventDefault(); A.idioma(valor); }
      else if (accion === 'modo') {
        ev.preventDefault();
        A.modo(valor || (A.modo() === 'noche' ? 'papel' : 'noche'));
      }
    });
    marcar('idioma', A.idioma());
    marcar('modo', A.modo());
    entradas();

    /* g = guardar el primer lienzo (para grabado, plotter, impresion) */
    document.addEventListener('keydown', function (ev) {
      if (ev.key !== 'g' || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      var t = ev.target.tagName;
      if (t === 'INPUT' || t === 'TEXTAREA') return;
      var c = document.querySelector('canvas.lienzo');
      if (c) A.guardar(c, 'aun-' + (document.body.getAttribute('data-obra') || 'lienzo') + '-' + A.idioma());
    });
  };

  /* aplicacion temprana de preferencias (evita el destello) */
  A.temprano = function () {
    var html = document.documentElement,
        i = null, m = null;
    try { i = localStorage.getItem('aun:idioma'); m = localStorage.getItem('aun:modo'); } catch (e) {}
    if (!i) i = (navigator.language || 'es').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';
    html.setAttribute('data-idioma', i);
    html.setAttribute('lang', i);
    html.setAttribute('data-modo', m || 'noche');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', A.arrancar);
  } else {
    A.arrancar();
  }

  return A;
}());
