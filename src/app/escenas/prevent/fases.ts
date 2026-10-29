/**
 * Las fases de "La escalada", sin three.js: las usan la escena y su anfitrión, así que el
 * anfitrión las importa sin arrastrar el 3D a su chunk.
 *
 * El recorrido va de 0 a 1. Abajo está el suelo (la empresa inscribe a su gente), después un
 * tramo por cada travesaño (un documento requerido del curso) y arriba la cumbre con el
 * certificado de ejemplo.
 */

export type EstadoDocumento = 'pendiente' | 'cargado' | 'valido';

export interface Conteo {
  cargados: number;
  validos: number;
  pendientes: number;
  total: number;
}

/** Cuántos travesaños tiene el andamio: los documentos del curso de ejemplo. */
export const NIVELES = 4;

/** Donde empieza el primer travesaño y cuánto mide cada tramo del recorrido. */
export const SUELO = 0.12;
export const TRAMO = 0.18;
export const CUMBRE = SUELO + TRAMO * NIVELES;
/** Dentro de cada tramo: cuándo se sube el archivo y cuándo queda validado. */
export const SUBIDA = 0.38;
export const VALIDACION = 0.72;
/** El certificado de ejemplo se despliega al final, ya en la cumbre. */
export const CERTIFICADO = { desde: 0.88, hasta: 0.97 } as const;

export const limitar = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
export const tramo = (p: number, a: number, b: number): number => limitar((p - a) / (b - a), 0, 1);

/** Estado del documento del travesaño i cuando el recorrido va en p. */
export function estadoDocumento(p: number, i: number): EstadoDocumento {
  const inicio = SUELO + TRAMO * i;
  if (p >= inicio + TRAMO * VALIDACION) return 'valido';
  if (p >= inicio + TRAMO * SUBIDA) return 'cargado';
  return 'pendiente';
}

/**
 * Los contadores de la matrícula, como los calcula la plataforma: cargados incluye los
 * validados, y pendientes son los que todavía no se han subido.
 */
export function conteo(p: number): Conteo {
  let cargados = 0;
  let validos = 0;
  for (let i = 0; i < NIVELES; i++) {
    const e = estadoDocumento(p, i);
    if (e !== 'pendiente') cargados++;
    if (e === 'valido') validos++;
  }
  return { cargados, validos, pendientes: NIVELES - cargados, total: NIVELES };
}

/** Altura del personaje en travesaños (0 = suelo, NIVELES = cumbre), con una subida suave. */
export function alturaEscalador(p: number): number {
  if (p <= SUELO) return 0;
  const n = limitar((p - SUELO) / TRAMO, 0, NIVELES);
  const entero = Math.floor(n);
  if (entero >= NIVELES) return NIVELES;
  // Dentro de cada tramo sube en la primera parte y espera en el travesaño a que validen.
  const t = tramo(n - entero, 0, SUBIDA * 0.8);
  const suave = t * t * (3 - 2 * t);
  return entero + suave;
}

/** Cuántos travesaños tienen la línea de vida enganchada (0..NIVELES). */
export function enganches(p: number): number {
  let n = 0;
  for (let i = 0; i < NIVELES; i++) if (estadoDocumento(p, i) === 'valido') n++;
  return n;
}
