/**
 * Texto y datos de ejemplo del mundo Conecta.
 * Fuentes: contenido/proyectos.ts, investigacion/30_proyecto-conecta.md y la documentación
 * del propio Conecta (envío automático y API pública). Todo dato de personas, mensajes y
 * cifras de uso que aparece aquí es FICTICIO y la página lo dice.
 */

export interface PasoRecorrido {
  titulo: string;
  texto: string;
  /** Progreso de la escena (0..1) que deja este paso a la vista. */
  momento: number;
  /** Desde qué progreso se considera activo con el scroll. */
  desde: number;
}

export const PASOS: PasoRecorrido[] = [
  {
    titulo: 'Tres nodos, tres empresas',
    texto:
      'El logo de Conecta son tres nodos: las empresas del grupo, unidas por un mismo canal. Hoy lo usan tres: Ocupasalud, Ocupasalud Bogotá y Autoaprender. Conecta queda en el centro: tiene el número de WhatsApp, el cupo y el acceso a Meta, y reparte. Bogotá entró como empresa propia porque tiene su propia base.',
    momento: 0.22,
    desde: 0,
  },
  {
    titulo: 'Un sistema pide el mensaje',
    texto:
      'Cada sistema se identifica con su propia llave y solo usa sus plantillas permitidas. Si el mismo pedido llega dos veces, Conecta no lo repite. Esta API pública se hizo en un día y traduce los rechazos de Meta a códigos estables. Su primer sistema conectado arranca en noviembre.',
    momento: 0.4,
    desde: 0.27,
  },
  {
    titulo: 'La válvula del tope diario',
    texto:
      'Antes de salir, el mensaje pasa por el tope propio de Conecta: personas distintas en 24 horas, sumadas entre todas las empresas. Si hay cupo, sigue. Si no, nada se pierde en silencio: la encuesta automática espera en fila y sale cuando hay cupo, y al sistema que pidió se le responde que reintente más tarde.',
    momento: 0.62,
    desde: 0.46,
  },
  {
    titulo: 'Llega al celular',
    texto:
      'La persona lo recibe en WhatsApp, con su plantilla y sus datos. El celular se inclina con tu teléfono o con el mouse, salvo si tu equipo pide reducir el movimiento. El mensaje y la persona son de ejemplo.',
    momento: 0.8,
    desde: 0.68,
  },
  {
    titulo: 'Los estados vuelven por el webhook',
    texto:
      'Meta le avisa a Conecta cuando el mensaje se envió, cuando se entregó y cuando se leyó. Por eso el panel muestra lo que de verdad llegó, y no solo lo que salió.',
    momento: 1,
    desde: 0.83,
  },
];

/**
 * Un pedido de ejemplo con la forma del contrato público (los campos que publica su
 * documentación). Plantilla, persona y referencia son ficticias; la llave y el celular van
 * tapados a propósito.
 */
export const PEDIDO_EJEMPLO = `POST /api/v1/mensajes
X-Api-Key: ••••••••••••

{
  "telefono": "+57 3•• ••• ••••",
  "plantilla": "aviso_de_ejemplo",
  "variables": ["María", "mañana a las 8:00"],
  "referencia": "cita-0001"
}

← 200 { "estado": "enviado", "repetido": false }`;

export const ESTADOS_ENTREGA = ['Enviado', 'Entregado', 'Leído'] as const;

// ---------------------------------------------------------------- la pregunta tiene su momento

/** La espera real de la encuesta del paciente hoy (investigacion/30_proyecto-conecta.md). */
export const ESPERA_HORAS = 6;
/** Cuántas veces, como máximo, puede insistir un formulario. */
export const RECORDATORIOS_MAX = 3;
/**
 * Ventana de envío DE EJEMPLO: la real es un ajuste del servicio (no de cada formulario) y no
 * se publica. Lo que cae fuera sale en la siguiente apertura.
 */
export const VENTANA_EJEMPLO = { desde: 7, hasta: 20 };

// ---------------------------------------------------------------- el formulario es dato

export type TipoBloque = 'escala' | 'si-no' | 'filas' | 'matriz' | 'texto';

export interface Bloque {
  tipo: TipoBloque;
  nombre: string;
  pregunta: string;
  /** Filas de la matriz. Las de 'filas' llegan con cada invitación: salen de MarcaFormulario. */
  opciones?: string[];
}

export const BLOQUES: Bloque[] = [
  { tipo: 'escala', nombre: 'Escala', pregunta: '¿Cómo calificas la atención que recibiste?' },
  { tipo: 'si-no', nombre: 'Sí o no', pregunta: '¿Te atendieron a la hora de tu cita?' },
  { tipo: 'filas', nombre: 'Filas dinámicas', pregunta: 'Califica cada consultorio que visitaste' },
  {
    tipo: 'matriz',
    nombre: 'Matriz',
    pregunta: '¿Qué tan claro fue cada paso?',
    opciones: ['Recepción', 'Entrega de resultados'],
  },
  { tipo: 'texto', nombre: 'Texto libre', pregunta: '¿Algo más que quieras contarnos?' },
];

