/* ============================================================
   LECTOR — cualquier texto del archivo, con las reglas R1
   ------------------------------------------------------------
   leer/?t=habito_18-08-2024.md
   Trae el .md del archivo, lo compone (una oracion, una linea,
   con su tipo declarado) y deja que el dibujo lo lea (R2).
   Asi un texto no necesita pagina propia para tener forma:
   la obra construida a mano es un privilegio, no un requisito.

   Requiere http (fetch): en local, python -m http.server.
   ============================================================ */
(function () {
  'use strict';
  if (typeof AUN === 'undefined') return;

  var VALIDO = /^[\w\-.]+\.md$/,
      aviso = document.getElementById('aviso'),
      cuerpo = document.getElementById('abierto'),
      titulo = document.getElementById('titulo'),
      fuente = document.getElementById('fuente'),
      es = AUN.idioma() === 'es';

  function decir(m) { if (aviso) aviso.textContent = m; }

  function nombreDe(archivo) {
    return archivo.replace(/\.(es|en|fr)?\.?md$/, '')
                  .replace(/_(\d{2}-\d{2}-\d{4}|\d{4}|date-inconnue)$/, '')
                  .replace(/_/g, ' ').trim();
  }

  function fechaDe(archivo) {
    var m = archivo.match(/_(\d{2}-\d{2}-\d{4}|\d{4}|date-inconnue)\./);
    return m ? m[1].replace(/-/g, '.') : '';
  }

  var q = (location.search || '').match(/[?&]t=([^&]+)/),
      archivo = q ? decodeURIComponent(q[1]) : '';

  if (!VALIDO.test(archivo)) {
    decir(es ? 'falta el texto: leer/?t=archivo.md' : 'missing text: leer/?t=file.md');
    return;
  }

  decir(es ? 'abriendo el texto...' : 'opening the text...');

  fetch('../' + archivo, { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    })
    .then(function (crudo) {
      var lineas = crudo.replace(/\r\n/g, '\n').split('\n'), t = '';
      if (lineas.length && lineas[0].charAt(0) === '#') {
        t = lineas.shift().replace(/^#+\s*/, '').trim();
      }
      if (!t) t = nombreDe(archivo);

      if (titulo) titulo.textContent = t;
      document.title = t + ' — AUN';
      if (fuente) {
        fuente.textContent = archivo;
        fuente.setAttribute('href', '../' + archivo);
      }
      var fecha = document.getElementById('fecha');
      if (fecha) fecha.textContent = fechaDe(archivo);

      AUN.camara.componer(lineas.join('\n'), cuerpo);
      cuerpo.removeAttribute('hidden');
      decir('');

      var lienzo = document.getElementById('lienzo-lector');
      if (lienzo && AUN.obra001) {
        lienzo.removeAttribute('hidden');
        AUN.lienzo(lienzo, AUN.obra001, { clave: 'lector:' + archivo, dur: 26 });
      }
    })
    .catch(function () {
      decir(es ? 'no se pudo abrir «' + archivo + '» (fetch necesita http, no file://)'
               : 'could not open "' + archivo + '" (fetch needs http, not file://)');
    });
}());
