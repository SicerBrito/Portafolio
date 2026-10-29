/**
 * "Del papel al dato", sin framework: la cola de trabajos que lee exámenes en PDF.
 *
 * Funciones puras sobre un estado inmutable. El reloj es simulado y va en minutos. Cada examen
 * es un trabajo: la IA lo lee, el resultado viaja por el cable a la hoja de cálculo y, si el
 * envío falla, el trabajo espera y se reintenta a los 30 min, a las 2 h y a las 6 h.
 * Todo es ficticio; solo las esperas entre intentos son las del sistema real.
 */
import { EXAMENES_FICTICIOS, REINTENTOS_MIN, type ExamenFicticio } from './contenido';

/** 'agotado': falló también el último reintento; el reproceso por fechas lo vuelve a encolar. */
export type EstadoTrabajo = 'cola' | 'leyendo' | 'enviando' | 'espera' | 'listo' | 'agotado';

export interface Trabajo {
  id: number;
  examen: ExamenFicticio;
  estado: EstadoTrabajo;
  /** Intentos fallidos hasta ahora (0..3). */
  fallos: number;
  /** Minuto simulado del próximo intento, si está en espera. */
  proximo: number;
  /** Orden de llegada a la cola: decide quién sigue. */
  orden: number;
  /** Minutos que le faltan a la fase actual (leyendo o enviando). */
  resta: number;
}

export interface Simulacion {
  reloj: number;
  cableCortado: boolean;
  /** Minuto simulado en que la conexión vuelve sola, si está cortada. */
  vuelveEn: number | null;
  trabajos: Trabajo[];
  filas: ExamenFicticio[];
  siguienteId: number;
  siguienteOrden: number;
}

export type Evento =
  | { tipo: 'fila'; id: number }
  | { tipo: 'fallo'; id: number; espera: number; intento: number }
  | { tipo: 'reintento'; id: number }
  | { tipo: 'agotado'; id: number }
  | { tipo: 'vuelve' };

/** Minutos simulados por segundo real. */
export const MINUTOS_POR_SEGUNDO = 30;
/** Lo que tarda cada fase, en minutos simulados. */
export const LECTURA_MIN = 40;
export const ENVIO_MIN = 15;
/** Si nadie lo reconecta, el cable vuelve solo a las 6 horas: alcanza a verse el último reintento. */
export const CORTE_MAX_MIN = 360;
/** Hora del día en que empieza el reloj: 8:00 a. m. */
export const INICIO_MIN = 8 * 60;

export function crearSimulacion(): Simulacion {
  return {
    reloj: INICIO_MIN,
    cableCortado: false,
    vuelveEn: null,
    trabajos: [],
    filas: [],
    siguienteId: 1,
    siguienteOrden: 1,
  };
}

/**
 * Agrega n exámenes ficticios al final de la cola. Como el reproceso por rango de fechas, también
 * vuelve a encolar los que agotaron sus reintentos.
 */
export function encolar(s: Simulacion, n: number): Simulacion {
  const nuevos: Trabajo[] = [];
  let id = s.siguienteId;
  let orden = s.siguienteOrden;
  const previos = s.trabajos.map((t) =>
    t.estado === 'agotado' ? { ...t, estado: 'cola' as const, fallos: 0, orden: orden++ } : t,
  );
  for (let i = 0; i < n; i++, id++, orden++) {
    nuevos.push({
      id,
      examen: EXAMENES_FICTICIOS[(id - 1) % EXAMENES_FICTICIOS.length],
      estado: 'cola',
      fallos: 0,
      proximo: 0,
      orden,
      resta: 0,
    });
  }
  return { ...s, trabajos: [...previos, ...nuevos], siguienteId: id, siguienteOrden: orden };
}

export function cortarCable(s: Simulacion): Simulacion {
  if (s.cableCortado) return s;
  return { ...s, cableCortado: true, vuelveEn: s.reloj + CORTE_MAX_MIN };
}

export function reconectar(s: Simulacion): Simulacion {
  if (!s.cableCortado) return s;
  return { ...s, cableCortado: false, vuelveEn: null };
}

