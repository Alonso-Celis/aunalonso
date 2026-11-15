/* =============================================================
   AUN · taller · SuperCollider
   aun_voz.scd — obra 001 para el oido
   Alonso Celis, Paris 2026
   -------------------------------------------------------------
   Las mismas reglas (R1) en el tiempo:

     negacion   un filtro que se abre y se lleva parciales.
                Quita. Deja una cola de silencio.
     adicion    un parcial que entra y NO se va.
                "tu voz que no cesa desde entonces".
     giro       la unica entrada franca de amplitud, y dos
                frecuencias en razon aurea: los dos ojos.

   La semilla es el mismo hash que usa el navegador (FNV-1a 32
   bits), asi que la pieza es siempre la misma pieza. Un aviso
   honesto: sclang cuenta bytes y el navegador cuenta unidades
   UTF-16, y este texto va transliterado sin acentos — la semilla
   de aqui no coincide con la de la pantalla. Misma regla, hermana
   distinta (R6).
   Nada se repite en bucle: la lectura ocurre una vez, decae y
   se libera.

   Uso: abrir en SuperCollider, evaluar bloque por bloque
   (Ctrl+Enter dentro de cada parentesis).
   ============================================================= */

// ---------- 1. arranque ----------
(
s.options.numOutputBusChannels = 2;
s.waitForBoot({
    "AUN · voz 001 · servidor en pie".postln;
});
)

// ---------- 2. el hash del texto: identico al del navegador ----------
(
~fnv1a = { |cadena|
    var h = 0x811c9dc5;
    cadena.ascii.do { |c|
        h = h bitXor: c;
        h = h * 0x01000193;          // desborda a 32 bits, como en JS
    };
    h;
};

~texto = "No todo se trata del reciente corte de cabello purpura. "
    ++ "No todo se trata de la mirada que por instantes se clava en el lente de la camara con la certeza de que el espectador se queda sin palabras. "
    ++ "No todo se trata de la perfecta chaqueta oscura. "
    ++ "No todo se trata de eso. "
    ++ "Tambien es el encuentro inesperado de dias atras. "
    ++ "Tambien es la conversacion breve frente a una artista. "
    ++ "Tambien es tu voz que no cesa desde entonces. "
    ++ "No todo se trata de esto pero si, tambien es esto lo que yo veo en la imagen, tu cabello purpura, tu perfecta chaqueta negra, tus ojos en el lugar exacto y la remembranza nitida de tu voz.";

~semilla = ~fnv1a.(~texto).abs;
~semilla.postln;
)

// ---------- 3. la tabla de reglas: una oracion, un tipo ----------
(
~clasificar = { |frase|
    var b = frase.toLower;
    case
    { b.contains("pero si") } { \giro }
    { b.beginsWith("no todo") or: { b.beginsWith("no ") } } { \neg }
    { b.beginsWith("tambien") } { \ad }
    { true } { \resto };
};

~oraciones = ~texto.split($.)
    .collect({ |f| f.stripWhiteSpace })
    .select({ |f| f.size > 1 })
    .collect({ |f|
        (
            txt: f,
            tipo: ~clasificar.(f),
            letras: f.select({ |c| c.isAlpha }).size,
            palabras: f.split($ ).size
        )
    });

~oraciones.do { |o, i| ("  " ++ i ++ "  " ++ o[\tipo] ++ "  " ++ o[\palabras] ++ " palabras").postln };
)

