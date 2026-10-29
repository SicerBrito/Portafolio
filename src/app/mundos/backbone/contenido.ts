/**
 * Texto del mundo Backbone de IA (prometeo-backbone).
 * Fuentes: contenido/proyectos.ts, investigacion/30_proyecto-backbone.md (verificado con git) y
 * el propio repositorio del proyecto.
 * Lo construyó OTRO desarrollador del equipo: aquí se le da el crédito sin nombrarlo.
 * Nada de URLs, hosts, IP, nombres de bases, usuarios sembrados, claves ni formato de llaves.
 * Toda conversación, skill, dirección y cifra de uso que aparece aquí es FICTICIA y la página lo dice.
 */

/** Una entrada de la bitácora: el riel lateral la usa para navegar. */
export interface EntradaBitacora {
  id: string;
  cuando: string;
  titulo: string;
  /** De quién es lo que cuenta la entrada: el riel lo pinta. */
  de: 'otro' | 'mixto' | 'mio' | 'nadie';
}

export const BITACORA: EntradaBitacora[] = [
  // Git registra sus commits el martes 20; cuándo lo escribió no consta: por eso "hasta".
  { id: 'bb-construido', cuando: 'Hasta el martes 20 de octubre', titulo: 'Lo crea otro desarrollador', de: 'otro' },
  { id: 'bb-pregunta', cuando: 'Cómo responde', titulo: 'La vida de una pregunta', de: 'mixto' },
  { id: 'bb-auditoria', cuando: 'Miércoles 21', titulo: 'Lo recibo y lo audito', de: 'mio' },
  { id: 'bb-commit', cuando: 'Jueves 22, 10:45', titulo: 'Un commit para producción', de: 'mio' },
  { id: 'bb-despliegue', cuando: 'Jueves 22, en la noche', titulo: 'Despliegue y prueba desde afuera', de: 'mio' },
  { id: 'bb-autoria', cuando: 'Según git, al 22 de octubre', titulo: 'Quién hizo qué', de: 'nadie' },
  // Fecha de corte de la investigación: "hoy" envejece mal en un portafolio.
  { id: 'bb-hoy', cuando: 'Al 27 de octubre', titulo: 'Lo que todavía falta', de: 'nadie' },
];

/**
 * Los tres commits del otro desarrollador según git: hora y tamaño. Sus mensajes no se
 * publican: puestos junto al mío se leerían como una comparación, y no es el punto.
 */
export const COMMITS_ORIGEN = [
  { hora: '10:15', detalle: '81 archivos' },
  { hora: '10:51', detalle: '50 archivos' },
  { hora: '11:11', detalle: '2 archivos' },
];

/** Lo que construyó el otro desarrollador. Nada de esto es mío. */
export const OBRA_ORIGEN = [
  {
    titulo: 'Arquitectura por capas',
    texto: 'Dominio, aplicación, infraestructura y web separados, con cada función en su propia rebanada.',
  },
  {
    titulo: 'La API del agente',
    texto: 'Un punto de entrada para chatear, con respuesta completa o en streaming, protegido por llave.',
  },
  {
    titulo: 'El panel',
    texto: 'Uso y costo, usuarios y llaves, skills, configuración y un área para probar el chat. Hecho en Blazor.',
  },
  {
    titulo: 'Aprendizaje supervisado',
    texto: 'El agente propone qué recordar y una persona lo aprueba antes de que cuente.',
  },
  {
    titulo: '60 pruebas E2E',
    texto: 'Ocho suites con Playwright, que recorren el panel y la API como lo haría una persona.',
  },
];

export interface PasoPregunta {
  titulo: string;
  texto: string;
  /** Progreso de la escena (0..1) que deja este paso a la vista. */
  momento: number;
  /** Desde qué progreso se considera activo con el scroll. */
  desde: number;
  /** El paso describe algo que cambié yo. */
  mio?: boolean;
}

/** Los momentos coinciden con MOMENTOS_PREGUNTA de la escena (no se importan: traerían three). */
export const PASOS_PREGUNTA: PasoPregunta[] = [
  {
    titulo: 'Una plataforma pregunta',
    texto:
      'Así está diseñado: alguien escribe en el chat de AHDO o de Ocupasalud 2.0. El servidor de esa plataforma reenvía el mensaje al backbone con su propia llave. La llamada nunca sale del navegador de la persona.',
    momento: 0.06,
    desde: 0,
  },
  {
    titulo: 'La puerta de la llave',
    texto:
      'Una petición sin llave válida rebota con un 401 y no llega al agente. Cada plataforma tiene la suya, y se administra desde el panel.',
    momento: 0.2,
    desde: 0.13,
  },
  {
    titulo: 'El cupo de cada llave',
    texto:
      'Un limitador reparte fichas por llave y las repone cada pocos segundos. Si una plataforma gasta las suyas, recibe un 429 y espera, sin frenar a la otra.',
    momento: 0.34,
    desde: 0.27,
  },
  {
    titulo: 'El agente y sus skills',
    texto:
      'El agente responde con Claude. Ve cada skill como una tarjeta con nombre y descripción, y cuando la pregunta coincide con una, la carga y sigue sus instrucciones. Cada plataforma ve solo las skills que se le asignan: desde mi cambio, nacen sin ninguna.',
    momento: 0.5,
    desde: 0.42,
    mio: true,
  },
  {
    titulo: 'Una skill consulta un sistema',
    texto:
      'Si la skill trae herramientas HTTP, el agente llama al sistema de la empresa para traer el dato. Antes de abrir la conexión se revisa a dónde va de verdad: la red de metadatos de la nube queda por fuera, y el intento vuelve al agente como un error de texto.',
    momento: 0.65,
    desde: 0.58,
    mio: true,
  },
  {
    titulo: 'La respuesta vuelve letra por letra',
    texto:
      'El backbone contesta en streaming: eventos con el texto a medida que sale, un aviso cuando carga una skill y uno final con los tokens usados. Si el streaming falla a mitad de camino, ahora el error queda registrado.',
    momento: 0.8,
    desde: 0.72,
    mio: true,
  },
  {
    titulo: 'El recibo',
    texto:
      'Cada respuesta queda registrada con su modelo y sus tokens. El panel calcula el costo con la tarifa del modelo que respondió y no con una sola tarifa para todos.',
    momento: 0.96,
    desde: 0.88,
    mio: true,
  },
];

