/**
 * El certificado de muestra dibujado en canvas 2D: una sola función, cuatro marcas.
 * Lo usa la escena 3D como textura y, si no hay WebGL, se muestra tal cual.
 * Independiente del framework: solo corre en el navegador. Datos ficticios.
 */
import { CERTIFICADO_FICTICIO, type MarcaCertificado, type MarcaId } from '../../mundos/ahdo/datos';

/** Espacio lógico de dibujo: A4 apaisado. */
export const ANCHO_LOGICO = 1414;
export const ALTO_LOGICO = 1000;

export interface RecursosCertificado {
  logos: Partial<Record<MarcaId, HTMLImageElement>>;
  sello: HTMLImageElement | null;
  personaje: HTMLImageElement | null;
}

const SELLO_AHDO = '/marcas/ahdo/sello-ahdo.webp';
const PERSONAJE_AHDO = '/marcas/ahdo/personaje-ahdo-color.webp';

/** Logos, sello y fuentes. Lo que falle se omite: el certificado se dibuja igual. */
export async function cargarRecursos(marcas: MarcaCertificado[]): Promise<RecursosCertificado> {
  const fuentes = new Set<string>(['Inter', 'IBM Plex Mono']);
  for (const m of marcas) fuentes.add(m.fuente);
  const cargas: Promise<unknown>[] = [];
  if (typeof document !== 'undefined' && 'fonts' in document) {
    for (const f of fuentes) {
      cargas.push(conTope(document.fonts.load(`700 40px "${f}"`).catch(() => null), 2500, null));
      cargas.push(conTope(document.fonts.load(`400 20px "${f}"`).catch(() => null), 2500, null));
    }
  }
  const logos: Partial<Record<MarcaId, HTMLImageElement>> = {};
  const [sello, personaje, ...resto] = await Promise.all([
    conTope(cargarImagen(SELLO_AHDO), 4000, null),
    conTope(cargarImagen(PERSONAJE_AHDO), 4000, null),
    ...marcas.map((m) => conTope(cargarImagen(m.logo.src), 4000, null)),
    ...cargas,
  ]);
  marcas.forEach((m, i) => {
    const img = resto[i];
    if (img instanceof HTMLImageElement) logos[m.id] = img;
  });
  return {
    logos,
    sello: sello instanceof HTMLImageElement ? sello : null,
    personaje: personaje instanceof HTMLImageElement ? personaje : null,
  };
}

/** Por el evento load y no por decode(): decode() puede quedarse esperando si la página no está pintando. */
function cargarImagen(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolver) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => resolver(null);
    img.src = src;
  });
}

/** Ninguna carga detiene el dibujo más de lo razonable: si tarda, se dibuja con lo que haya. */
function conTope<T>(promesa: Promise<T>, ms: number, respaldo: T): Promise<T> {
  return Promise.race([promesa, new Promise<T>((r) => setTimeout(() => r(respaldo), ms))]);
}

// ---------------------------------------------------------------- dibujo

