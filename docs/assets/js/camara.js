/* ============================================================
   CAMARA — acceso restringido sin servidor
   ------------------------------------------------------------
   El texto no se esconde: se sella. La cifra queda a la vista,
   publica, ilegible. La llave se entrega a mano, fuera del sitio.
   AES-GCM 256 + PBKDF2-SHA256. Todo ocurre en el navegador:
   la frase de paso nunca viaja.

   Honestidad tecnica (ver POETICA.md, fase 2): esto protege
   frente a un lector casual y frente a los buscadores, no frente
   a un atacante con tiempo y una frase de paso debil. El acceso
   por persona, revocable, llega con la fase dinamica.
   ============================================================ */
(function () {
  'use strict';
  var ITER = 310000,
      enc = new TextEncoder(),
      dec = new TextDecoder();

  function subtle() {
    return (window.crypto && window.crypto.subtle) ? window.crypto.subtle : null;
  }

  function aB64(bytes) {
    var s = '', i;
    for (i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }

  function deB64(b64) {
    var s = atob(String(b64).replace(/\s+/g, '')), a = new Uint8Array(s.length), i;
    for (i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }

  function llave(frase, salt, it, usos) {
    return subtle().importKey('raw', enc.encode(frase), 'PBKDF2', false, ['deriveKey'])
      .then(function (km) {
        return subtle().deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: it, hash: 'SHA-256' },
          km, { name: 'AES-GCM', length: 256 }, false, usos);
      });
  }

  function sellar(texto, frase) {
    var salt = crypto.getRandomValues(new Uint8Array(16)),
        iv = crypto.getRandomValues(new Uint8Array(12));
    return llave(frase, salt, ITER, ['encrypt']).then(function (k) {
      return subtle().encrypt({ name: 'AES-GCM', iv: iv }, k, enc.encode(texto));
    }).then(function (ct) {
      return {
        v: 1, kdf: 'PBKDF2-SHA256', it: ITER,
        salt: aB64(salt), iv: aB64(iv), ct: aB64(new Uint8Array(ct))
      };
    });
  }

  function abrir(sello, frase) {
    return llave(frase, deB64(sello.salt), sello.it || ITER, ['decrypt'])
      .then(function (k) {
        return subtle().decrypt({ name: 'AES-GCM', iv: deB64(sello.iv) }, k, deB64(sello.ct));
      })
      .then(function (pt) { return dec.decode(pt); });
  }

  /* --- el texto abierto se compone con las mismas reglas R1 --- */
  function componer(texto, destino) {
    var parrafos = String(texto).replace(/\r\n/g, '\n').split(/\n\s*\n/), n = 0;
    destino.textContent = '';
    parrafos.forEach(function (p) {
      var t = p.trim();
      if (!t) return;
      if (t.charAt(0) === '#') {
        var h = document.createElement('h2');
        h.textContent = t.replace(/^#+\s*/, '');
        destino.appendChild(h);
        return;
      }
      if (/^(alonso|a\.)\b/i.test(t) && t.length < 80) {
        var f = document.createElement('p');
        f.className = 'firma';
        t.split('\n').forEach(function (l, i) {
          if (i) f.appendChild(document.createElement('br'));
          f.appendChild(document.createTextNode(l.trim()));
        });
        destino.appendChild(f);
        return;
      }
      AUN.oraciones(t).forEach(function (frase) {
        n += 1;
        var e = document.createElement('p');
        e.className = 'o';
        e.setAttribute('data-tipo', AUN.clasificar(frase));
        e.setAttribute('data-n', String(n));
        e.textContent = frase;
        destino.appendChild(e);
      });
    });
    return n;
  }

  AUN.camara = {
    sellar: sellar,
    abrir: abrir,
    componer: componer,
    disponible: function () { return !!subtle(); }
  };

  /* ---------------- umbral de la camara ---------------- */
  var forma = document.getElementById('umbral');
  if (!forma) return;

  var campo = document.getElementById('frase'),
      aviso = document.getElementById('aviso'),
      cuerpo = document.getElementById('abierto'),
      cifra = document.getElementById('cifra'),
      fuente = document.getElementById('sello'),
      sello = null;

  function decir(m) { if (aviso) aviso.textContent = m; }

  try { sello = fuente ? JSON.parse(fuente.textContent) : null; }
  catch (e) { sello = null; }

  if (cifra && sello && sello.ct) cifra.textContent = sello.ct;

  if (!sello || !sello.ct) {
    decir(AUN.idioma() === 'es' ? 'no hay texto sellado todavia' : 'no sealed text yet');
    forma.setAttribute('hidden', '');
  } else if (!AUN.camara.disponible()) {
    decir(AUN.idioma() === 'es' ? 'este navegador no puede abrir la camara'
                               : 'this browser cannot open the chamber');
    forma.setAttribute('hidden', '');
  }

  function entrar(frase, silencio) {
    if (!frase || !sello) return;
    decir(AUN.idioma() === 'es' ? 'abriendo...' : 'opening...');
    abrir(sello, frase).then(function (texto) {
      componer(texto, cuerpo);
      cuerpo.removeAttribute('hidden');
      forma.setAttribute('hidden', '');
      if (cifra) cifra.setAttribute('hidden', '');
      decir('');
      try { sessionStorage.setItem('aun:llave', frase); } catch (e) {}
      var lienzo = document.getElementById('lienzo-camara');
      if (lienzo && AUN.obra001) {
        lienzo.removeAttribute('hidden');   /* medir exige estar visible */
        AUN.lienzo(lienzo, AUN.obra001, { clave: 'camara', dur: 26 });
      }
    }).catch(function () {
      if (silencio) { decir(''); return; }
      decir(AUN.idioma() === 'es' ? 'la llave no abre' : 'the key does not open');
      if (campo) { campo.value = ''; campo.focus(); }
    });
  }

  forma.addEventListener('submit', function (ev) {
    ev.preventDefault();
    entrar(campo ? campo.value : '', false);
  });

  /* si ya se abrio en esta sesion, no se vuelve a preguntar */
  try {
    var previa = sessionStorage.getItem('aun:llave');
    if (previa && sello && sello.ct) entrar(previa, true);
  } catch (e) {}
}());