/** La conversación de ejemplo que recorre la escena. Ficticia: no sale de ningún sistema real. */
export const CONVERSACION_EJEMPLO = {
  pregunta: '¿Qué cursos de seguridad vial hay abiertos este mes?',
  skill: 'catalogo-cursos',
  respuesta:
    'Hay tres abiertos: manejo defensivo, primeros auxilios en la vía y normas de tránsito. ¿Te paso el enlace de alguno?',
  modelo: 'Claude Haiku 4.5',
  entrada: '1.840',
  salida: '96',
};

/** Lo que encontré al recibirlo. Solo lo que ya quedó arreglado: nada pendiente va aquí. */
export interface Hallazgo {
  tema: string;
  encontrado: string;
  arreglo: string;
}

export const HALLAZGOS: Hallazgo[] = [
  {
    tema: 'Acceso',
    encontrado:
      'Venía pensado para desarrollo: sembraba usuarios de prueba con claves débiles y los volvía a crear en cada arranque si se les cambiaba el correo o se borraban.',
    arreglo: 'La siembra depende del entorno. En producción solo nace un administrador inicial con clave fuerte.',
  },
  {
    tema: 'Acceso',
    encontrado: 'El inicio de sesión del panel aceptaba intentos sin límite.',
    arreglo: 'Diez intentos cada cinco minutos, con aviso en pantalla.',
  },
  {
    tema: 'Aislamiento',
    encontrado:
      'Cada sistema conectado nacía viendo todas las skills: AHDO habría podido usar las de Ocupasalud, que consultan los sistemas de otra empresa.',
    arreglo: 'Las plataformas y los usuarios nuevos nacen sin skills. Cada skill se asigna a mano.',
  },
  {
    tema: 'Red',
    encontrado:
      'Las herramientas de las skills podían llamar a cualquier dirección, incluida la red de metadatos de la nube, y esa dirección la decide en parte el modelo.',
    arreglo: 'La conexión rechaza la red de metadatos al abrir el socket.',
  },
  {
    tema: 'Costo',
    encontrado: 'El tablero calculaba todo con la tarifa de un solo modelo.',
    arreglo: 'Cada respuesta se cobra con la tarifa de su modelo.',
  },
  {
    tema: 'Registro',
    encontrado:
      'El chat en streaming no dejaba rastro cuando fallaba y aceptaba mensajes de más de 20.000 caracteres, que el chat sin streaming sí rechazaba.',
    arreglo: 'Registra sus errores y rechaza los mensajes demasiado largos, igual que el otro.',
  },
  {
    tema: 'Publicación',
    encontrado: 'La configuración de desarrollo viajaba dentro de la aplicación publicada.',
    arreglo: 'Ya no se publica.',
  },
  {
    tema: 'Panel',
    encontrado:
      'El chat de prueba se quedaba bloqueado al enviar con Enter, botones e interruptores no anunciaban su estado a los lectores de pantalla y la lista de usuarios se desbordaba en el celular.',
    arreglo: 'Los tres quedaron corregidos.',
  },
];

/** Los pasos del despliegue en el servidor de producción de AHDO. Sin hosts, rutas, dominio ni certificado. */
export const DESPLIEGUE = [
  {
    titulo: '.NET 10 junto al .NET 8 de AHDO',
    texto:
      'El paquete de hosting se instaló en horario bajo: reiniciar IIS deja a AHDO sin servicio unos segundos.',
  },
  { titulo: 'WebSockets en IIS', texto: 'El panel está hecho en Blazor y vive de una conexión abierta con el servidor.' },
  {
    titulo: 'Casa propia dentro del servidor',
    texto: 'Sitio, grupo de aplicaciones y base de datos propios, para que un fallo del backbone no toque a AHDO.',
  },
  {
    titulo: 'La causa de la caída',
    texto:
      'En local arrancaba y en el servidor no. La causa era un valor inválido en la configuración de registros.',
  },
  { titulo: 'HTTPS', texto: 'El panel y la API quedaron publicados con HTTPS.' },
];

/** La validación desde afuera, tal como la registra la documentación del despliegue. Sin rutas ni direcciones. */
export const PRUEBAS_AFUERA = [
  { orden: 'Chequeo de salud', espera: 'ok', nota: 'la aplicación está viva' },
  { orden: 'Abrir el panel', espera: 'carga', nota: 'Blazor responde' },
  { orden: 'WebSocket del panel', espera: '101', nota: 'la conexión abierta sube de protocolo' },
  { orden: 'API sin llave', espera: '401', nota: 'la puerta está cerrada' },
];

/** Estado de hoy, sin cifras de uso: no se publican ni se consultaron. */
export const ESTADO_HOY = [
  { que: 'Panel', estado: 'Desplegado', bien: true },
  { que: 'API del agente', estado: 'Desplegada y cerrada sin llave', bien: true },
  { que: 'AHDO', estado: 'Sin conectar', bien: false },
  { que: 'Ocupasalud 2.0', estado: 'Sin conectar', bien: false },
];
