import type { MundoId } from '../core/mundo';

export type ProyectoId = 'ahdo' | 'conecta' | 'estudio' | 'ocupasalud' | 'cuality' | 'prevent' | 'backbone';
export type TipoAutoria = 'desde-cero' | 'principal' | 'base' | 'relevo' | 'participacion' | 'produccion';
export type Estado = 'produccion' | 'desplegado' | 'prototipo' | 'inactivo';

/** Toda cifra lleva su fuente y su fecha de corte; sin ellas no compila. */
export interface Cifra {
  valor: string;
  etiqueta: string;
  fuente: string;
}

export interface Historia {
  titulo: string;
  problema: string;
  solucion: string;
}

export interface Proyecto {
  id: ProyectoId;
  mundo: MundoId;
  nombre: string;
  nombreLegal?: string;
  para: string;
  periodo: string;
  autoria: TipoAutoria;
  estado: Estado;
  resumen: string;
  papel: string;
  git: { resumen: string; nota: string };
  cifras: Cifra[];
  historias: Historia[];
  falta: string;
  stack: string[];
  /** Color de marca: pinta la nave del mapa y la fila de la lista. */
  color: string;
  mapa: { x: number; z: number; ancho: number; fondo: number; alto: number };
}

export const SELLO_AUTORIA: Record<TipoAutoria, string> = {
  'desde-cero': 'Desde cero',
  principal: 'Desarrollador principal',
  base: 'Fundé la base',
  relevo: 'Tomé el relevo',
  participacion: 'Participé',
  produccion: 'Lo llevé a producción',
};

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  produccion: 'En producción',
  desplegado: 'Desplegado',
  prototipo: 'Prototipo',
  inactivo: 'No productivo',
};