// ---------- 4. instrumentos ----------
(
// un parcial que entra y no se va: se libera solo al final de la pieza
SynthDef(\aunParcial, { |out = 0, freq = 110, amp = 0.06, pan = 0, ataque = 6, corte = 2400|
    var env = EnvGen.kr(Env.asr(ataque, 1, 12, \sine), \puerta.kr(1), doneAction: 2);
    var son = SinOsc.ar(freq, 0, 0.6)
        + (SinOsc.ar(freq * 2.005, 0, 0.16) * LFNoise2.kr(0.07).range(0.2, 1))
        + (SinOsc.ar(freq * 3.01, 0, 0.05));
    son = son * LFNoise2.kr(0.05).range(0.7, 1.0);
    son = LPF.ar(son, corte);
    Out.ar(out, Pan2.ar(son * env * amp, pan + LFNoise2.kr(0.03).range(-0.15, 0.15)));
}).add;

// el lecho: ruido de fondo, lo que esta antes de toda oracion
SynthDef(\aunLecho, { |out = 0, amp = 0.05, corte = 900, res = 0.35|
    var env = EnvGen.kr(Env.asr(14, 1, 18, \sine), \puerta.kr(1), doneAction: 2);
    var son = RLPF.ar(PinkNoise.ar([1, 1]) * 0.5, Lag.kr(corte, 2), res);
    Out.ar(out, son * env * amp);
}).add;

// la negacion: se lleva parciales. Barrido que quita, no que suma.
SynthDef(\aunNegacion, { |out = 0, dur = 7, amp = 0.09, centro = 700, ancho = 4|
    var env = EnvGen.kr(Env.new([0, 1, 0.7, 0], [dur * 0.35, dur * 0.3, dur * 0.35], \sine), doneAction: 2);
    var barrido = XLine.kr(centro * ancho, centro / ancho, dur);
    var son = BPF.ar(GrayNoise.ar([1, 1]), barrido, 0.6) * 3;
    Out.ar(out, son * env * amp);
}).add;

// el giro: la unica entrada franca
SynthDef(\aunGiro, { |out = 0, freq = 220, amp = 0.14, dur = 26|
    var phi = 0.6180339887;
    var env = EnvGen.kr(Env.new([0, 1, 0.55, 0], [1.2, dur * 0.5, dur * 0.5], \sine), doneAction: 2);
    var son = Mix([
        SinOsc.ar(freq, 0, 0.5),
        SinOsc.ar(freq * (1 + phi), 0, 0.3),     // un ojo
        SinOsc.ar(freq * (2 - phi), 0, 0.3)      // el otro
    ]);
    son = son + (BPF.ar(PinkNoise.ar, freq * 4, 0.3) * 0.12);
    Out.ar(out, Pan2.ar(son * env * amp, 0));
}).add;
)

// ---------- 5. la lectura: ocurre una vez ----------
(
Routine({
    var abiertos = List.new;
    var lecho, base, r;

    thisThread.randSeed = ~semilla;      // determinismo: misma pieza siempre
    r = { rrand(0.0, 1.0) };
    base = 55 * (2 ** ((~semilla % 7) / 12));   // la fundamental sale del texto

    "— lectura 001 —".postln;
    lecho = Synth(\aunLecho, [\amp, 0.045, \corte, 700]);
    6.wait;

    ~oraciones.do { |o, i|
        var peso = (o[\palabras] / 22).clip(0.15, 1.0);
        var dur = 3 + (o[\letras] / 26);

        switch(o[\tipo],
            \neg, {
                // quita: el barrido se lleva lo que hay, y el lecho se cierra
                Synth(\aunNegacion, [\dur, dur, \amp, 0.05 + (0.06 * peso), \centro, base * 12]);
                lecho.set(\corte, 380 + (600 * r.value));
                abiertos.do { |n| n.set(\amp, 0.03 + (0.02 * r.value)) };
            },
            \ad, {
                // deposita: un parcial mas, y no se retira
                var grado = [0, 3, 7, 10, 14].wrapAt(i);
                var voz = Synth(\aunParcial, [
                    \freq, base * (2 ** (grado / 12)),
                    \amp, 0.035 + (0.045 * peso),
                    \pan, r.value * 2 - 1,
                    \ataque, 4 + (6 * r.value),
                    \corte, 1800 + (2200 * peso)
                ]);
                abiertos.add(voz);
                lecho.set(\corte, 900 + (700 * peso));
            },
            \giro, {
                // la unica entrada franca de amplitud
                Synth(\aunGiro, [\freq, base * 4, \amp, 0.13, \dur, 26]);
                abiertos.do { |n| n.set(\amp, 0.06) };
            },
            \resto, {
                lecho.set(\corte, 600 + (400 * r.value));
            }
        );

        ("  " ++ o[\tipo] ++ "  ->  " ++ dur.round(0.1) ++ " s").postln;
        dur.wait;
    };

    // la cola: nada se corta, todo decae. Y se detiene.
    "— cola —".postln;
    30.wait;
    abiertos.do { |n| n.set(\puerta, 0) };
    lecho.set(\puerta, 0);
    20.wait;
    "— fin. no hay bucle. —".postln;
}).play;
)

// ---------- 6. parar a mano si hace falta ----------
// CmdPeriod.run;
