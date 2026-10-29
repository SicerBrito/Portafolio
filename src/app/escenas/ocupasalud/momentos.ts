/**
 * El guion de "Un día en la IPS", sin three.js: lo comparten la escena y el anfitrión, y así el
 * chunk del mundo no arrastra la librería 3D.
 *
 * El progreso va de 0 a 1 y lo maneja el scroll. La ruta son paradas en el piso de la sede
 * (x, z en unidades de la maqueta); entre dos paradas iguales el paciente espera.
 */

export type SalaId =
  | 'recepcion'
  | 'cola'
  | 'medicina'
  | 'optometria'
  | 'audiometria'
  | 'laboratorio'
  | 'rayosx'
  | 'salida';

export type AnclaSede = SalaId | 'turno' | 'reloj' | 'externa' | 'firmado' | 'encuesta';

/** [progreso, x, z] */
export type Parada = readonly [number, number, number];

export const RUTA: readonly Parada[] = [
  [0.0, -10.6, 3.3],
  [0.05, -8.4, 3.3],
  [0.1, -6.4, 2.9],
  [0.19, -6.4, 2.9],
  [0.24, -2.6, 3.1],
  [0.27, -0.4, 3.1],
  [0.35, -0.4, 3.1],
  // Sale de la sala de espera por la derecha, sin cruzar las sillas, toma el pasillo y entra a
  // cada consultorio de frente por su puerta.
  [0.356, 1.6, 3.1],
  [0.366, 1.6, 0.2],
  [0.39, -7.3, 0.2],
  [0.408, -7.3, -1.9],
  [0.44, -7.3, -1.9],
  [0.455, -7.3, 0.2],
  [0.47, -3.7, 0.2],
  [0.485, -3.7, -1.9],
  [0.515, -3.7, -1.9],
  [0.525, -3.7, 0.2],
  [0.535, -0.3, 0.2],
  [0.55, -0.3, -1.9],
  [0.58, -0.3, -1.9],
  [0.59, -0.3, 0.2],
  [0.6, 3.4, 0.2],
  [0.615, 3.4, -1.9],
  [0.645, 3.4, -1.9],
  [0.655, 3.4, 0.2],
  [0.67, 6.0, 0.2],
  [0.69, 7.1, -1.0],
  [0.82, 7.1, -1.0],
  [0.85, 6.0, 1.0],
  [0.89, 7.4, 2.9],
  [1.0, 7.4, 2.9],
];

/** El reloj de la encuesta: arranca en recepción y llega a 6 horas al salir. */
export const RELOJ = { desde: 0.12, hasta: 0.9, horas: 6 } as const;

export const EVENTOS = {
  nube: [0.62, 0.86] as const,
  firmado: 0.7,
  pdf: [0.7, 0.78] as const,
  burbuja: [0.9, 0.96] as const,
};

/** Cuándo se ve cada etiqueta que sigue a la escena. */
export const VENTANAS: Readonly<Record<AnclaSede, readonly [number, number]>> = {
  recepcion: [0, 1],
  cola: [0, 1],
  medicina: [0, 1],
  optometria: [0, 1],
  audiometria: [0, 1],
  laboratorio: [0, 1],
  rayosx: [0, 1],
  salida: [0, 1],
  turno: [0.02, 0.905],
  reloj: [0.12, 0.905],
  externa: [0.63, 0.86],
  firmado: [0.69, 0.8],
  encuesta: [0.91, 1],
};

/** Horas que faltan para la encuesta en un progreso dado. Función pura: la usa el anfitrión. */
export function horasRestantes(p: number): number {
  const t = Math.min(1, Math.max(0, (p - RELOJ.desde) / (RELOJ.hasta - RELOJ.desde)));
  return RELOJ.horas * (1 - t);
}

/** "5 h 30 min", "45 min", "ya". Redondea a la media hora: el reloj de la maqueta va por medias horas. */
export function textoEspera(horas: number): string {
  const medias = Math.ceil(horas * 2 - 1e-6);
  if (medias <= 0) return 'ya';
  const h = Math.floor(medias / 2);
  const m = medias % 2 ? '30 min' : '';
  if (!h) return m;
  return m ? `${h} h ${m}` : `${h} h`;
}

/** La sala en la que está el paciente para un progreso dado, o null si va de camino. */
export function salaActual(p: number): SalaId | null {
  // Corre en cada cuadro: índices, sin iteradores ni desestructuración.
  for (let i = 0; i < ESTANCIAS.length; i++) {
    const e = ESTANCIAS[i];
    if (p >= e[1] && p <= e[2]) return e[0];
  }
  return null;
}

const ESTANCIAS: readonly (readonly [SalaId, number, number])[] = [
  ['recepcion', 0.09, 0.2],
  ['cola', 0.26, 0.36],
  ['medicina', 0.4, 0.445],
  ['optometria', 0.48, 0.52],
  ['audiometria', 0.545, 0.585],
  ['laboratorio', 0.61, 0.65],
  ['rayosx', 0.685, 0.825],
  ['salida', 0.88, 1],
];
