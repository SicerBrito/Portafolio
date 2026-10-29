/**
 * Texto propio del mundo Estudio de Video. Sale de contenido/proyectos.ts, de
 * investigacion/30_proyecto-studio.md y del plan técnico del motor (sin costos, cronogramas
 * ni proveedores). Lo diseñado y no construido lleva siempre estado 'disenado'.
 */

export type EstadoPieza = 'funciona' | 'disenado';

export const ETIQUETA_PIEZA: Record<EstadoPieza, string> = {
  funciona: 'Funciona',
  disenado: 'Diseñado, sin construir',
};

/** La página se recorre como un video: cada sección es una escena con su id. */
export interface EscenaPagina {
  id: string;
  nombre: string;
}

export const ESCENAS_PAGINA: EscenaPagina[] = [
  { id: 'e01', nombre: 'Entrada' },
  { id: 'e02', nombre: 'Arrastra el tiempo' },
  { id: 'e03', nombre: 'La tira de película' },
  { id: 'e04', nombre: 'El guion manda' },
  { id: 'e05', nombre: 'Tomas falsas' },
  { id: 'e06', nombre: 'Créditos' },
  { id: 'e07', nombre: 'Escenas sin rodar' },
  { id: 'e08', nombre: 'Próximo rollo' },
];

/**
 * La bajada de la entrada. No usa el resumen de proyectos.ts porque ese dice en presente
 * "FFmpeg une las fotos con la voz", y la voz está diseñada, no construida
 * (investigacion/30_proyecto-studio.md: "cuando esté completo, recibirá un documento…").
 */
export const BAJADA =
  'Un motor que, cuando esté completo, convertirá un documento en un video formativo animado. Cada fotograma es una página Angular que se dibuja sola y se fotografía, y FFmpeg une las fotos en un MP4. El video es el guion: se corrige editando el guion, no el video.';

export const SINOPSIS: { titulo: string; texto: string }[] = [
  {
    titulo: 'Qué es',
    texto:
      'Un motor para convertir un documento en un video formativo animado. Hoy es un prototipo: el render y la lectura de PDF y presentaciones ya funcionan; el guion con IA y la voz todavía no.',
  },
  {
    titulo: 'Para quién',
    texto:
      'Para AHDO, la plataforma de cursos del grupo. Serviría para llenar su catálogo y para hacer video formativo a partir de los manuales de cada empresa.',
  },
  {
    titulo: 'Cómo funciona',
    texto:
      'Cada escena es una página Angular que sabe dibujarse en cualquier fotograma. Playwright la fotografía cuadro a cuadro desde .NET y FFmpeg une las fotos en un MP4.',
  },
];

/** Los pasos de la tira de película. `desde` y `momento` van en el progreso 0..1 de la escena 3D. */
export interface PasoTira {
  titulo: string;
  texto: string;
  estado: EstadoPieza;
  /** Una segunda pieza del mismo paso que todavía es diseño. */
  nota?: string;
  desde: number;
  momento: number;
}

export const PASOS_TIRA: PasoTira[] = [
  {
    titulo: 'Entra un documento',
    texto:
      'Un PDF o una presentación. Un PDF no marca qué es un título: el motor lo deduce por el tamaño de la letra y agrupa las palabras en líneas.',
    estado: 'funciona',
    desde: 0,
    momento: 0.08,
  },
  {
    titulo: 'Un guion por escenas',
    texto:
      'La IA escribirá un guion en JSON: cada escena con su tipo, su texto, su duración y su hash. Se valida contra un esquema antes de renderizar.',
    estado: 'disenado',
    desde: 0.16,
    momento: 0.25,
  },
  {
    titulo: 'Una página que se dibuja sola',
    texto:
      'Cada escena es un componente Angular que calcula opacidad, posición y ancho a partir del número de fotograma. Playwright la abre en un Chromium sin ventana.',
    estado: 'funciona',
    nota: 'Las ilustraciones por escena están diseñadas, sin construir.',
    desde: 0.32,
    momento: 0.38,
  },
  {
    titulo: 'Una foto por fotograma',
    texto:
      'Playwright pide el fotograma 0, toma la foto, pide el 1, y así. En la prueba salieron 300 fotos de 1280 × 720, a unos 100 ms cada una.',
    estado: 'funciona',
    desde: 0.46,
    momento: 0.6,
  },
  {
    titulo: 'FFmpeg une las fotos',
    texto: 'FFmpeg pega las fotos en un MP4. El ensamblador ya acepta una pista de audio.',
    estado: 'funciona',
    nota: 'La voz narrada está diseñada, sin construir.',
    desde: 0.7,
    momento: 0.78,
  },
  {
    titulo: 'Sale el video',
    texto: 'La prueba dio 10 segundos de video en unos 30 segundos de render.',
    estado: 'funciona',
    nota: 'Publicarlo como clase de un curso en AHDO es hoja de ruta.',
    desde: 0.86,
    momento: 1,
  },
];

