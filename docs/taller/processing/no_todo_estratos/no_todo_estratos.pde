/* =============================================================
   AUN · taller · Processing
   no_todo_estratos — obra 001 para el papel
   Alonso Celis, Paris 2026
   -------------------------------------------------------------
   Las mismas reglas que en la pantalla (R1), traducidas al papel:
   el hash del texto es la semilla y el generador de azar es el
   mismo (FNV-1a + mulberry32) sobre las mismas unidades UTF-16,
   asi que un texto da siempre su composicion y no otra, aqui y
   en el navegador. Los acentos van escapados (\u00xx) para
   que ningun editor cambie un solo byte: un byte distinto es otra
   semilla, y por lo tanto otra obra.

   Una traduccion de medio, y solo una: en pantalla la negacion
   BORRA (destination-out sobre negro). En papel no se puede
   quitar tinta, asi que la negacion se dibuja con el color del
   papel — cubre. Mismo gesto, materia distinta.

   Uso
     1. Processing 4 · modo Java.
     2. PLOTTER = false -> PNG a 300 ppp para impresion.
        PLOTTER = true  -> SVG de linea para plotter (sin lavados).
     3. Cambia TEXTO por el .md que quieras y no toques nada mas:
        la composicion se recalcula sola.
   ============================================================= */

import processing.svg.*;

// --- el texto: identico al de docs/no_todo_se_trata_2026.es.md ---
final String TEXTO =
  "No todo se trata del reciente corte de cabello p\u00farpura. " +
  "No todo se trata de la mirada que por instantes se clava en el lente de la c\u00e1mara " +
  "con la certeza de que el espectador se queda sin palabras. " +
  "No todo se trata de la perfecta chaqueta oscura. No todo se trata de eso. " +
  "Tambi\u00e9n es el encuentro inesperado de d\u00edas atr\u00e1s. " +
  "Tambi\u00e9n es la conversaci\u00f3n breve frente a una artista. " +
  "Tambi\u00e9n es tu voz que no cesa desde entonces. " +
  "No todo se trata de esto pero s\u00ed, tambi\u00e9n es esto lo que yo veo en la imagen, " +
  "tu cabello p\u00farpura, tu perfecta chaqueta negra, tus ojos en el lugar exacto " +
  "y la remembranza n\u00edtida de tu voz.";

final String CLAVE = "obra-001";   // igual que el clave del sketch web
final String LANG  = "es";
final boolean PLOTTER = false;       // true -> SVG de linea
final float PHI = 0.6180339887f;

// A4 vertical a 300 ppp
final int ANCHO = 2480;
final int ALTO  = 3508;

// materia
final color PAPEL   = #ECE6DC;
final color TINTA   = #14131A;
final color ACENTO  = #7A3FD6;
final color LUZ     = #9A6BE8;

int estado;                          // estado del mulberry32
String[] oraciones;
String[] tipos;
int[] letras;
int[] palabras;
int semilla;

void settings() {
  size(ANCHO, ALTO);
}

void setup() {
  // misma cadena que siembra el navegador: clave|idioma|texto
  semilla = fnv1a(CLAVE + "|" + LANG + "|" + TEXTO);
  estado = semilla;

  partir(TEXTO);

  if (PLOTTER) beginRecord(SVG, "no_todo_estratos-" + LANG + "-" + hex(semilla) + ".svg");

  background(PAPEL);
  smooth(8);

  ejes();
  if (!PLOTTER) lavado();
  if (!PLOTTER) chaqueta();
  cabello();
  negaciones();
  adiciones();
  giro();
  if (!PLOTTER) grano();
  pie();

  if (PLOTTER) {
    endRecord();
  } else {
    save("no_todo_estratos-" + LANG + "-" + hex(semilla) + ".png");
  }
  println("semilla " + hex(semilla) + " · " + oraciones.length + " oraciones");
  noLoop();
}

// ---------------- azar identico al del navegador ----------------

int fnv1a(String s) {
  int h = 0x811c9dc5;
  for (int i = 0; i < s.length(); i++) {
    h ^= s.charAt(i);
    h *= 0x01000193;
  }
  return h;
}

float rnd() {
  estado += 0x6D2B79F5;
  int t = estado;
  t = (t ^ (t >>> 15)) * (t | 1);
  t ^= t + (t ^ (t >>> 7)) * (t | 61);
  int u = t ^ (t >>> 14);
  return (float) ((u & 0xFFFFFFFFL) / 4294967296.0);
}