export interface MarcaFormulario {
  id: 'ocupasalud' | 'autoaprender';
  nombre: string;
  formulario: string;
  /**
   * Las filas que llegan con cada invitación cambian con la empresa: en la IPS son los
   * consultorios visitados; en la escuela, los instructores de la clase práctica.
   */
  filas: { pregunta: string; opciones: string[] };
}

export const MARCAS_FORMULARIO: MarcaFormulario[] = [
  {
    id: 'ocupasalud',
    nombre: 'Ocupasalud',
    formulario: 'Encuesta de satisfacción',
    filas: { pregunta: 'Califica cada consultorio que visitaste', opciones: ['Consultorio 2', 'Consultorio 5'] },
  },
  {
    id: 'autoaprender',
    nombre: 'Autoaprender',
    formulario: 'Encuesta de clase práctica',
    filas: { pregunta: 'Califica a cada instructor de tu clase', opciones: ['Instructor A', 'Instructor B'] },
  },
];

/** Reparto de respuestas de ejemplo para lo que ya se respondió (porcentajes). */
export const RESPUESTAS_EJEMPLO: Record<TipoBloque, { etiqueta: string; valor: number }[]> = {
  escala: [
    { etiqueta: '5', valor: 52 },
    { etiqueta: '4', valor: 31 },
    { etiqueta: '3', valor: 11 },
    { etiqueta: '2', valor: 4 },
    { etiqueta: '1', valor: 2 },
  ],
  'si-no': [
    { etiqueta: 'Sí', valor: 81 },
    { etiqueta: 'No', valor: 19 },
  ],
  filas: [
    { etiqueta: 'Buena', valor: 74 },
    { etiqueta: 'Regular', valor: 21 },
    { etiqueta: 'Mala', valor: 5 },
  ],
  matriz: [
    { etiqueta: 'Claro', valor: 68 },
    { etiqueta: 'Regular', valor: 25 },
    { etiqueta: 'Confuso', valor: 7 },
  ],
  texto: [{ etiqueta: 'Comentarios', valor: 100 }],
};

// ---------------------------------------------------------------- la gerencia le pregunta a Claude

export interface Dato {
  valor: string;
  etiqueta: string;
  /** 'bien' pinta el visto; 'mirar' pinta el aviso con la tinta (sin rojo, como el panel). */
  tono?: 'bien' | 'mirar';
}

export interface Conversacion {
  pregunta: string;
  herramientas: string[];
  titulo: string;
  datos: Dato[];
  respuesta: string;
}

export const CONVERSACIONES: Conversacion[] = [
  {
    pregunta: '¿Está todo bien con los mensajes?',
    herramientas: ['esta_todo_bien', 'uso_del_canal', 'estado_del_canal'],
    titulo: '¿Está todo bien? · últimos 7 días',
    datos: [
      { valor: '97 %', etiqueta: 'de lo que salió llegó', tono: 'bien' },
      { valor: 'Al día', etiqueta: 'envío automático', tono: 'bien' },
      { valor: '18 %', etiqueta: 'del cupo de hoy', tono: 'bien' },
      { valor: '3', etiqueta: 'números sin WhatsApp', tono: 'mirar' },
    ],
    respuesta:
      'Sí. Esta semana llegó el 97 % de lo que salió y el envío automático va al día. Lo que no llegó fueron 3 números que no tienen WhatsApp: conviene corregirlos en la ficha de cada persona.',
  },
  {
    pregunta: '¿Cómo vamos con la encuesta de esta semana?',
    herramientas: ['listar_formularios', 'ver_resultados', 'ver_horarios'],
    titulo: 'Encuesta de satisfacción · esta semana',
    datos: [
      { valor: '412', etiqueta: 'respuestas' },
      { valor: '38 %', etiqueta: 'de los invitados respondió' },
      { valor: '4,6', etiqueta: 'promedio de 5' },
      { valor: '7 p. m.', etiqueta: 'la hora en que más responden' },
    ],
    respuesta:
      'Van 412 respuestas, el 38 % de los invitados. El promedio es 4,6 de 5. La gente responde sobre todo a las 7 de la noche, así que la espera de 6 horas está cayendo en buen momento.',
  },
  {
    pregunta: 'Dificultades por empresa',
    herramientas: ['resumen_del_grupo', 'cruzar_respuestas', 'leer_comentarios'],
    titulo: 'Dificultades por empresa · este mes',
    datos: [
      { valor: '12 %', etiqueta: 'Empresa A: tiempo de espera', tono: 'mirar' },
      { valor: '9 %', etiqueta: 'Empresa B: parqueadero', tono: 'mirar' },
      { valor: '6 %', etiqueta: 'Empresa C: horarios', tono: 'mirar' },
      { valor: '3', etiqueta: 'empresas comparadas' },
    ],
    respuesta:
      'La dificultad más nombrada cambia por empresa: en la A, el tiempo de espera; en la B, el parqueadero; en la C, los horarios. Te dejo los comentarios que lo explican.',
  },
];

// ---------------------------------------------------------------- lo que falta

/** Pendientes reales (proyectos.ts e investigacion/30_proyecto-conecta.md). */
export const PENDIENTES: string[] = [
  'La API pública ya está en producción. Su primer sistema conectado arranca en noviembre.',
  'Un número de WhatsApp propio por empresa y un asistente que responda, también en Facebook e Instagram, son etapas que no han empezado.',
];
