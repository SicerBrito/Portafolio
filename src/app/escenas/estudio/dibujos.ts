/**
 * Dibujos 2D que la escena 3D usa como texturas: el fotograma del motor, la cinta, el papel
 * del documento y las tarjetas del guion. Todo con la letra del sistema, como el motor:
 * no hay que esperar fuentes web para que el dibujo salga completo.
 */
import { estadoEscena, tresCifras } from '../../mundos/estudio/motor';

export interface ColoresDibujo {
  lienzo: string;
  inspector: string;
  morado: string;
  lila: string;
  papel: string;
  papelTinta: string;
  cinta: string;
}

const LETRA = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, Consolas, monospace';

export function crearLienzo2d(
  ancho: number,
  alto: number,
): { lienzo: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const lienzo = document.createElement('canvas');
  lienzo.width = ancho;
  lienzo.height = alto;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('Sin contexto 2D');
  return { lienzo, ctx };
}

function rectRedondo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * La escena de título del motor en el fotograma `frame`, escalada a (x, y, ancho, alto).
 * Las medidas son las del lienzo original de 1280 × 720.
 */
export function dibujarFotograma(
  ctx: CanvasRenderingContext2D,
  c: ColoresDibujo,
  frame: number,
  x: number,
  y: number,
  ancho: number,
  alto: number,
  quemado = true,
): void {
  const k = ancho / 1280;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, ancho, alto);
  ctx.clip();
  ctx.fillStyle = c.lienzo;
  ctx.fillRect(x, y, ancho, alto);

  // El halo lila: un círculo de 620 px corrido 180 px fuera de la esquina superior derecha.
  // En CSS el degradado llega a la esquina lejana de su caja (438 px) y se apaga al 70 %.
  const hx = x + 1150 * k;
  const hy = y + 130 * k;
  const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, 438 * k);
  halo.addColorStop(0, 'rgba(170,170,255,0.22)');
  halo.addColorStop(0.7, 'rgba(170,170,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(x, y, ancho, alto);

  const e = estadoEscena(frame);
  const izquierda = x + 110 * k;
  // Bloque centrado en vertical, como el flex del motor: antetítulo, dos líneas de título y barra.
  const base = y + alto / 2 - 150 * k;

  ctx.textBaseline = 'top';
  ctx.globalAlpha = e.opacidadModulo;
  ctx.fillStyle = '#aaaaff';
  ctx.font = `600 ${22 * k}px ${LETRA}`;
  if ('letterSpacing' in ctx)
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${(22 * 0.18 * k).toFixed(2)}px`;
  ctx.fillText('MÓDULO 1 · INTRODUCCIÓN', izquierda, base + e.yModulo * k);
  if ('letterSpacing' in ctx)
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';

  ctx.globalAlpha = e.opacidadTitulo;
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${78 * k}px ${LETRA}`;
  const yt = base + 36 * k + e.yTitulo * k;
  ctx.fillText('Trabajo seguro en', izquierda, yt);
  ctx.fillText('alturas', izquierda, yt + 84 * k);

  ctx.globalAlpha = e.opacidadBarra;
  const yb = base + 36 * k + 168 * k + 54 * k;
  const anchoRiel = 640 * k;
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  rectRedondo(ctx, izquierda, yb, anchoRiel, 16 * k, 8 * k);
  ctx.fill();
  if (e.anchoBarra > 0.2) {
    const barra = ctx.createLinearGradient(izquierda, 0, izquierda + anchoRiel, 0);
    barra.addColorStop(0, c.morado);
    barra.addColorStop(1, c.lila);
    ctx.fillStyle = barra;
    rectRedondo(ctx, izquierda, yb, (anchoRiel * e.anchoBarra) / 100, 16 * k, 8 * k);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${30 * k}px ${LETRA}`;
  ctx.fillText(`${e.valorBarra}%`, izquierda + anchoRiel + 26 * k, yb - 7 * k);
  ctx.globalAlpha = 1;

  if (quemado) {
    const t = `f ${tresCifras(frame)}`;
    ctx.font = `500 ${44 * k}px ${MONO}`;
    const w = ctx.measureText(t).width;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x + 26 * k, y + alto - 84 * k, w + 28 * k, 60 * k);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(t, x + 40 * k, y + alto - 76 * k);
  }
  ctx.restore();
}

/** Un mensaje en mono sobre el lienzo vacío: la plantilla mientras carga. */
export function dibujarEspera(
  ctx: CanvasRenderingContext2D,
  c: ColoresDibujo,
  ancho: number,
  alto: number,
  texto: string,
): void {
  dibujarFotograma(ctx, c, 0, 0, 0, ancho, alto, false);
  ctx.save();
  ctx.font = `500 ${Math.round(alto * 0.075)}px ${MONO}`;
  ctx.fillStyle = '#d9d4f2';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(texto, ancho / 2, alto / 2);
  ctx.restore();
}

/** Una celda de cinta: perforaciones arriba y abajo, y un fotograma en medio. */
export const CELDA = { ancho: 272, alto: 192, foto: { x: 8, y: 24, ancho: 256, alto: 144 } };

/** La cinta: varias celdas seguidas, cada una con un fotograma distinto. Se repite a lo largo. */
export function crearCinta(c: ColoresDibujo, fotogramas: readonly number[]): HTMLCanvasElement {
  const { lienzo, ctx } = crearLienzo2d(CELDA.ancho * fotogramas.length, CELDA.alto);
  ctx.fillStyle = c.cinta;
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);
  fotogramas.forEach((f, i) => {
    const x0 = i * CELDA.ancho;
    ctx.fillStyle = c.inspector;
    for (let j = 0; j < 4; j++) {
      const px = x0 + 22 + j * 64;
      rectRedondo(ctx, px, 6, 30, 12, 3);
      ctx.fill();
      rectRedondo(ctx, px, CELDA.alto - 18, 30, 12, 3);
      ctx.fill();
    }
    dibujarFotograma(
      ctx,
      c,
      f,
      x0 + CELDA.foto.x,
      CELDA.foto.y,
      CELDA.foto.ancho,
      CELDA.foto.alto,
      true,
    );
  });
  return lienzo;
}

/** Una página de PDF: título, párrafos y un subtítulo. Texto de relleno, sin contenido real. */
export function crearPaginaPdf(c: ColoresDibujo): HTMLCanvasElement {
  const { lienzo, ctx } = crearLienzo2d(340, 440);
  ctx.fillStyle = c.papel;
  ctx.fillRect(0, 0, 340, 440);
  ctx.fillStyle = c.papelTinta;
  ctx.fillRect(28, 34, 210, 22);
  const lineas = (y: number, n: number) => {
    ctx.fillStyle = 'rgba(48,31,86,0.32)';
    for (let i = 0; i < n; i++) ctx.fillRect(28, y + i * 16, i === n - 1 ? 170 : 284, 7);
  };
  lineas(80, 5);
  ctx.fillStyle = c.morado;
  ctx.fillRect(28, 176, 150, 15);
  lineas(206, 6);
  ctx.fillStyle = c.papelTinta;
  ctx.fillRect(28, 318, 120, 15);
  lineas(346, 4);
  ctx.font = `700 18px ${LETRA}`;
  ctx.fillStyle = c.morado;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('PDF', 280, 418);
  return lienzo;
}

/** Una diapositiva: fondo de marca, título y viñetas. */
export function crearDiapositiva(c: ColoresDibujo): HTMLCanvasElement {
  const { lienzo, ctx } = crearLienzo2d(480, 270);
  ctx.fillStyle = c.papel;
  ctx.fillRect(0, 0, 480, 270);
  ctx.fillStyle = c.lienzo;
  ctx.fillRect(0, 0, 480, 64);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(28, 24, 220, 16);
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = c.morado;
    ctx.beginPath();
    ctx.arc(38, 100 + i * 36, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(48,31,86,0.35)';
    ctx.fillRect(56, 94 + i * 36, 260 - i * 30, 12);
  }
  ctx.font = `700 18px ${LETRA}`;
  ctx.fillStyle = c.morado;
  ctx.fillText('PPTX', 404, 252);
  return lienzo;
}

/** Una tarjeta del guion en trazo de plano: fondo transparente, letra lila. */
export function crearTarjeta(
  c: ColoresDibujo,
  id: string,
  tipo: string,
  texto: string,
): HTMLCanvasElement {
  const { lienzo, ctx } = crearLienzo2d(380, 124);
  ctx.fillStyle = 'rgba(170,170,255,0.08)';
  ctx.fillRect(0, 0, 380, 124);
  ctx.fillStyle = c.lila;
  ctx.textBaseline = 'top';
  ctx.font = `500 22px ${MONO}`;
  ctx.fillText(`"${id}"  ${tipo}`, 18, 18);
  ctx.font = `600 24px ${LETRA}`;
  ctx.fillStyle = '#e7e4fb';
  ctx.fillText(texto, 18, 62);
  return lienzo;
}