/** ¿Queda algo por hacer o por esperar? */
export function ocupada(s: Simulacion): boolean {
  return s.cableCortado || s.trabajos.some((t) => t.estado !== 'listo' && t.estado !== 'agotado');
}

/**
 * Avanza el reloj `minutos` simulados. Devuelve el estado nuevo y lo que pasó, para anunciarlo.
 * Se parte en pasos cortos para que un cuadro lento no se salte una transición.
 */
export function avanzar(s: Simulacion, minutos: number): { s: Simulacion; eventos: Evento[] } {
  const eventos: Evento[] = [];
  let actual = s;
  let resto = Math.max(0, minutos);
  while (resto > 0) {
    const paso = Math.min(resto, 5);
    resto -= paso;
    actual = pasoUnico(actual, paso, eventos);
  }
  return { s: actual, eventos };
}

function pasoUnico(s: Simulacion, minutos: number, eventos: Evento[]): Simulacion {
  const reloj = s.reloj + minutos;
  let cableCortado = s.cableCortado;
  let vuelveEn = s.vuelveEn;
  if (cableCortado && vuelveEn !== null && reloj >= vuelveEn) {
    cableCortado = false;
    vuelveEn = null;
    eventos.push({ tipo: 'vuelve' });
  }

  let siguienteOrden = s.siguienteOrden;
  let filas = s.filas;
  const trabajos = s.trabajos.map((t) => ({ ...t }));

  // Los que cumplieron su espera vuelven a la cola, al final.
  for (const t of trabajos) {
    if (t.estado === 'espera' && reloj >= t.proximo) {
      t.estado = 'cola';
      t.orden = siguienteOrden++;
      eventos.push({ tipo: 'reintento', id: t.id });
    }
  }

  // Un solo trabajador: atiende un trabajo a la vez.
  let enCurso = trabajos.find((t) => t.estado === 'leyendo' || t.estado === 'enviando');
  if (!enCurso) {
    const siguiente = trabajos
      .filter((t) => t.estado === 'cola')
      .reduce<Trabajo | undefined>((a, b) => (!a || b.orden < a.orden ? b : a), undefined);
    if (siguiente) {
      siguiente.estado = 'leyendo';
      siguiente.resta = LECTURA_MIN;
      enCurso = siguiente;
    }
  }

  if (enCurso) {
    enCurso.resta -= minutos;
    if (enCurso.resta <= 0) {
      if (enCurso.estado === 'leyendo') {
        enCurso.estado = 'enviando';
        enCurso.resta = ENVIO_MIN;
      } else if (cableCortado) {
        enCurso.fallos++;
        if (enCurso.fallos > REINTENTOS_MIN.length) {
          enCurso.estado = 'agotado';
          eventos.push({ tipo: 'agotado', id: enCurso.id });
        } else {
          const espera = REINTENTOS_MIN[enCurso.fallos - 1];
          enCurso.estado = 'espera';
          enCurso.proximo = reloj + espera;
          eventos.push({ tipo: 'fallo', id: enCurso.id, espera, intento: enCurso.fallos });
        }
      } else {
        enCurso.estado = 'listo';
        filas = [...filas, enCurso.examen];
        eventos.push({ tipo: 'fila', id: enCurso.id });
      }
    }
  }

  return { ...s, reloj, cableCortado, vuelveEn, trabajos, filas, siguienteOrden };
}

/** "8:30 a. m." a partir de minutos desde la medianoche. */
export function horaDelDia(minutos: number): string {
  const total = Math.floor(minutos) % (24 * 60);
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'a. m.' : 'p. m.'}`;
}

/** "1 h 25 min", "40 min". */
export function duracion(minutos: number): string {
  const total = Math.max(0, Math.ceil(minutos));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "30 min", "2 h", "6 h" para las esperas fijas. */
export function etiquetaEspera(minutos: number): string {
  return minutos < 60 ? `${minutos} min` : `${minutos / 60} h`;
}
