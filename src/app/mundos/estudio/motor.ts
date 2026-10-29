/**
 * El núcleo del motor, copiado tal cual del prototipo: su función de interpolación y su
 * escena de título.
 *
 * Todo lo que se mueve es una función pura del número de fotograma: nada de reloj.
 * Por eso subir el scroll de golpe da exactamente el mismo fotograma que bajar despacio.
 * Lo usan la reconstrucción de la escena (HTML) y la escena 3D (lienzo 2D como textura).
 */

export const FPS = 30;
/** La prueba de render: 10 segundos, fotogramas 0 a 299. */
export const TOTAL_FOTOGRAMAS = FPS * 10;
export const ULTIMO_FOTOGRAMA = TOTAL_FOTOGRAMAS - 1;

/** Segundos → fotogramas. */
export const seg = (s: number): number => Math.round(s * FPS);

export type Curva = (t: number) => number;

/** Sin curva: velocidad constante. */
export const lineal: Curva = (t) => t;

/** Arranca y frena con suavidad. La curva por defecto del motor. */
export const suave: Curva = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Entra rápido y frena al final. */
export const frenar: Curva = (t) => 1 - Math.pow(1 - t, 3);

/** Se pasa un poco y vuelve. */
export const rebote: Curva = (t) => {
  const c = 1.70158 + 1;
  return 1 + c * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
};

/** Lleva `frame` de [desde, hasta] a [salidaDesde, salidaHasta]; fuera del rango se queda en los extremos. */
export function interpolar(
  frame: number,
  [desde, hasta]: [number, number],
  [salidaDesde, salidaHasta]: [number, number],
  suavizado: Curva = suave,
): number {
  if (hasta === desde) return salidaHasta;
  const t = Math.min(1, Math.max(0, (frame - desde) / (hasta - desde)));
  return salidaDesde + (salidaHasta - salidaDesde) * suavizado(t);
}

/** Aparece y desaparece: sube durante `entrada`, se queda y baja durante `salida`. */
export function aparecer(
  frame: number,
  inicio: number,
  fin: number,
  entrada = seg(0.5),
  salida = seg(0.5),
): number {
  if (frame < inicio || frame > fin) return 0;
  const subiendo = interpolar(frame, [inicio, inicio + entrada], [0, 1], frenar);
  const bajando = interpolar(frame, [fin - salida, fin], [1, 0], frenar);
  return Math.min(subiendo, bajando);
}

/** Lo que la escena de título del motor pinta en un fotograma. */
export interface EstadoEscena {
  opacidadModulo: number;
  yModulo: number;
  opacidadTitulo: number;
  yTitulo: number;
  opacidadBarra: number;
  anchoBarra: number;
  valorBarra: number;
}

/**
 * La escena de título del motor, fotograma a fotograma.
 * `separadas` recrea el error que tuvo: el porcentaje con su propia curva (lineal) y la barra
 * con la suya (suave). Es una recreación, no las curvas originales del error: en el fotograma
 * 120 da barra en 31 % y texto en 39 % (el motor registró 30 % contra 39 %).
 */
export function estadoEscena(frame: number, separadas = false): EstadoEscena {
  const anchoBarra = interpolar(frame, [seg(2.4), seg(6.0)], [0, 87]);
  return {
    opacidadModulo: aparecer(frame, seg(0.2), seg(9.6)),
    yModulo: interpolar(frame, [seg(0.2), seg(1.0)], [18, 0]),
    opacidadTitulo: aparecer(frame, seg(0.6), seg(9.6)),
    yTitulo: interpolar(frame, [seg(0.6), seg(1.6)], [46, 0], rebote),
    opacidadBarra: aparecer(frame, seg(2.2), seg(9.6)),
    anchoBarra,
    valorBarra: separadas
      ? Math.round(interpolar(frame, [seg(2.4), seg(6.0)], [0, 87], lineal))
      : Math.round(anchoBarra),
  };
}

/** "087": el contador del inspector del motor. */
export const tresCifras = (n: number): string => String(Math.round(n)).padStart(3, '0');

/** Segundos con dos decimales, como el inspector del motor. */
export const segundos = (frame: number): string => (frame / FPS).toFixed(2);

/** Código de tiempo de cine: HH:MM:SS:FF a 30 fps. */
export function codigoTiempo(frame: number): string {
  const f = Math.max(0, Math.round(frame));
  const ff = f % FPS;
  const total = Math.floor(f / FPS);
  const ss = total % 60;
  const mm = Math.floor(total / 60) % 60;
  const hh = Math.floor(total / 3600);
  const d = (n: number) => String(n).padStart(2, '0');
  return `${d(hh)}:${d(mm)}:${d(ss)}:${d(ff)}`;
}

/**
 * Huella corta del contenido de una escena (FNV-1a de 32 bits).
 * El plan del motor decide con un hash si una escena se reusa de la caché; aquí basta uno pequeño.
 */
export function huella(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
