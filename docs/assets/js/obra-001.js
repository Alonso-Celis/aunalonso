/* ============================================================
   OBRA 001 — "No todo se trata" / "Not everything is about"
   Alonso, Paris 2026
   ------------------------------------------------------------
   Reglas del dibujo (R1 aplicada a este texto):

     La imagen     un lavado de ruido: la fotografia como fondo.
     La negacion   BORRA. Cada oracion que empieza "No todo se trata"
                   se dibuja en destination-out: una banda que quita
                   lo depositado. Deja un residuo: una linea fina en
                   el borde — lo que la negacion no logra borrar.
     La adicion    DEPOSITA. Cada "Tambien es" siembra un campo de
                   filamentos purpura: la voz que no cesa.
     El giro       "...pero si, tambien es esto lo que yo veo":
                   vuelve a depositar, y fija los dos ojos en los
                   ejes 0.382 / 0.618 — "en el lugar exacto".
     El orden      es el orden de lectura. La altura de cada gesto es
                   la posicion de su oracion en el texto, medida en
                   letras. La imagen es, literalmente, una lectura.

   Mismo texto = misma imagen. ES y EN son hermanas, no copias.
   ============================================================ */
(function () {
  'use strict';
  if (typeof AUN === 'undefined') return;

  var PHI = 0.6180339887;

  /* --- posicion de cada oracion en el campo, medida en letras --- */
  function preparar(esc) {
    var os = esc.oraciones, total = 0, acum = 0, i, o;
    for (i = 0; i < os.length; i++) total += os[i].letras + 1;
    if (!total) total = 1;
    for (i = 0; i < os.length; i++) {
      o = os[i];
      o.i = i;
      o.p0 = acum / total;
      acum += o.letras + 1;
      o.p1 = acum / total;
      o.pc = (o.p0 + o.p1) / 2;
      o.y = esc.h * (0.08 + 0.84 * o.pc);
      o.alto = Math.max(esc.h * 0.04, esc.h * 0.84 * (o.p1 - o.p0));
      o.r = AUN.rng(o.semilla);
    }
    return os;
  }

  function sketch(esc) {
    var G = [], os = preparar(esc),
        pal = esc.paleta,
        tinta = pal.papelMode ? '#14131a' : pal.hueso,
        acento = pal.acento, luz = pal.papelMode ? acento : pal.luz,
        w = esc.w, h = esc.h, min = esc.min,
        ejeA = w * (1 - PHI), ejeB = w * PHI,
        horizonte = h * (1 - PHI) * 0.92,
        R = esc.rand, N = esc.ruido;

    function g(t, dibujar) { G.push({ t: t, dibujar: dibujar }); }

    /* ---------- 0. ejes: la composicion se declara construida ---------- */
    g(0.005, function (c) {
      c.globalCompositeOperation = 'source-over';
      c.strokeStyle = AUN.rgba(tinta, 0.07);
      c.lineWidth = 1;
      [ejeA, ejeB].forEach(function (x) {
        c.beginPath(); c.moveTo(Math.round(x) + 0.5, 0); c.lineTo(Math.round(x) + 0.5, h); c.stroke();
      });
      c.beginPath();
      c.moveTo(0, Math.round(horizonte) + 0.5); c.lineTo(w, Math.round(horizonte) + 0.5); c.stroke();
    });

    /* ---------- 1. la imagen: lavado de ruido ---------- */
    var CAPAS = 22;
    for (var k = 0; k < CAPAS; k++) {
      (function (k) {
        var semilla = AUN.rng((esc.semilla ^ (k * 2654435761)) >>> 0);
        g(0.01 + 0.13 * (k / CAPAS), function (c) {
          c.globalCompositeOperation = 'lighter';
          var n = 90, i, x, y, r, v, arriba, col;
          for (i = 0; i < n; i++) {
            x = semilla() * w;
            y = semilla() * h;
            v = N.fbm(x * 0.0022, y * 0.0022, 4);
            r = min * (0.012 + 0.075 * v * v);
            arriba = 1 - Math.min(1, y / (h * 0.42));
            col = (semilla() < 0.18 + 0.5 * arriba) ? acento : tinta;
            AUN.mancha(c, x, y, r, col, 0.006 + 0.026 * v * (0.4 + 0.6 * arriba));
          }
        });
      }(k));
    }

    /* ---------- 2. la chaqueta: un negro apenas distinto ---------- */
    g(0.15, function (c) {
      var cx = w * (0.5 + (R() - 0.5) * 0.1),
          cy = h * 0.68,
          aw = w * (0.42 + R() * 0.2),
          ah = h * 0.46,
          sesgo = (R() - 0.5) * aw * 0.22;
      c.globalCompositeOperation = 'lighter';
      c.beginPath();
      c.moveTo(cx - aw / 2 + sesgo, cy - ah / 2);
      c.lineTo(cx + aw / 2 + sesgo * 0.4, cy - ah / 2 + ah * 0.06);
      c.lineTo(cx + aw / 2 * 1.06, cy + ah / 2);
      c.lineTo(cx - aw / 2 * 1.02, cy + ah / 2);
      c.closePath();
      c.fillStyle = AUN.rgba(tinta, 0.028);
      c.fill();
      c.strokeStyle = AUN.rgba(tinta, 0.06);
      c.lineWidth = 1;
      c.stroke();
      /* la solapa: una diagonal exacta */
      c.beginPath();
      c.moveTo(cx + sesgo * 0.2, cy - ah / 2 + ah * 0.04);
      c.lineTo(cx - aw * 0.18, cy + ah / 2);
      c.strokeStyle = AUN.rgba(tinta, 0.09);
      c.stroke();
    });

    /* ---------- 3. el cabello purpura: onda alta ---------- */
    for (var m = 0; m < 9; m++) {
      (function (m) {
        var sr = AUN.rng((esc.semilla + 7919 * (m + 1)) >>> 0);
        g(0.18 + 0.1 * (m / 9), function (c) {
          var y0 = h * (0.06 + 0.055 * m / 9) + sr() * h * 0.02,
              amp = h * (0.02 + 0.05 * sr()),
              fase = sr() * 100, x, y, primero = true;
          c.globalCompositeOperation = 'lighter';
          c.strokeStyle = AUN.rgba(m % 3 === 0 ? luz : acento, 0.05 + 0.07 * sr());
          c.lineWidth = 0.5 + sr() * 1.7;
          c.beginPath();
          for (x = -20; x <= w + 20; x += 6) {
            y = y0 + (N.fbm(x * 0.0018 + fase, y0 * 0.004 + fase, 4) - 0.5) * amp * 2;
            if (primero) { c.moveTo(x, y); primero = false; } else { c.lineTo(x, y); }
          }
          c.stroke();
        });
      }(m));
    }

    /* ---------- 4. las negaciones borran ---------- */
    var negs = os.filter(function (o) { return o.tipo === 'neg'; }),
        adds = os.filter(function (o) { return o.tipo === 'ad'; }),
        giros = os.filter(function (o) { return o.tipo === 'giro'; }),
        T_NEG = [0.30, 0.56], T_AD = [0.56, 0.84], REB = 6;

    negs.forEach(function (o, j) {
      var t0 = T_NEG[0] + (T_NEG[1] - T_NEG[0]) * (j / Math.max(1, negs.length)),
          t1 = T_NEG[0] + (T_NEG[1] - T_NEG[0]) * ((j + 1) / Math.max(1, negs.length)),
          fuerza = 0.34 + 0.5 * Math.min(1, o.palabras / 22);
      for (var s = 0; s < REB; s++) {
        (function (s) {
          g(t0 + (t1 - t0) * (s / REB), function (c) {
            var frac = (s + 1) / REB,
                alto = o.alto * (0.55 + 1.1 * o.r()) * frac,
                y = o.y + (o.r() - 0.5) * o.alto * 0.5;
            c.globalCompositeOperation = 'destination-out';
            AUN.banda(c, y, alto, '#000000', fuerza * (0.35 + 0.65 * frac) / REB * 2.2, w);
            /* huecos irregulares: la negacion no borra parejo */
            for (var i = 0; i < 5; i++) {
              AUN.mancha(c, o.r() * w, y + (o.r() - 0.5) * alto,
                         min * (0.03 + 0.11 * o.r()), '#000000', 0.12 * fuerza);
            }
          });
        }(s));
      }
      /* residuo: lo que la negacion no logra borrar */
      g(t1 - 0.004, function (c) {
        var y = o.y - o.alto * 0.42, x, py, primero = true;
        c.globalCompositeOperation = 'source-over';
        c.strokeStyle = AUN.rgba(tinta, 0.16 + 0.12 * o.r());
        c.lineWidth = 0.7;
        c.beginPath();
        for (x = 0; x <= w; x += 5) {
          py = y + (N.fbm(x * 0.006, y * 0.02 + j, 3) - 0.5) * min * 0.02;
          if (primero) { c.moveTo(x, py); primero = false; } else { c.lineTo(x, py); }
        }
        c.stroke();
      });
    });

    /* ---------- 5. las adiciones depositan: la voz ---------- */
    adds.forEach(function (o, j) {
      var t0 = T_AD[0] + (T_AD[1] - T_AD[0]) * (j / Math.max(1, adds.length)),
          t1 = T_AD[0] + (T_AD[1] - T_AD[0]) * ((j + 1) / Math.max(1, adds.length)),
          centro = [ejeA, w * 0.5, ejeB][j % 3],
          disp = w * (0.06 + 0.1 * (j + 1) / adds.length),
          hilos = Math.max(40, Math.round(o.palabras * 9)),
          TR = 10, porTramo = Math.ceil(hilos / TR);
      for (var s = 0; s < TR; s++) {
        (function (s) {
          g(t0 + (t1 - t0) * (s / TR), function (c) {
            c.globalCompositeOperation = 'lighter';
            for (var i = 0; i < porTramo; i++) {
              var x = centro + AUN.gauss(o.r) * disp,
                  y = o.y + (o.r() - 0.5) * o.alto * 1.15,
                  largo = min * (0.02 + 0.12 * o.r() * o.r()),
                  col = o.r() < 0.28 ? luz : acento,
                  a = 0.05 + 0.16 * o.r() * (0.35 + 0.65 * (s / TR));
              AUN.filamento(c, x, y, largo, N, esc, col, a, 0.35 + o.r() * 1.0);
            }
          });
        }(s));
      }
      /* nucleo de la voz */
      g(t1 - 0.006, function (c) {
        c.globalCompositeOperation = 'lighter';
        AUN.mancha(c, centro + AUN.gauss(o.r) * disp * 0.3, o.y,
                   min * (0.05 + 0.06 * o.r()), acento, 0.1);
      });
    });

    /* ---------- 6. el giro: los ojos en el lugar exacto ---------- */
    var tG = 0.85;
    g(tG, function (c) {
      c.globalCompositeOperation = 'lighter';
      /* reaparicion del campo purpura, mas alto y mas cerrado */
      for (var i = 0; i < 220; i++) {
        var x = w * 0.5 + AUN.gauss(R) * w * 0.26,
            y = horizonte + AUN.gauss(R) * h * 0.1;
        AUN.filamento(c, x, y, min * (0.01 + 0.05 * R()), N, esc,
                      R() < 0.4 ? luz : acento, 0.05 + 0.1 * R(), 0.4 + R() * 0.8);
      }
    });

    /* los ojos: pequenos, precisos, altos */
    [ejeA, ejeB].forEach(function (x, i) {
      g(tG + 0.03 + i * 0.02, function (c) {
        var y = horizonte, rr = min * 0.008;
        c.globalCompositeOperation = 'lighter';
        AUN.mancha(c, x, y, min * 0.07, luz, 0.1);
        c.fillStyle = AUN.rgba(tinta, 0.85);
        c.beginPath(); c.arc(x, y, rr, 0, Math.PI * 2); c.fill();
        c.strokeStyle = AUN.rgba(luz, 0.5);
        c.lineWidth = 0.8;
        c.beginPath(); c.arc(x, y, rr * 3.4, 0, Math.PI * 2); c.stroke();
        /* la mirada que se clava en el lente */
        c.strokeStyle = AUN.rgba(luz, 0.14);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + (i ? 1 : -1) * min * 0.16, y + min * 0.02); c.stroke();
      });
    });

    /* la remembranza: una banda clara, la unica luz franca */
    g(tG + 0.08, function (c) {
      var o = giros[0] || os[os.length - 1] || { y: h * 0.5, alto: h * 0.06, r: R };
      c.globalCompositeOperation = 'lighter';
      AUN.banda(c, o.y, Math.max(min * 0.02, o.alto * 0.5), tinta, 0.06, w);
      AUN.banda(c, o.y, Math.max(min * 0.006, o.alto * 0.12), luz, 0.05, w);
    });

    /* ---------- 7. grano y vinieta ---------- */
    g(0.97, function (c) {
      c.globalCompositeOperation = 'lighter';
      AUN.grano(c, esc, Math.round(min * 2.2), tinta, 0.05);
      AUN.grano(c, esc, Math.round(min * 0.5), acento, 0.07);
    });
    g(0.99, function (c) {
      var d = Math.max(w, h);
      var gr = c.createRadialGradient(w / 2, h * 0.46, min * 0.18, w / 2, h * 0.46, d * 0.78);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(0.72, 'rgba(0,0,0,.28)');
      gr.addColorStop(1, 'rgba(0,0,0,.85)');
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
    });

    return G;
  }

  AUN.obra001 = sketch;

  var el = document.getElementById('lienzo-001');
  if (el) AUN.lienzo(el, sketch, { clave: 'obra-001', dur: 30 });
}());