float rnd(float a, float b) { return a + (b - a) * rnd(); }
float gauss() { return (rnd() + rnd() + rnd() + rnd() - 2) * 0.7071f; }

// ---------------- lectura del texto (tabla R1) ----------------

void partir(String t) {
  String[] crudas = split(t.replaceAll("\\s+", " ").trim(), '.');
  StringList frases = new StringList();
  for (String c : crudas) {
    String f = c.trim();
    if (f.length() > 1) frases.append(f + ".");
  }
  oraciones = frases.array();
  tipos = new String[oraciones.length];
  letras = new int[oraciones.length];
  palabras = new int[oraciones.length];
  for (int i = 0; i < oraciones.length; i++) {
    String f = oraciones[i];
    String b = f.toLowerCase();
    if (b.contains("pero s\u00ed") || b.contains("pero si")) tipos[i] = "giro";
    else if (b.startsWith("no todo") || b.startsWith("no ")) tipos[i] = "neg";
    else if (b.startsWith("tambi\u00e9n") || b.startsWith("tambien")) tipos[i] = "ad";
    else tipos[i] = "resto";
    letras[i] = f.replaceAll("[^\\p{L}]", "").length();
    palabras[i] = split(f, ' ').length;
  }
}

// altura de una oracion: su lugar en el texto, medido en letras
float alturaDe(int i) {
  int total = 0;
  for (int k = 0; k < letras.length; k++) total += letras[k] + 1;
  int antes = 0;
  for (int k = 0; k < i; k++) antes += letras[k] + 1;
  float centro = (antes + (letras[i] + 1) * 0.5f) / total;
  return height * (0.08f + 0.84f * centro);
}

float grosorDe(int i) {
  int total = 0;
  for (int k = 0; k < letras.length; k++) total += letras[k] + 1;
  return max(height * 0.04f, height * 0.84f * (letras[i] + 1) / (float) total);
}

// ---------------- gestos ----------------

void ejes() {
  stroke(TINTA, PLOTTER ? 60 : 26);
  strokeWeight(PLOTTER ? 1 : 2);
  line(width * (1 - PHI), 0, width * (1 - PHI), height);
  line(width * PHI, 0, width * PHI, height);
  line(0, height * (1 - PHI) * 0.92f, width, height * (1 - PHI) * 0.92f);
}

void lavado() {
  noStroke();
  for (int i = 0; i < 24000; i++) {
    float x = rnd() * width;
    float y = rnd() * height;
    float arriba = 1 - constrain(y / (height * 0.42f), 0, 1);
    float r = min(width, height) * rnd(0.004f, 0.05f);
    color c = (rnd() < 0.14f + 0.4f * arriba) ? ACENTO : TINTA;
    fill(c, rnd(2, 9));
    ellipse(x, y, r, r);
  }
}

void chaqueta() {
  float cx = width * (0.5f + (rnd() - 0.5f) * 0.1f);
  float cy = height * 0.68f;
  float aw = width * rnd(0.42f, 0.62f);
  float ah = height * 0.46f;
  float sesgo = (rnd() - 0.5f) * aw * 0.22f;
  noStroke();
  fill(TINTA, 14);
  beginShape();
  vertex(cx - aw / 2 + sesgo, cy - ah / 2);
  vertex(cx + aw / 2 + sesgo * 0.4f, cy - ah / 2 + ah * 0.06f);
  vertex(cx + aw / 2 * 1.06f, cy + ah / 2);
  vertex(cx - aw / 2 * 1.02f, cy + ah / 2);
  endShape(CLOSE);
  stroke(TINTA, 40);
  strokeWeight(2);
  noFill();
  line(cx + sesgo * 0.2f, cy - ah / 2 + ah * 0.04f, cx - aw * 0.18f, cy + ah / 2);
}

void cabello() {
  noFill();
  for (int m = 0; m < 14; m++) {
    float y0 = height * (0.05f + 0.06f * m / 14.0f);
    float amp = height * rnd(0.008f, 0.03f);
    float fase = rnd() * 1000;
    stroke((m % 3 == 0) ? LUZ : ACENTO, PLOTTER ? 120 : rnd(18, 52));
    strokeWeight(PLOTTER ? 1.2f : rnd(1.5f, 5));
    beginShape();
    for (float x = -20; x <= width + 20; x += 12) {
      float y = y0 + (noise(x * 0.0009f + fase, y0 * 0.002f) - 0.5f) * amp * 2;
      vertex(x, y);
    }
    endShape();
  }
}

