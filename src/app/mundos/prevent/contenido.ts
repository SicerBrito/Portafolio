/**
 * Contenido propio del mundo Prevent. Los requisitos y el catálogo salen del catálogo sembrado en
 * el código de la plataforma (versión de julio de 2025). Las personas, los documentos y los
 * teléfonos de las demostraciones son ficticios.
 */
import { CERTIFICADO, CUMBRE, SUELO, TRAMO, VALIDACION } from '../../escenas/prevent/fases';

export interface Requisito {
  nombre: string;
  detalle: string;
  /** Requisitos que aceptan uno de dos documentos. */
  alternativas?: readonly [string, string];
}

/** El curso del recorrido y sus documentos, en el orden del catálogo. */
export const CURSO_EJEMPLO = 'Reentrenamiento sectorial';

export const REQUISITOS: readonly Requisito[] = [
  { nombre: 'Copia de la cédula', detalle: 'El documento de identidad del trabajador.' },
  {
    nombre: 'Seguridad social o ARL',
    detalle:
      'El certificado de aportes a seguridad social, o el de la ARL con el radicado de afiliación a la EPS si el trabajador es nuevo.',
    alternativas: ['Aportes a seguridad social', 'ARL y radicado de EPS'],
  },
  {
    nombre: 'Concepto médico de aptitud para alturas',
    detalle: 'Positivo y con menos de un año.',
  },
  {
    nombre: 'Certificado del nivel anterior',
    detalle: 'El del curso avanzado T.S.A. o el de Trabajador autorizado.',
    alternativas: ['Avanzado T.S.A.', 'Trabajador autorizado'],
  },
];

/** Los documentos que se le piden a la empresa, aparte de los de cada trabajador. */
export const DOCUMENTOS_EMPRESA = ['RUT', 'Cámara de comercio', 'Cédula del representante legal', 'ARL'];

/**
 * Los 12 cursos del catálogo sembrado en la última versión, con sus nombres y en su orden.
 * Entrante, Vigía y Supervisor sueltos quedaron comentados en mayo de 2025: repetían los niveles
 * de espacios confinados. Sus perfiles de requisitos siguen sembrados, por eso hay 15 perfiles.
 */
export const CATALOGO: readonly string[] = [
  'Reentrenamiento sectorial',
  'Trabajador autorizado',
  'Coordinador',
  'Actualización de coordinador',
  'Administrador',
  'Administrativo para jefes de área en trabajo seguro en alturas',
  'Rescate vertical',
  'Arme y desarme de andamios',
  'Espacios confinados, nivel entrante',
  'Espacios confinados, nivel vigía',
  'Espacios confinados, nivel supervisor',
  'Espacios confinados, nivel administrador',
];

/** Los dos combos sembrados: niveles de espacios confinados que se piden juntos. */
export const COMBOS: readonly string[] = ['Combo entrante y vigía', 'Combo entrante, vigía y supervisor'];

export interface Paso {
  titulo: string;
  texto: string;
  /** Desde dónde manda este paso en el recorrido fijado. */
  desde: number;
  /** El punto del recorrido al que salta el paso en el celular o con los botones. */
  momento: number;
}

const enTramo = (i: number, f: number) => SUELO + TRAMO * i + TRAMO * f;

export const PASOS: readonly Paso[] = [
  {
    titulo: 'Abajo, la empresa inscribe a su gente',
    texto:
      'Prevent abre una solicitud con los cursos y los cupos que pidió la empresa, y la empresa inscribe a sus trabajadores. Cada inscripción es una matrícula, y cada matrícula exige los documentos de su curso.',
    desde: 0,
    momento: 0.06,
  },
  {
    titulo: 'Primer travesaño: la cédula',
    texto:
      'El archivo se sube, se previsualiza ahí mismo y se valida. Cuando queda válido, la línea de vida se engancha y se sigue subiendo.',
    desde: SUELO,
    momento: enTramo(0, VALIDACION + 0.12),
  },
  {
    titulo: 'Uno u otro documento',
    texto:
      'Seguridad social o ARL: el requisito acepta cualquiera de los dos y cuenta como uno solo. Por eso no bastaba con una lista fija de papeles.',
    desde: SUELO + TRAMO,
    momento: enTramo(1, VALIDACION + 0.12),
  },
  {
    titulo: 'El concepto médico',
    texto:
      'Aptitud para alturas, positiva y con menos de un año. Mientras falte, la matrícula no avanza, aunque todo lo demás esté en regla.',
    desde: SUELO + TRAMO * 2,
    momento: enTramo(2, VALIDACION + 0.12),
  },
  {
    titulo: 'El nivel anterior',
    texto:
      'Reentrenar exige haber hecho antes el curso avanzado o el de Trabajador autorizado. Otra vez, uno de dos documentos.',
    desde: SUELO + TRAMO * 3,
    momento: enTramo(3, VALIDACION + 0.12),
  },
  {
    titulo: 'Arriba: cuatro de cuatro válidos',
    texto:
      'Con todo validado, la matrícula avanza y el trabajador queda listo para certificarse. El certificado de la escena es un ejemplo con datos ficticios.',
    desde: CUMBRE,
    momento: (CERTIFICADO.hasta + 1) / 2,
  },
];