/** Etiquetas que siguen a cada pieza de la escena 3D. */
export const PIEZAS_TIRA: { id: string; nombre: string; estado: EstadoPieza }[] = [
  { id: 'documento', nombre: 'PDF y PPTX', estado: 'funciona' },
  { id: 'guion', nombre: 'Guion JSON', estado: 'disenado' },
  { id: 'ilustracion', nombre: 'Ilustraciones', estado: 'disenado' },
  { id: 'chromium', nombre: 'Chromium + Playwright', estado: 'funciona' },
  { id: 'cinta', nombre: '300 fotogramas', estado: 'funciona' },
  { id: 'voz', nombre: 'Voz narrada', estado: 'disenado' },
  { id: 'ffmpeg', nombre: 'FFmpeg', estado: 'funciona' },
  { id: 'mp4', nombre: 'MP4 de 10 s', estado: 'funciona' },
  { id: 'ahdo', nombre: 'Clase en AHDO', estado: 'disenado' },
];

/** Guion de ejemplo con datos ficticios. Los tipos `titulo` y `bullets` son los del contrato del plan. */
export interface EscenaGuion {
  id: string;
  tipo: 'titulo' | 'bullets';
  duracionSeg: number;
  texto: string;
}

export const VERSION_PLANTILLA = '1.3.0';
export const VERSION_PLANTILLA_NUEVA = '1.4.0';

export const GUION_EJEMPLO: EscenaGuion[] = [
  { id: 'e01', tipo: 'titulo', duracionSeg: 8, texto: 'Trabajo seguro en alturas' },
  { id: 'e02', tipo: 'bullets', duracionSeg: 14, texto: 'Revisa el arnés antes de cada uso' },
  { id: 'e03', tipo: 'bullets', duracionSeg: 10, texto: 'Ancla siempre a un punto firme' },
  { id: 'e04', tipo: 'bullets', duracionSeg: 12, texto: 'Nunca subas sin un compañero' },
  { id: 'e05', tipo: 'titulo', duracionSeg: 6, texto: 'Fin del módulo 1' },
];

/** Lo que todavía falta, dicho como escenas que no se han rodado. */
export const SIN_RODAR: { id: string; titulo: string; texto: string }[] = [
  {
    id: 'guion',
    titulo: 'Guion con IA',
    texto:
      'La IA escribirá el guion por partes: primero el esquema del video y después cada escena.',
  },
  {
    id: 'voz',
    titulo: 'Narración',
    texto:
      'Una voz con la marca de tiempo de cada palabra, para que el texto entre justo cuando se dice.',
  },
  {
    id: 'ilustracion',
    titulo: 'Ilustraciones',
    texto:
      'Una imagen por escena que, una vez aprobada, queda fija en el guion y no se vuelve a generar.',
  },
  {
    id: 'cache',
    titulo: 'Caché por escena',
    texto:
      'Cada escena guardada por su hash: corregir una frase no obliga a renderizar el video entero.',
  },
  {
    id: 'ahdo',
    titulo: 'Integración con AHDO',
    texto: 'Pantallas en la plataforma para pedir un video y publicarlo como clase de un curso.',
  },
];