export function dibujarCertificado(
  ctx: CanvasRenderingContext2D,
  ancho: number,
  alto: number,
  marca: MarcaCertificado,
  r: RecursosCertificado,
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ancho, alto);
  ctx.scale(ancho / ANCHO_LOGICO, alto / ALTO_LOGICO);

  const c = marca.colores;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, ANCHO_LOGICO, ALTO_LOGICO);

  // Centro de la columna de texto: en el estilo lateral se corre a la derecha de la franja.
  let cx = ANCHO_LOGICO / 2;
  const logo = r.logos[marca.id] ?? null;

  switch (marca.estilo) {
    case 'banda':
      decorarBanda(ctx, r);
      ponerImagen(ctx, logo, 96, 132, 430);
      break;
    case 'lateral':
      decorarLateral(ctx, marca);
      cx = (190 + ANCHO_LOGICO) / 2;
      ponerImagen(ctx, logo, ANCHO_LOGICO - 96 - 300, 70, 300);
      break;
    case 'marco':
      decorarMarco(ctx, marca);
      ponerImagen(ctx, logo, (ANCHO_LOGICO - 340) / 2, 96, 340);
      break;
    case 'esquina':
      decorarEsquina(ctx, marca);
      ponerImagen(ctx, logo, ANCHO_LOGICO - 96 - 168, 70, 168);
      break;
  }

  const f = marca.fuente;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Título con la voz de cada marca.
  ctx.fillStyle = marca.estilo === 'marco' ? c.primario : c.tinta;
  if (marca.estilo === 'lateral') {
    ctx.save();
    ctx.translate(cx, 330);
    ctx.transform(1, 0, -0.16, 1, 0, 0);
    ctx.font = `800 104px "${f}", sans-serif`;
    espaciar(ctx, 4);
    ctx.fillText('CERTIFICADO', 0, 0);
    ctx.restore();
  } else {
    ctx.font = marca.estilo === 'marco' ? `600 76px "${f}", sans-serif` : `700 70px "${f}", sans-serif`;
    espaciar(ctx, marca.estilo === 'marco' ? 2 : 10);
    ctx.fillText(marca.estilo === 'marco' ? 'Certificado' : 'CERTIFICADO', cx, 330);
  }
  espaciar(ctx, 0);

  ctx.fillStyle = '#4a4766';
  ctx.font = `400 26px "${f}", sans-serif`;
  ctx.fillText('Se certifica que', cx, 410);

  ctx.fillStyle = c.tinta;
  ctx.font = `700 60px "${f}", sans-serif`;
  ajustar(ctx, CERTIFICADO_FICTICIO.persona, 760);
  ctx.fillText(CERTIFICADO_FICTICIO.persona, cx, 500);

  ctx.fillStyle = c.primario;
  ctx.fillRect(cx - 280, 528, 560, 4);

  ctx.fillStyle = c.tinta;
  ctx.font = `400 28px "${f}", sans-serif`;
  ctx.fillText(`aprobó el ${CERTIFICADO_FICTICIO.curso}`, cx, 592);
  ctx.fillStyle = '#4a4766';
  ctx.font = `400 22px "${f}", sans-serif`;
  ctx.fillText(`Intensidad: ${CERTIFICADO_FICTICIO.horas}   ·   ${CERTIFICADO_FICTICIO.fecha}`, cx, 644);

  // El mecanismo real, a la vista: el proveedor del curso apunta a una plantilla.
  ctx.fillStyle = '#4a4766';
  ctx.font = `400 19px "IBM Plex Mono", monospace`;
  ctx.fillText(`Proveedor del curso: ${marca.nombre}  →  plantilla propia de la marca`, cx, 890);

  if (marca.estilo === 'banda' && r.sello) {
    ponerImagen(ctx, r.sello, ANCHO_LOGICO - 96 - 112, 690, 112);
  }

  selloMuestra(ctx, marca, marca.estilo === 'banda' ? 250 : ANCHO_LOGICO - 250, 770);
  ctx.restore();
}

function espaciar(ctx: CanvasRenderingContext2D, px: number): void {
  // letterSpacing existe en los navegadores actuales; donde no, simplemente no se espacía.
  const conEspaciado = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ('letterSpacing' in conEspaciado) conEspaciado.letterSpacing = `${px}px`;
}

/** Reduce la fuente hasta que el texto quepa en el ancho dado. */
function ajustar(ctx: CanvasRenderingContext2D, texto: string, maximo: number): void {
  let intentos = 0;
  while (ctx.measureText(texto).width > maximo && intentos < 12) {
    const m = /(\d+)px/.exec(ctx.font);
    if (!m) return;
    ctx.font = ctx.font.replace(/\d+px/, `${Number(m[1]) - 4}px`);
    intentos++;
  }
}

function ponerImagen(ctx: CanvasRenderingContext2D, img: HTMLImageElement | null, x: number, y: number, ancho: number): void {
  if (!img || !img.naturalWidth) return;
  const alto = (ancho * img.naturalHeight) / img.naturalWidth;
  ctx.drawImage(img, x, y, ancho, alto);
}

function selloMuestra(ctx: CanvasRenderingContext2D, marca: MarcaCertificado, x: number, y: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.16);
  ctx.strokeStyle = marca.colores.primario;
  ctx.fillStyle = marca.colores.primario;
  ctx.lineWidth = 5;
  redondeado(ctx, -150, -52, 300, 104, 14);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  redondeado(ctx, -140, -42, 280, 84, 9);
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = `800 40px "Inter", sans-serif`;
  espaciar(ctx, 6);
  ctx.fillText('MUESTRA', 0, 2);
  ctx.font = `600 16px "Inter", sans-serif`;
  espaciar(ctx, 3);
  ctx.fillText('DATOS FICTICIOS', 0, 28);
  espaciar(ctx, 0);
  ctx.restore();
}

function redondeado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---- AHDO: la banda del degradado del logo y la red de nodos de su "A"

const RED_NODOS: Array<[number, number, number]> = [
  [1120, 150, 7],
  [1205, 118, 11],
  [1290, 170, 6],
  [1180, 230, 9],
  [1268, 262, 24],
  [1336, 214, 5],
  [1100, 286, 18],
  [1232, 330, 6],
];
const RED_LINEAS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [1, 3],
  [3, 4],
  [2, 5],
  [3, 6],
  [4, 7],
  [2, 4],
];