/** --------------------------------------------------- Del Excel a los trabajadores */

export interface FilaHoja {
  documento: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  /** Qué pasa con la fila al procesarla. */
  destino: 'nuevo' | 'existente' | 'omitida' | 'repetida';
}

/**
 * Una hoja de ejemplo: todo es ficticio, incluidos los números. Documentos y teléfonos empiezan
 * en 0, que ninguna cédula ni ningún celular de Colombia usa: no pueden ser de una persona real.
 */
export const HOJA: readonly FilaHoja[] = [
  { documento: ' 0.000.111.222', nombres: 'ANA maría', apellidos: 'RUIZ peña', telefono: '(000) 000-0101', destino: 'nuevo' },
  { documento: '0000-333-444 ', nombres: 'carlos ANDRÉS', apellidos: 'gómez', telefono: '000 000 0102', destino: 'existente' },
  { documento: '', nombres: 'pedro', apellidos: 'sin documento', telefono: '000-000-0103', destino: 'omitida' },
  { documento: '0.000.555.666', nombres: 'LUISA FERNANDA', apellidos: 'ospina', telefono: '+57 000 000 0104', destino: 'nuevo' },
  { documento: '0000111222', nombres: 'Ana María', apellidos: 'Ruiz Peña', telefono: '0000000101', destino: 'repetida' },
];

/** La solicitud de ejemplo: dos cursos del catálogo con los documentos que exige cada uno. */
export const SERVICIOS_SOLICITUD: readonly { nombre: string; documentos: readonly string[] }[] = [
  {
    nombre: 'Reentrenamiento sectorial',
    documentos: REQUISITOS.map((r) => r.nombre),
  },
  {
    nombre: 'Espacios confinados, nivel entrante',
    documentos: [
      'Copia de la cédula',
      'Seguridad social o ARL',
      'Concepto médico de aptitud para alturas',
      'Trabajador autorizado o reentrenamiento',
    ],
  },
];

export const RESULTADO_FILA: Record<FilaHoja['destino'], string> = {
  nuevo: 'Trabajador nuevo: se crea y se matricula en cada curso de la solicitud.',
  existente: 'Ya estaba en la plataforma: se actualizan sus datos y se matricula.',
  omitida: 'Fila sin documento: se salta.',
  repetida: 'Ya está matriculado en esta solicitud: se actualizan sus datos y no se matricula dos veces.',
};

/** Lo que hacen CapitalizarNombre y FormatearNumeros en la plataforma. */
export const capitalizar = (texto: string): string =>
  texto
    .trim()
    .toLocaleLowerCase('es')
    .split(' ')
    .map((p) => (p ? p[0].toLocaleUpperCase('es') + p.slice(1) : p))
    .join(' ');

export const soloDigitos = (texto: string): string => texto.replace(/\D/g, '');

/** --------------------------------------------------- Bitácora del relevo */

export interface Registro {
  fecha: string;
  texto: string;
  /** Lo que hizo otro desarrollador, antes o al lado: se marca distinto. */
  deOtro?: boolean;
}

export const BITACORA: readonly Registro[] = [
  { fecha: 'Sep 2024', texto: 'Otro desarrollador inicia el proyecto sobre la arquitectura de AHDO.', deOtro: true },
  { fecha: 'Dic 2024', texto: 'La plataforma llega a desplegarse, antes de que yo llegara.', deOtro: true },
  {
    fecha: 'Abr 2025',
    texto: 'Tomo el relevo: integro los cambios que estaban pendientes y trabajamos en conjunto unos días.',
  },
  { fecha: '14 abr 2025', texto: 'Desde aquí soy el único desarrollador activo.' },
  {
    fecha: 'Abr – may 2025',
    texto:
      'Reestructuro entidades y DTOs, y junto en una sola tabla lo que pide una empresa: cada servicio es un curso o un combo.',
  },
  {
    fecha: 'Abr – may 2025',
    texto: 'Retomo y amplío la inscripción masiva por Excel. La primera versión la había hecho el otro desarrollador.',
  },
  { fecha: 'May 2025', texto: 'Visto la plataforma con la identidad de Prevent: 276 de las 288 líneas del tema global son mías.' },
  { fecha: 'May – jun 2025', texto: 'Documentos requeridos por curso, con carga, previsualización, validación y conteo por matrícula.' },
  { fecha: 'Jul 2025', texto: 'Último commit: el modelo del certificado, una foto fija de los datos al expedirlo.' },
];

export const PENDIENTES: readonly string[] = [
  'Estuvo desplegado; hoy no está en producción.',
  'El certificado quedó como modelo y vista imprimible inicial: el proyecto se detuvo antes de terminar ese flujo.',
];
