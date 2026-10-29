/**
 * El texto propio del mundo Ocupasalud. Sale de investigacion/30_proyecto-ocupasalud.md y de
 * contenido/proyectos.ts, verificado con git. Todo paciente, empresa, documento y cifra de las
 * demostraciones es ficticio y así se dice en pantalla.
 */

/** El turno del paciente de ejemplo. Ficticio. */
export const TURNO = 'A-027';

// ---------------------------------------------------------------- directorio de la sede

export interface Puesto {
  id: 'recepcion' | 'consultorios' | 'certificados' | 'facturacion';
  nombre: string;
  texto: string;
}

export const DIRECTORIO: Puesto[] = [
  {
    id: 'recepcion',
    nombre: 'Recepción',
    texto: 'Registra al trabajador que envía la empresa y lo pone en la cola de espera.',
  },
  {
    id: 'consultorios',
    nombre: 'Consultorios',
    texto:
      'Medicina, optometría, audiometría, cardiología, fonoaudiología, laboratorio y psicología. Cada profesional registra su examen.',
  },
  {
    id: 'certificados',
    nombre: 'Certificados e informes',
    texto: 'Al final, la IPS emite el certificado del trabajador y los informes.',
  },
  {
    id: 'facturacion',
    nombre: 'Facturación',
    texto: 'Y le cobra a la empresa que lo envió.',
  },
];

export const QUIENES_LO_USAN =
  'Recepción, los profesionales de cada consultorio, el certificador, facturación y los comerciales de cada IPS. Los pacientes validan sus certificados en rutas públicas.';

// ---------------------------------------------------------------- el recorrido

export interface PasoRecorrido {
  sala: string;
  titulo: string;
  texto: string;
  /** 'mio': aquí entra una integración que construí. 'sistema': así funcionaba ya. */
  de: 'mio' | 'sistema';
  nota?: string;
  /** Progreso al que lleva el paso (botones y móvil). */
  momento: number;
  /** Desde qué progreso se marca como activo con el scroll. */
  desde: number;
}

export const PASOS: PasoRecorrido[] = [
  {
    sala: 'Recepción',
    titulo: 'Llega el trabajador',
    texto:
      'Recepción lo registra y lo pone en la cola. En ese momento, el sistema agenda la encuesta de satisfacción para seis horas después.',
    de: 'mio',
    nota: 'El gancho que agenda la encuesta.',
    momento: 0.15,
    desde: 0,
  },
  {
    sala: 'Sala de espera',
    titulo: 'Espera su turno',
    texto:
      'Recepción marca a mano, después del ingreso, a quien viene por la sede VIP. Por eso la encuesta no sale de inmediato: a las seis horas, la prioridad de la cola ya dice si vino por la sede VIP o por la Principal.',
    de: 'sistema',
    momento: 0.31,
    desde: 0.22,
  },
  {
    sala: 'Consultorios',
    titulo: 'Pasa por sus exámenes',
    texto:
      'Medicina, optometría, audiometría y laboratorio. Cada profesional registra su examen en el sistema.',
    de: 'sistema',
    momento: 0.5,
    desde: 0.37,
  },
  {
    sala: 'Rayos X',
    titulo: 'El informe llega solo',
    texto:
      'El estudio se lee y se firma en una plataforma externa de radiología. Cuando el radiólogo firma, la plataforma avisa y el informe en PDF queda en la carpeta del paciente. Antes alguien lo bajaba y lo subía a mano.',
    de: 'mio',
    nota: 'Webhook con validación propia. Solo actúa en la IPS de radiología que usa esa plataforma.',
    momento: 0.76,
    desde: 0.66,
  },
  {
    sala: 'Salida',
    titulo: 'La pregunta, a su hora',
    texto:
      'Seis horas después del ingreso, el sistema decide si encuesta y le pide a Conecta que envíe la pregunta por WhatsApp. Si el trabajo se reintenta, la visita no recibe dos encuestas.',
    de: 'mio',
    nota: 'Solo en Ocupasalud y Ocupasalud Bogotá.',
    momento: 0.97,
    desde: 0.86,
  },
];

// ---------------------------------------------------------------- del papel al dato

/** Los campos que la IA saca de cada examen. Valores ficticios. */
export const CAMPOS_EXAMEN = ['Paciente', 'Examen', 'Resultado', 'Fecha'] as const;