function decorarBanda(ctx: CanvasRenderingContext2D, r: RecursosCertificado): void {
  const g = ctx.createLinearGradient(0, 0, ANCHO_LOGICO, 0);
  g.addColorStop(0, '#8b5ffc');
  g.addColorStop(0.42, '#301f56');
  g.addColorStop(0.8, '#007fb8');
  g.addColorStop(1, '#008585');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ANCHO_LOGICO, 64);
  ctx.fillRect(0, ALTO_LOGICO - 22, ANCHO_LOGICO, 22);

  if (r.personaje && r.personaje.naturalWidth) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    const alto = 620;
    const ancho = (alto * r.personaje.naturalWidth) / r.personaje.naturalHeight;
    ctx.drawImage(r.personaje, (ANCHO_LOGICO - ancho) / 2, 230, ancho, alto);
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = 'rgba(48, 31, 86, 0.35)';
  ctx.lineWidth = 2;
  for (const [a, b] of RED_LINEAS) {
    const p = RED_NODOS[a];
    const q = RED_NODOS[b];
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
    ctx.stroke();
  }
  RED_NODOS.forEach(([x, y, radio], i) => {
    ctx.beginPath();
    ctx.arc(x, y, radio, 0, Math.PI * 2);
    ctx.fillStyle = radio > 15 ? 'rgba(170, 170, 255, 0.75)' : i % 2 ? '#8b5ffc' : '#301f56';
    ctx.fill();
  });
  ctx.restore();
}

// ---- Autoaprender: franja lateral verde lima con el filo amarillo

function decorarLateral(ctx: CanvasRenderingContext2D, marca: MarcaCertificado): void {
  const c = marca.colores;
  ctx.fillStyle = c.primario;
  ctx.fillRect(0, 0, 150, ALTO_LOGICO);
  ctx.fillStyle = c.secundario;
  ctx.fillRect(150, 0, 16, ALTO_LOGICO);
  ctx.fillStyle = c.tinta;
  ctx.fillRect(166, 0, 6, ALTO_LOGICO);
  // Línea de carretera en la franja.
  ctx.fillStyle = '#ffffff';
  for (let y = 40; y < ALTO_LOGICO; y += 90) ctx.fillRect(68, y, 14, 46);
  ctx.fillStyle = c.primario;
  ctx.fillRect(190, ALTO_LOGICO - 40, ANCHO_LOGICO - 190, 10);
}

// ---- Ocupasalud: marco doble con la onda verde azulada

function decorarMarco(ctx: CanvasRenderingContext2D, marca: MarcaCertificado): void {
  const c = marca.colores;
  ctx.fillStyle = c.suave;
  ctx.fillRect(0, 0, ANCHO_LOGICO, ALTO_LOGICO);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(40, 40, ANCHO_LOGICO - 80, ALTO_LOGICO - 80);
  ctx.strokeStyle = c.primario;
  ctx.lineWidth = 12;
  ctx.strokeRect(34, 34, ANCHO_LOGICO - 68, ALTO_LOGICO - 68);
  ctx.strokeStyle = c.secundario;
  ctx.lineWidth = 3;
  ctx.strokeRect(58, 58, ANCHO_LOGICO - 116, ALTO_LOGICO - 116);

  ctx.save();
  ctx.beginPath();
  ctx.rect(61, 61, ANCHO_LOGICO - 122, ALTO_LOGICO - 122);
  ctx.clip();
  ctx.fillStyle = c.secundario;
  ctx.globalAlpha = 0.18;
  onda(ctx, 960, 34, 0);
  ctx.globalAlpha = 0.3;
  onda(ctx, 985, 22, 1.4);
  ctx.restore();
}

function onda(ctx: CanvasRenderingContext2D, base: number, amplitud: number, fase: number): void {
  ctx.beginPath();
  ctx.moveTo(0, ALTO_LOGICO);
  for (let x = 0; x <= ANCHO_LOGICO; x += 20) {
    ctx.lineTo(x, base - amplitud * Math.sin((x / ANCHO_LOGICO) * Math.PI * 3 + fase));
  }
  ctx.lineTo(ANCHO_LOGICO, ALTO_LOGICO);
  ctx.closePath();
  ctx.fill();
}

// ---- Cuality: esquinas en azul y gris

function decorarEsquina(ctx: CanvasRenderingContext2D, marca: MarcaCertificado): void {
  const c = marca.colores;
  ctx.fillStyle = c.primario;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(330, 0);
  ctx.lineTo(0, 330);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.secundario;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(180, 0);
  ctx.lineTo(0, 180);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = c.primario;
  ctx.beginPath();
  ctx.moveTo(ANCHO_LOGICO, ALTO_LOGICO);
  ctx.lineTo(ANCHO_LOGICO - 300, ALTO_LOGICO);
  ctx.lineTo(ANCHO_LOGICO, ALTO_LOGICO - 300);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = c.primario;
  ctx.fillRect(ANCHO_LOGICO / 2 - 60, 360, 120, 4);
}