export const PROYECTOS: Proyecto[] = [
  {
    id: 'ahdo',
    mundo: 'ahdo',
    nombre: 'AHDO',
    nombreLegal: 'American Human Development Organization S.A.S.',
    para: 'Varias empresas del Grupo Empresarial Prometeo',
    periodo: 'May 2024 – hoy',
    autoria: 'principal',
    estado: 'produccion',
    resumen:
      'Una sola plataforma en la que varias empresas de un grupo forman, evalúan, certifican y facturan, cada una con su marca y sus precios.',
    papel:
      'Entré en mayo de 2024, cuando era una plantilla y una base de backend sin usuarios. Sobre esa base construí los módulos con los que hoy varias empresas del grupo corren sus procesos: facturación electrónica y cartera, precios por empresa que factura, psicometría digital para la IPS del grupo y evaluaciones prácticas de conductores. Desde junio de 2026 lidero su desarrollo, con un desarrollador a cargo.',
    git: {
      resumen: 'Más de 750 commits míos',
      nota: 'Al llegar, el backend tenía 21 controllers. Hoy tiene 91, y el 80 % de su código vigente es mío.',
    },
    cifras: [
      { valor: '204', etiqueta: 'empresas cliente', fuente: 'AHDO, ago 2026' },
      { valor: '11.210', etiqueta: 'matrículas gestionadas', fuente: 'AHDO, ago 2026' },
      { valor: '8.224', etiqueta: 'certificados emitidos', fuente: 'AHDO, ago 2026' },
      { valor: '21 → 91', etiqueta: 'controllers en la API desde que entré', fuente: 'git, oct 2026' },
    ],
    historias: [
      {
        titulo: 'Una plataforma, varias marcas de certificado',
        problema:
          'Cada empresa del grupo, y algunos clientes grandes, necesitan su propio certificado con su diseño legal.',
        solucion:
          'El certificado lo decide el proveedor del curso, que apunta a una plantilla. Agregar una marca nueva es configuración y una plantilla, sin tocar el backend. Hoy son 26 plantillas.',
      },
      {
        titulo: '¿A quién se le factura?',
        problema:
          'Lo más común era venderle un servicio a un cliente y cobrárselo a otra empresa del grupo, con su tarifa especial. El modelo anterior obligaba a disfrazar al cliente.',
        solucion:
          'Cada servicio del cliente sabe a quién se le factura: a su propio tercero o a una empresa del grupo, con un tarifario central. La factura se agrupa por ese dato y la matrícula guarda cliente, tercero y destinatario.',
      },
      {
        titulo: 'Del papel de la IPS a un motor de pruebas',
        problema:
          'La IPS del grupo aplicaba en papel sus pruebas psicológicas, y las que ya eran digitales estaban hechas a mano, una por una.',
        solucion:
          'Un motor en el que la prueba es un dato y no código: preguntas, saltos condicionales y reglas de calificación se configuran. Incorporar una prueba pasó de semanas de desarrollo a un día de configuración.',
      },
      {
        titulo: 'Facturación electrónica DIAN y cartera',
        problema:
          'Facturar ante la DIAN y llevar la cartera de las empresas cliente sin pasar datos a mano de un sistema a otro.',
        solucion:
          'La factura nace como borrador en la plataforma y se emite vía Siigo en un solo envío. El saldo se calcula desde un libro de pagos, y los abonos se anulan en vez de borrarse.',
      },
    ],
    falta:
      'No tiene pruebas automatizadas ni integración continua. La sincronización con la nueva plataforma del grupo por Kafka es un piloto: probado, todavía no en producción.',
    stack: ['.NET 8', 'EF Core', 'PostgreSQL', 'Angular 17', 'Hangfire', 'Wompi', 'Siigo · DIAN', 'Claude API', 'JasperReports', 'BunnyCDN'],
    color: '#8b5ffc',
    mapa: { x: 0, z: 0, ancho: 3, fondo: 2.4, alto: 2 },
  },
  {
    id: 'conecta',
    mundo: 'conecta',
    nombre: 'Conecta',
    nombreLegal: 'PrometeoConecta',
    para: 'Ocupasalud, Ocupasalud Bogotá y Autoaprender',
    periodo: 'Sep – oct 2026',
    autoria: 'desde-cero',
    estado: 'produccion',
    resumen:
      'El canal de WhatsApp y formularios del grupo. Varias empresas lo usan para que avisos, encuestas y formularios lleguen al celular de pacientes, estudiantes y trabajadores, y la gerencia ve en un panel qué llegó y qué respondió la gente.',
    papel:
      'Lo concebí, lo diseñé, lo programé y lo puse en producción desde cero, con desarrollo asistido por IA. Soy el único autor de su repositorio: backend .NET, integración con Meta, panel Angular, una API pública para otros sistemas y un servidor MCP para que la gerencia consulte resultados conversando con Claude.',
    git: { resumen: '19 de 19 commits', nota: 'Único autor del repositorio, del 1 al 27 de octubre de 2026.' },
    cifras: [
      { valor: '1', etiqueta: 'autor en todo el repositorio', fuente: 'git, oct 2026' },
      { valor: '181', etiqueta: 'pruebas automatizadas con xUnit', fuente: 'repositorio, oct 2026' },
      { valor: '23', etiqueta: 'herramientas MCP de solo lectura', fuente: 'repositorio, oct 2026' },
      { valor: '3', etiqueta: 'empresas del grupo lo usan hoy', fuente: 'Conecta, oct 2026' },
    ],
    historias: [
      {
        titulo: 'Meta acepta el mensaje y no lo entrega',
        problema:
          'Al pasar cierto volumen diario, Meta acepta un mensaje sin error y nunca lo entrega, y el campo oficial que debía avisarlo estaba desactualizado. La falla era silenciosa.',
        solucion:
          'Conecta lleva su propio tope de personas por 24 horas, sumado entre todas las empresas. Lo que pasa del tope espera en fila y sale cuando hay cupo, y los estados de entrega llegan por el webhook de Meta.',
      },
      {
        titulo: 'La pregunta tiene su momento',
        problema:
          'Al paciente no se le pregunta por su visita mientras sigue en la sala de espera, y nadie va a mandar encuestas a mano un sábado en la noche.',
        solucion:
          'La plataforma de la IPS avisa al ingreso y al final. El formulario, no el sistema que llama, decide la espera, los recordatorios y la ventana horaria, y un repartidor en segundo plano envía cuando corresponde.',
      },
      {
        titulo: 'El formulario es dato',
        problema:
          'Las encuestas cambian con el negocio, pero ya tienen respuestas, y editar una pregunta respondida falsearía lo que la gente contestó.',
        solucion:
          'Los formularios se arman desde el panel, sin programar. Una pregunta con respuestas no se edita: se retira, conserva lo respondido y su reemplazo entra al lado.',
      },
      {
        titulo: 'Una API pública en un día',
        problema: 'Un sistema externo de turnos necesitaba mandar avisos por WhatsApp con poco margen de tiempo.',
        solucion:
          'Cada sistema tiene su llave, sus plantillas permitidas y detección de duplicados. Los rechazos de Meta se traducen a códigos estables, y la documentación pública sale del propio código.',
      },
      {
        titulo: 'La gerencia le pregunta a Claude',
        problema: 'La gerencia quería preguntar en español cómo va una encuesta y recibir informes sin entrar al panel.',
        solucion:
          'Un servidor MCP escrito a mano sobre JSON-RPC 2.0, con 23 herramientas de solo lectura que usan los mismos servicios del panel: el chat y la pantalla dan las mismas cifras. Está en producción.',
      },
    ],
    falta:
      'La API pública ya está en producción y su primer sistema conectado arranca en noviembre.',
    stack: ['.NET 8', 'EF Core 8', 'PostgreSQL', 'Angular 17', 'WhatsApp Cloud API', 'MCP · JSON-RPC 2.0', 'xUnit', 'OpenAPI'],
    color: '#dcab2f',
    mapa: { x: 4.8, z: -2.4, ancho: 2.2, fondo: 1.8, alto: 1.5 },
  },
  {
    id: 'estudio',
    mundo: 'estudio',
    nombre: 'Estudio de Video',
    nombreLegal: 'AcademiaStudio',
    para: 'AHDO',
    periodo: 'Sep 2026',
    autoria: 'desde-cero',
    estado: 'prototipo',
    resumen:
      'El prototipo de un motor para convertir un documento en un video formativo animado. Cada fotograma es una página Angular que se dibuja sola y se fotografía, y FFmpeg une las fotos en un MP4; la voz está en la hoja de ruta. El video es el guion: se corrige editando el guion, no el video.',
    papel:
      'Lo diseñé desde cero y validé el render con una prueba de concepto: 300 fotogramas que se vuelven 10 segundos de video. La lectura de PDF y presentaciones ya está escrita y con pruebas. El guion con IA, la voz y la integración con la plataforma siguen en la hoja de ruta.',
    git: { resumen: '2 de 2 commits', nota: 'Único autor, septiembre de 2026.' },
    cifras: [
      { valor: '300', etiqueta: 'fotogramas en la prueba de render', fuente: 'repositorio, sep 2026' },
      { valor: '~100 ms', etiqueta: 'por fotograma', fuente: 'prueba de render, sep 2026' },
      { valor: '0', etiqueta: 'licencias de render', fuente: 'arquitectura propia, sep 2026' },
    ],
    historias: [
      {
        titulo: 'Un video que es una página',
        problema:
          'Producir video animado sin pagar licencia por render y sin meter otro lenguaje en un equipo que trabaja en .NET y Angular.',
        solucion:
          'Cada escena es un componente Angular que calcula su estado a partir del número de fotograma. Desde .NET, Playwright fotografía cada fotograma en un Chromium sin ventana y FFmpeg une las fotos.',
      },
      {
        titulo: 'Fotografiar el fotograma correcto',
        problema:
          'Si la foto se toma justo después de cambiar el estado, sale el fotograma anterior porque el navegador todavía no ha repintado, y ningún error lo avisa.',
        solucion:
          'Cada salto de fotograma espera dos cuadros del navegador antes de resolverse: el primero corre antes del repintado y el segundo después.',
      },
      {
        titulo: 'Los fotogramas en blanco se volvieron una prueba',
        problema: 'Si se fotografía antes de que carguen las fuentes, los primeros fotogramas salen en blanco y nada falla.',
        solucion:
          'La plantilla solo avisa que está lista cuando cargaron fuentes e imágenes, y una prueba automática falla si el video sale sospechosamente liviano.',
      },
    ],
    falta:
      'No está en producción. El guion con IA, la narración, las ilustraciones y la caché por escena están diseñados, no construidos.',
    stack: ['.NET 8', 'Playwright', 'FFmpeg', 'Angular 17', 'PdfPig', 'Open XML', 'xUnit'],
    color: '#aaaaff',
    mapa: { x: -3.9, z: -2.7, ancho: 1.8, fondo: 1.4, alto: 1.1 },
  },
  {
    id: 'ocupasalud',
    mundo: 'ocupasalud',
    nombre: 'Ocupasalud',
    para: 'Ocupasalud y otras IPS del grupo',
    periodo: 'Ago 2025 – oct 2026',
    autoria: 'participacion',
    estado: 'produccion',
    resumen:
      'El sistema con el que varias IPS de salud ocupacional atienden a los trabajadores que envían las empresas: recepción, cola, consultorios, certificados y facturación. Existe desde 2017.',
    papel:
      'Me encargué de integraciones y flujos en un sistema que construyeron otros desarrolladores. El informe firmado del radiólogo llega solo a la historia del paciente, una IA lee en segundo plano los exámenes en PDF de IPS externas y la encuesta de satisfacción sale por WhatsApp a través de Conecta. En su nueva versión desarrollé el piloto de sincronización con AHDO.',
    git: {
      resumen: '27 commits míos en el sistema actual',
      nota: 'En la versión 2.0, 2 commits: el piloto de sincronización, todavía sin fusionar.',
    },
    cifras: [
      { valor: '27', etiqueta: 'commits en el sistema actual', fuente: 'git, oct 2026' },
      { valor: '3', etiqueta: 'integraciones construidas', fuente: 'git, oct 2026' },
    ],
    historias: [
      {
        titulo: 'El informe del radiólogo llega solo',
        problema:
          'Los estudios se leen y firman en una plataforma externa, y alguien tenía que bajar el informe y subirlo a mano al examen del paciente.',
        solucion:
          'Un webhook con validación propia: cuando la plataforma avisa que un estudio quedó firmado, el sistema guarda el evento para auditoría, encuentra la orden y deja el PDF enlazado al examen.',
      },
      {
        titulo: 'IA que lee exámenes en PDF',
        problema:
          'Las IPS externas mandan resultados en PDF y había que pasar sus datos a una hoja de seguimiento, además de un histórico que nadie había digitado.',
        solucion:
          'Llevé al sistema el procesamiento en segundo plano: cada PDF es un trabajo que una IA convierte en datos estructurados, con reintentos a los 30 minutos, 2 horas y 6 horas, y un reproceso por rango de fechas.',
      },
      {
        titulo: 'Dos sistemas, un mismo cliente',
        problema:
          'AHDO y la nueva versión de Ocupasalud tienen los mismos clientes en bases distintas, con identificadores distintos, y ninguna puede depender de que la otra esté arriba.',
        solucion:
          'Cada cambio se escribe en una bandeja de salida dentro de la misma transacción y viaja cifrado por Kafka. Los conflictos van a revisión. Es un piloto: probado y sin fusionar.',
      },
    ],
    falta: 'El piloto de sincronización con la nueva versión no está fusionado ni en producción.',
    stack: ['ASP.NET Web API', 'SQL Server', 'Hangfire', 'Claude API', 'Webhooks', 'Kafka (piloto)', '.NET 10 (versión 2.0)'],
    color: '#0077bd',
    mapa: { x: 5.2, z: 2.9, ancho: 2.8, fondo: 2.2, alto: 1.7 },
  },
  {
    id: 'cuality',
    mundo: 'cuality',
    nombre: 'Cuality',
    para: 'Cuality GAC S.A.S.',
    periodo: 'Ene – mar 2026',
    autoria: 'base',
    estado: 'inactivo',
    resumen:
      'Un sistema para que los evaluadores hagan estudios de puesto de trabajo a los empleados de las empresas cliente.',
    papel:
      'Arranqué el proyecto: creé los repositorios y monté la base, con arquitectura .NET 8 y Angular 19, autenticación JWT y permisos granulares que también arman el menú. Después lo entregué, y los módulos de estudios los construyó otro desarrollador.',
    git: { resumen: 'Construcción inicial completa', nota: 'Repositorios creados por mí en enero de 2026.' },
    cifras: [
      { valor: '100', etiqueta: 'archivos en la construcción inicial del backend', fuente: 'git, ene 2026' },
      { valor: '72', etiqueta: 'archivos en la del frontend', fuente: 'git, ene 2026' },
    ],
    historias: [
      {
        titulo: 'Permisos que arman el menú',
        problema:
          'Hacían falta permisos finos desde el primer día, con menús y botones que aparecen según lo que cada quien puede hacer, sin escribir una política por cada permiso.',
        solucion:
          'Cualquier permiso que llega a la autorización se convierte al vuelo en una política, con los permisos del rol y los del usuario en caché. Un árbol de módulos, páginas y componentes alimenta el menú del frontend.',
      },
      {
        titulo: 'El error que solo aparecía en el servidor',
        problema: 'Las fotos de usuario se guardaban en una carpeta que en el servidor no existía.',
        solucion:
          'El almacenamiento pasó a una carpeta propia que se crea si falta y se sirve como estática, sin depender de la estructura del proyecto web.',
      },
    ],
    falta: 'Nunca salió a producción.',
    stack: ['.NET 8', 'EF Core 8', 'PostgreSQL', 'Angular 19', 'JWT', 'Angular Material'],
    color: '#0060a3',
    mapa: { x: -4.8, z: 2.2, ancho: 1.8, fondo: 1.5, alto: 1.2 },
  },
  {
    id: 'prevent',
    mundo: 'prevent',
    nombre: 'Prevent',
    para: 'Prevent Group S.A.S.',
    periodo: 'Abr – jul 2025',
    autoria: 'relevo',
    estado: 'inactivo',
    resumen:
      'La plataforma del centro de entrenamiento en trabajo seguro en alturas y espacios confinados: las empresas piden cursos, inscriben a sus trabajadores y cada matrícula exige sus documentos.',
    papel:
      'Lo inició otro desarrollador. Lo trabajamos en conjunto y después quedé como único desarrollador activo: reestructuré el modelo de solicitudes, construí los documentos requeridos por curso con su validación, rehíce la inscripción masiva por Excel y le di a la interfaz la identidad de Prevent.',
    git: { resumen: '38 commits míos', nota: 'De abril a julio de 2025.' },
    cifras: [
      { valor: '12', etiqueta: 'cursos de alturas y confinados, más 2 combos, en el catálogo', fuente: 'repositorio, jul 2025' },
      { valor: '38', etiqueta: 'commits míos', fuente: 'git, jul 2025' },
    ],
    historias: [
      {
        titulo: 'Cada curso exige sus papeles',
        problema:
          'En trabajo en alturas no se certifica a nadie sin soportes, y cada nivel pide algo distinto, a veces uno u otro documento.',
        solucion:
          'Cada curso declara sus documentos requeridos, incluidos los alternativos. Cada documento se sube, se previsualiza y se valida, y la matrícula muestra cuántos van cargados, válidos y pendientes.',
      },
      {
        titulo: 'Del Excel a los trabajadores',
        problema:
          'Las empresas mandan listas en Excel con nombres en cualquier formato, documentos con símbolos y gente que ya puede estar inscrita.',
        solucion:
          'La inscripción masiva normaliza nombres y números, busca o crea a cada trabajador y lo matricula en la solicitud.',
      },
    ],
    falta: 'Estuvo desplegado; hoy no está en producción.',
    stack: ['.NET 8', 'EF Core 8', 'PostgreSQL', 'Angular 18', 'ClosedXML', 'Hangfire'],
    color: '#c09230',
    mapa: { x: -6.6, z: -0.6, ancho: 1.8, fondo: 1.5, alto: 1.2 },
  },
  {
    id: 'backbone',
    mundo: 'backbone',
    nombre: 'Backbone de IA',
    para: 'Grupo Empresarial Prometeo',
    periodo: 'Oct 2026',
    autoria: 'produccion',
    estado: 'desplegado',
    resumen:
      'El servicio central de IA del grupo: las plataformas le envían los mensajes de sus usuarios y responde con Claude, usando habilidades que consultan los sistemas de cada empresa.',
    papel:
      'Lo creó otro desarrollador y me lo entregó para producción. Lo audité, lo endurecí con usuarios iniciales seguros, límite de intentos de acceso, bloqueo de la red de metadatos de la nube y costos por modelo, y lo desplegué en 48 horas.',
    git: { resumen: '1 commit mío', nota: 'La arquitectura, el panel y las pruebas son de otro desarrollador.' },
    cifras: [{ valor: '48 h', etiqueta: 'de recibirlo a producción', fuente: 'documentación de despliegue, oct 2026' }],
    historias: [
      {
        titulo: 'De un repositorio recién recibido a producción',
        problema:
          'El código venía pensado para desarrollo: usuarios de prueba con claves débiles, sin límite de intentos y cada sistema conectado viendo todas las habilidades.',
        solucion:
          'Separé la siembra por entorno, dejé un solo administrador con clave fuerte en producción, limité los intentos de acceso y cada sistema conectado nace sin habilidades.',
      },
      {
        titulo: 'El modelo no puede pedir las credenciales del servidor',
        problema:
          'Las habilidades hacen llamadas HTTP cuya dirección decide en parte el modelo, y en la nube hay direcciones internas que no deben tocarse.',
        solucion:
          'La conexión resuelve el destino y rechaza la red de metadatos en el momento de abrir el socket, así que tampoco la burlan una redirección ni un dominio disfrazado.',
      },
    ],
    falta: 'Está desplegado, pero las plataformas todavía no lo consumen.',
    stack: ['.NET 10', 'Blazor', 'Microsoft Agent Framework', 'Claude', 'PostgreSQL', 'IIS'],
    color: '#8b93ff',
    mapa: { x: 1.4, z: 4.3, ancho: 1.6, fondo: 1.4, alto: 1 },
  },
];

/** Integraciones reales entre sistemas. 'planeado' incluye pilotos y lo que está por conectar. */
export const ENLACES: { de: ProyectoId; a: ProyectoId; tipo: 'activo' | 'planeado'; nota: string }[] = [
  { de: 'conecta', a: 'ocupasalud', tipo: 'activo', nota: 'Encuesta de satisfacción por WhatsApp' },
  { de: 'ahdo', a: 'ocupasalud', tipo: 'planeado', nota: 'Sincronización por Kafka (piloto)' },
  { de: 'estudio', a: 'ahdo', tipo: 'planeado', nota: 'Clases en video (hoja de ruta)' },
  { de: 'backbone', a: 'ahdo', tipo: 'planeado', nota: 'Asistente de IA (por conectar)' },
  { de: 'backbone', a: 'ocupasalud', tipo: 'planeado', nota: 'Asistente de IA (por conectar)' },
];

export const buscarProyecto = (id: string): Proyecto | undefined => PROYECTOS.find((p) => p.id === id);
