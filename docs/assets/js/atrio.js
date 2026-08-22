/* ============================================================
   ATRIO — el archivo como campo
   ------------------------------------------------------------
   R2: la pagina es el dato. Este dibujo no lee un texto: lee el
   indice. Cada entrada del corpus deja un estrato. Los textos con
   obra construida depositan; los sellados aparecen como cifra;
   los demas son solo linea. Nada gira en bucle: se sedimenta.
   ============================================================ */
(function () {
  'use strict';
  if (typeof AUN === 'undefined') return;

  var PHI = 0.6180339887;

  /* partitura propia: el indice del atrio */
  function leerCorpus() {
    var filas = document.querySelectorAll('.corpus li'), oraciones = [], texto = '';
    Array.prototype.forEach.call(filas, function (li) {
      var t = li.querySelector('.t'), m = li.querySelector('.meta'),
          s = ((t && t.textContent) || '').replace(/\s+/g, ' ').trim(),
          meta = ((m && m.textContent) || '').trim(),
          tipo = li.hasAttribute('data-sellado') ? 'neg'
               : (li.hasAttribute('data-obra') ? 'ad' : 'resto');
      if (!s) return;
      oraciones.push(AUN.medir(s + ' ' + meta, tipo));
      texto += s + ' ';
    });
    return {
      lang: document.documentElement.getAttribute('data-idioma') || 'es',
      texto: texto.trim() || 'aun',
      oraciones: oraciones
    };
  }

  function sketch(esc) {
    var G = [], os = esc.oraciones, pal = esc.paleta,
        tinta = pal.papelMode ? '#14131a' : pal.hueso,
        acento = pal.acento, luz = pal.papelMode ? acento : pal.luz,
        w = esc.w, h = esc.h, min = esc.min, N = esc.ruido, R = esc.rand,
        n = Math.max(1, os.length);

    function g(t, d) { G.push({ t: t, dibujar: d }); }

    /* eje aureo unico: el archivo esta construido */
    g(0.002, function (c) {
      c.strokeStyle = AUN.rgba(tinta, 0.06);
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(Math.round(w * PHI) + 0.5, 0);
      c.lineTo(Math.round(w * PHI) + 0.5, h);
      c.stroke();
    });

    /* niebla baja: el fondo del archivo */
    for (var k = 0; k < 14; k++) {
      (function (k) {
        var sr = AUN.rng((esc.semilla + 104729 * (k + 1)) >>> 0);
        g(0.01 + 0.18 * (k / 14), function (c) {
          c.globalCompositeOperation = 'lighter';
          for (var i = 0; i < 46; i++) {
            var x = sr() * w, y = sr() * h,
                v = N.fbm(x * 0.0016, y * 0.0016, 4),
                arr = 1 - Math.min(1, y / h);
            AUN.mancha(c, x, y, min * (0.02 + 0.13 * v * v),
                       sr() < 0.12 + 0.3 * arr ? acento : tinta,
                       0.004 + 0.016 * v);
          }
        });
      }(k));
    }

    /* un estrato por entrada del corpus */
    os.forEach(function (o, i) {
      /* cada entrada trae su propio azar, derivado de su titulo */
      var r = AUN.rng(o.semilla),
          y = h * (0.12 + 0.76 * ((i + 0.5) / n)),
          largo = w * (0.16 + 0.62 * Math.min(1, o.letras / 46)),
          x0 = w * 0.06 + (o.semilla % 97) / 97 * w * 0.1,
          t0 = 0.22 + 0.66 * (i / n);

      g(t0, function (c) {
        var x, py, primero = true;
        c.globalCompositeOperation = 'source-over';
        c.strokeStyle = AUN.rgba(tinta, o.tipo === 'resto' ? 0.1 : 0.2);
        c.lineWidth = o.tipo === 'ad' ? 1 : 0.6;
        c.beginPath();
        for (x = x0; x <= x0 + largo; x += 6) {
          py = y + (N.fbm(x * 0.005, y * 0.01 + i, 3) - 0.5) * min * 0.012;
          if (primero) { c.moveTo(x, py); primero = false; } else { c.lineTo(x, py); }
        }
        c.stroke();
      });

      if (o.tipo === 'ad') {
        g(t0 + 0.02, function (c) {
          c.globalCompositeOperation = 'lighter';
          for (var j = 0; j < 90; j++) {
            var x = x0 + largo * (0.55 + 0.45 * r()) + AUN.gauss(r) * w * 0.05;
            AUN.filamento(c, x, y + AUN.gauss(r) * min * 0.05,
                          min * (0.01 + 0.05 * r()), N, esc,
                          r() < 0.3 ? luz : acento, 0.05 + 0.1 * r(), 0.35 + r() * 0.7);
          }
          AUN.mancha(c, x0 + largo, y, min * 0.05, acento, 0.07);
        });
      }

      if (o.tipo === 'neg') {
        g(t0 + 0.02, function (c) {
          c.globalCompositeOperation = 'destination-out';
          AUN.banda(c, y, min * (0.02 + 0.05 * r()), '#000000', 0.5, w);
        });
      }
    });

    g(0.96, function (c) {
      c.globalCompositeOperation = 'lighter';
      AUN.grano(c, esc, Math.round(min * 1.6), tinta, 0.045);
    });
    g(0.99, function (c) {
      var d = Math.max(w, h),
          gr = c.createRadialGradient(w * 0.42, h * 0.4, min * 0.2, w * 0.42, h * 0.4, d * 0.8);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(0.7, 'rgba(0,0,0,.22)');
      gr.addColorStop(1, 'rgba(0,0,0,.8)');
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
    });

    return G;
  }

  AUN.atrio = sketch;

  var el = document.getElementById('lienzo-atrio');
  if (el) AUN.lienzo(el, sketch, { clave: 'atrio', dur: 24, partitura: leerCorpus });
}());