// la negacion cubre con el color del papel: no se puede quitar tinta
void negaciones() {
  for (int i = 0; i < oraciones.length; i++) {
    if (!tipos[i].equals("neg")) continue;
    float y = alturaDe(i);
    float alto = grosorDe(i);
    if (!PLOTTER) {
      noStroke();
      for (int k = 0; k < 900; k++) {
        float yy = y + gauss() * alto * 0.55f;
        float xx = rnd() * width;
        float r = min(width, height) * rnd(0.01f, 0.09f);
        fill(PAPEL, rnd(6, 26));
        ellipse(xx, yy, r * 2.4f, r);
      }
    }
    // el residuo: lo que la negacion no logra borrar
    stroke(TINTA, PLOTTER ? 150 : 90);
    strokeWeight(PLOTTER ? 1 : 2);
    noFill();
    beginShape();
    for (float x = 0; x <= width; x += 10) {
      vertex(x, y - alto * 0.42f + (noise(x * 0.0015f, i) - 0.5f) * height * 0.006f);
    }
    endShape();
  }
}

// la adicion deposita: la voz
void adiciones() {
  int j = 0;
  for (int i = 0; i < oraciones.length; i++) {
    if (!tipos[i].equals("ad")) continue;
    float y = alturaDe(i);
    float alto = grosorDe(i);
    float[] centros = { width * (1 - PHI), width * 0.5f, width * PHI };
    float cx = centros[j % 3];
    float disp = width * (0.06f + 0.04f * j);
    int hilos = max(120, palabras[i] * 26);
    noFill();
    for (int k = 0; k < hilos; k++) {
      float x = cx + gauss() * disp;
      float yy = y + gauss() * alto * 0.6f;
      stroke(rnd() < 0.28f ? LUZ : ACENTO, PLOTTER ? 110 : rnd(20, 70));
      strokeWeight(PLOTTER ? 0.8f : rnd(1, 3.4f));
      filamento(x, yy, min(width, height) * rnd(0.01f, 0.08f));
    }
    j++;
  }
}

void filamento(float x, float y, float largo) {
  int pasos = max(2, (int) (largo / 14));
  float px = x, py = y;
  beginShape();
  vertex(px, py);
  for (int i = 0; i < pasos; i++) {
    float ang = (noise(px * 0.0012f, py * 0.0012f) - 0.5f) * PI * 1.6f - HALF_PI;
    px += cos(ang) * 14;
    py += sin(ang) * 14;
    vertex(px, py);
  }
  endShape();
}

// el giro: los ojos en el lugar exacto
void giro() {
  float y = height * (1 - PHI) * 0.92f;
  float[] ejes = { width * (1 - PHI), width * PHI };
  for (int i = 0; i < 2; i++) {
    float x = ejes[i];
    if (!PLOTTER) {
      noStroke();
      for (int k = 0; k < 400; k++) {
        float r = min(width, height) * rnd(0.002f, 0.05f);
        fill(LUZ, rnd(4, 16));
        ellipse(x + gauss() * min(width, height) * 0.03f,
                y + gauss() * min(width, height) * 0.03f, r, r);
      }
    }
    noFill();
    stroke(TINTA, 210);
    strokeWeight(PLOTTER ? 1.4f : 3);
    ellipse(x, y, min(width, height) * 0.016f, min(width, height) * 0.016f);
    stroke(ACENTO, 150);
    strokeWeight(PLOTTER ? 1 : 2);
    ellipse(x, y, min(width, height) * 0.054f, min(width, height) * 0.054f);
    line(x, y, x + (i == 1 ? 1 : -1) * min(width, height) * 0.16f, y + min(width, height) * 0.02f);
  }
}

void grano() {
  noStroke();
  for (int i = 0; i < 60000; i++) {
    fill(TINTA, rnd(3, 12));
    rect(rnd() * width, rnd() * height, 2, 2);
  }
}

void pie() {
  fill(TINTA, 170);
  noStroke();
  textSize(height * 0.0085f);
  textAlign(LEFT, BASELINE);
  text("AUN · obra 001 · " + LANG + " · R1 · semilla " + hex(semilla),
       width * 0.06f, height * 0.965f);
}