export interface ExamenFicticio {
  paciente: string;
  examen: string;
  resultado: string;
  fecha: string;
}

export const EXAMENES_FICTICIOS: ExamenFicticio[] = [
  { paciente: 'Paciente de ejemplo 1', examen: 'Audiometría', resultado: 'Normal', fecha: '03/03/2026' },
  { paciente: 'Paciente de ejemplo 2', examen: 'Optometría', resultado: 'Normal', fecha: '04/03/2026' },
  { paciente: 'Paciente de ejemplo 3', examen: 'Laboratorio', resultado: 'Con hallazgo', fecha: '04/03/2026' },
  { paciente: 'Paciente de ejemplo 4', examen: 'Laboratorio', resultado: 'Normal', fecha: '05/03/2026' },
  { paciente: 'Paciente de ejemplo 5', examen: 'Audiometría', resultado: 'Con hallazgo', fecha: '06/03/2026' },
  { paciente: 'Paciente de ejemplo 6', examen: 'Optometría', resultado: 'Normal', fecha: '09/03/2026' },
];

/** Esperas de Hangfire entre intentos, en minutos: 30 min, 2 h y 6 h. */
export const REINTENTOS_MIN = [30, 120, 360] as const;

// ---------------------------------------------------------------- dos mundos, un bus

export const CLIENTE_FICTICIO = {
  nombre: 'Transportes Ejemplo S.A.S.',
  /** Empieza en 000: ningún NIT real tiene esa forma. */
  documento: '000 000 001',
  idAhdo: '7c1e4f2a-…-a90b',
  idOcupasalud: 4127,
};

export const CAMBIOS_FICTICIOS = [
  'Cambió el teléfono',
  'Cambió la dirección',
  'Cambió el correo de facturación',
  'Cambió el contacto',
  'Cambió la ciudad',
];

// ---------------------------------------------------------------- la constancia

export interface Evolucion {
  fecha: string;
  texto: string;
  /** Dónde quedó: lo que dice git. */
  donde: string;
}

/** Mi paso por el sistema, de lo más antiguo a lo más reciente (git, oct 2026). */
export const EVOLUCION: Evolucion[] = [
  {
    fecha: 'Ago – sep 2025',
    texto: 'Campo "Tipo de servicio" en el formulario de servicios y limpieza del frontend.',
    donde: 'Sistema actual',
  },
  {
    fecha: 'Dic 2025 – ene 2026',
    texto:
      'El informe firmado del radiólogo que llega solo, y la elección de sucursal (sede o unidad móvil) en la recepción de la IPS de radiología.',
    donde: 'Sistema actual',
  },
  {
    fecha: 'Mar – abr 2026',
    texto: 'Primer procesamiento en segundo plano del sistema: la IA que lee exámenes externos.',
    donde: 'Sistema actual',
  },
  {
    fecha: 'Oct 2026',
    texto: 'Encuesta de satisfacción por WhatsApp vía Conecta, también para Ocupasalud Bogotá.',
    donde: 'Sistema actual',
  },
  {
    fecha: 'Oct 2026',
    texto: 'Piloto de sincronización con AHDO por Kafka en la versión 2.0.',
    donde: 'Versión 2.0, sin fusionar',
  },
];

/**
 * Las piezas que git registra como creadas por mí. Se nombran por lo que hacen, no por sus
 * archivos: los nombres de clases internas no le dicen nada al visitante.
 */
export const PIEZAS_CREADAS = [
  'El webhook que recibe el informe firmado',
  'La lectura de exámenes con IA',
  'El trabajo en segundo plano de cada PDF',
  'El envío a la hoja de seguimiento',
  'El reproceso del histórico por fechas',
  'El trabajo que agenda la encuesta',
];

// ---------------------------------------------------------------- lo que falta

export const PENDIENTES: { titulo: string; texto: string }[] = [
  {
    titulo: 'El piloto con AHDO',
    texto: 'La sincronización por Kafka no está fusionada ni en producción. Viene apagada por configuración.',
  },
  {
    titulo: 'Qué está encendido en cada IPS',
    texto:
      'Git no permite verificar cuáles de mis funciones están desplegadas en cada IPS. Varias dependen de que la configuración las encienda.',
  },
  {
    titulo: 'La versión 2.0',
    texto: 'Ocupasalud 2.0 sigue en desarrollo y todavía no está en producción. En ella solo tengo los 2 commits del piloto.',
  },
];
