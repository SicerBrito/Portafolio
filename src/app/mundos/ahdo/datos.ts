/**
 * Contenido propio del mundo AHDO. Sale de contenido/proyectos.ts y de
 * investigacion/30_proyecto-ahdo.md (mapa de módulos verificado con git y archivos).
 * Toda demostración usa datos ficticios. No hay precios, NIT, clientes reales ni hosts.
 */
import type { IconoId } from './iconos';

// ---------------------------------------------------------------- marcas del certificado

export type MarcaId = 'ahdo' | 'autoaprender' | 'ocupasalud' | 'cuality';
export type EstiloCertificado = 'banda' | 'lateral' | 'marco' | 'esquina';

export interface MarcaCertificado {
  id: MarcaId;
  nombre: string;
  /** Logo de la marca, copiado del repositorio a public/marcas/ahdo. */
  logo: { src: string; ancho: number; alto: number };
  /** Lo que esa empresa hace dentro de AHDO, en una línea. */
  papel: string;
  estilo: EstiloCertificado;
  /** Colores muestreados del logo de cada marca (ver comentario de cada una). */
  colores: { primario: string; secundario: string; tinta: string; suave: string };
  /** Familia ya cargada en el sitio, para que cada certificado tenga su propia voz. */
  fuente: string;
}

export const MARCAS: MarcaCertificado[] = [
  {
    id: 'ahdo',
    nombre: 'AHDO',
    logo: { src: '/marcas/ahdo/logo-ahdo-color.webp', ancho: 1200, alto: 213 },
    papel: 'Sus cursos propios y las capacitaciones presenciales. También emite las facturas.',
    estilo: 'banda',
    // styles.scss de la plataforma: --color-morado y --color-azul; tinta del tema claro.
    colores: { primario: '#8b5ffc', secundario: '#007fb8', tinta: '#181c32', suave: '#f4f2fc' },
    fuente: 'Inter',
  },
  {
    id: 'autoaprender',
    nombre: 'Autoaprender',
    logo: { src: '/marcas/ahdo/logo-autoaprender.webp', ancho: 522, alto: 245 },
    papel: 'Certificados de formación vial y de cursos para clientes, con su marca.',
    estilo: 'lateral',
    // Muestreados de autoaprender.webp: verde lima, amarillo del nombre y azul noche del lema.
    colores: { primario: '#98ce16', secundario: '#fcd663', tinta: '#17225a', suave: '#f7fbe9' },
    fuente: 'Barlow Condensed',
  },
  {
    id: 'ocupasalud',
    nombre: 'Ocupasalud',
    logo: { src: '/marcas/ahdo/logo-ocupasalud.webp', ancho: 493, alto: 143 },
    papel: 'La IPS del grupo: pruebas psicológicas digitales y cobro en sus sedes.',
    estilo: 'marco',
    // Muestreados de ocupasalud.webp: azul de "OCUPA" y verde azulado de "SALUD".
    colores: { primario: '#0777bc', secundario: '#53a7b2', tinta: '#133b5c', suave: '#eef7f8' },
    fuente: 'Poppins',
  },
  {
    id: 'cuality',
    nombre: 'Cuality',
    logo: { src: '/marcas/ahdo/logo-cuality.webp', ancho: 225, alto: 225 },
    papel: 'Emite certificados con su propia marca.',
    estilo: 'esquina',
    // Muestreados del logo de Cuality: azul del sello y gris del lema.
    colores: { primario: '#016ba9', secundario: '#606060', tinta: '#22282e', suave: '#f2f6fa' },
    fuente: 'DM Sans',
  },
];

/** Datos del certificado de muestra. Inventados a propósito. */
export const CERTIFICADO_FICTICIO = {
  persona: 'Ana Ejemplo Pérez',
  curso: 'Curso de demostración',
  horas: '20 horas',
  fecha: 'Fecha de muestra',
  sello: 'Muestra · datos ficticios',
};

// ---------------------------------------------------------------- la vida de un pago

export type NodoPlantaId =
  | 'empresa'
  | 'angular'
  | 'api'
  | 'db'
  | 'jobs'
  | 'smtp'
  | 'wompi'
  | 'dian'
  | 'jasper'
  | 'claude'
  | 'bunny';

export type TipoNodo = 'cliente' | 'sistema' | 'externo';

export interface NodoPlanta {
  id: NodoPlantaId;
  nombre: string;
  corto: string;
  icono: IconoId;
  tipo: TipoNodo;
  x: number;
  z: number;
  ancho: number;
  fondo: number;
  alto: number;
  cilindro?: boolean;
}

/** La arquitectura real de AHDO, simplificada. Las posiciones vienen de la maqueta del prototipo. */
export const NODOS_PLANTA: NodoPlanta[] = [
  { id: 'empresa', nombre: 'Empresa cliente', corto: 'Empresa', icono: 'empresa', tipo: 'cliente', x: -6.4, z: 1.9, ancho: 1.1, fondo: 1.1, alto: 0.5 },
  { id: 'angular', nombre: 'Angular', corto: 'Angular', icono: 'angular', tipo: 'sistema', x: -3.5, z: 0, ancho: 1.9, fondo: 1.3, alto: 0.45 },
  { id: 'api', nombre: 'API .NET 8', corto: '.NET', icono: 'dotnet', tipo: 'sistema', x: 0, z: 0, ancho: 2.1, fondo: 1.7, alto: 1.5 },
  { id: 'db', nombre: 'PostgreSQL', corto: 'PostgreSQL', icono: 'postgresql', tipo: 'sistema', x: 0, z: 3.1, ancho: 1.5, fondo: 1.5, alto: 0.9, cilindro: true },
  { id: 'jobs', nombre: 'Hangfire · tareas', corto: 'Hangfire', icono: 'hangfire', tipo: 'sistema', x: 2.9, z: 2.5, ancho: 1.3, fondo: 1, alto: 0.55 },
  { id: 'smtp', nombre: 'Correo', corto: 'Correo', icono: 'correo', tipo: 'externo', x: 5.7, z: 3.3, ancho: 1, fondo: 0.8, alto: 0.35 },
  { id: 'wompi', nombre: 'Wompi · pagos', corto: 'Wompi', icono: 'pago', tipo: 'externo', x: 3, z: -2.7, ancho: 1.2, fondo: 0.9, alto: 0.45 },
  { id: 'dian', nombre: 'Siigo · DIAN', corto: 'DIAN', icono: 'factura', tipo: 'externo', x: 5.8, z: -0.9, ancho: 1.2, fondo: 0.9, alto: 0.45 },
  { id: 'jasper', nombre: 'JasperReports · PDF', corto: 'PDF', icono: 'pdf', tipo: 'externo', x: 5.8, z: 1.2, ancho: 1.2, fondo: 0.9, alto: 0.45 },
  { id: 'claude', nombre: 'Claude API', corto: 'Claude', icono: 'claude', tipo: 'externo', x: 0, z: -3.4, ancho: 1.2, fondo: 0.9, alto: 0.45 },
  { id: 'bunny', nombre: 'BunnyCDN · video', corto: 'Video', icono: 'bunny', tipo: 'externo', x: -3.5, z: -3, ancho: 1.2, fondo: 0.9, alto: 0.45 },
];

export const CONDUCTOS_PLANTA: Array<[NodoPlantaId, NodoPlantaId]> = [
  ['empresa', 'angular'],
  ['angular', 'api'],
  ['api', 'db'],
  ['api', 'jobs'],
  ['jobs', 'smtp'],
  ['api', 'wompi'],
  ['api', 'dian'],
  ['api', 'jasper'],
  ['api', 'claude'],
  ['angular', 'bunny'],
];

export interface FlujoPaso {
  ruta: NodoPlantaId[];
  /** 'exito' pinta el paquete en el verde de la marca: algo quedó confirmado. */
  tono: 'senal' | 'exito';
}

export interface PasoPago {
  titulo: string;
  texto: string;
  etiqueta: string;
  nodos: NodoPlantaId[];
  flujos: FlujoPaso[];
  /** El aviso llega dos veces: el segundo rebota contra la orden ya pagada. */
  doble?: boolean;
  nota?: { nodo: NodoPlantaId; texto: string };
}

export const PASOS_PAGO: PasoPago[] = [
  {
    titulo: 'Una empresa sube un Excel con sus trabajadores',
    texto: 'Cada fila se revisa por separado. Si una tiene un error, se ve en esa fila y las demás siguen.',
    etiqueta: 'Angular',
    nodos: ['empresa', 'angular'],
    flujos: [{ ruta: ['empresa', 'angular'], tono: 'senal' }],
  },
  {
    titulo: 'La API lo procesa sin hacer esperar a nadie',
    texto: 'El cargue corre en segundo plano, por lotes, y el progreso se ve en pantalla mientras tanto.',
    etiqueta: '.NET 8 · Hangfire',
    nodos: ['angular', 'api', 'jobs'],
    flujos: [{ ruta: ['angular', 'api', 'jobs'], tono: 'senal' }],
  },
  {
    titulo: 'Todo queda escrito y auditado',
    texto: 'Cada cambio guarda el valor anterior y el nuevo. El esquema solo cambia con migraciones versionadas.',
    etiqueta: 'PostgreSQL · EF Core',
    nodos: ['api', 'db'],
    flujos: [{ ruta: ['api', 'db'], tono: 'senal' }],
  },
  {
    titulo: 'La empresa paga en línea',
    texto: 'El pago sale por la pasarela, y la plataforma solo acepta avisos de pago con firma válida.',
    etiqueta: 'Wompi',
    nodos: ['api', 'wompi'],
    flujos: [
      { ruta: ['api', 'wompi'], tono: 'senal' },
      { ruta: ['wompi', 'api'], tono: 'exito' },
    ],
  },
  {
    titulo: 'El aviso de pago llega dos veces',
    texto: 'Una orden que ya está pagada no se vuelve a aplicar. Y si un aviso se pierde, una conciliación periódica lo recupera.',
    etiqueta: 'Idempotencia y conciliación',
    nodos: ['wompi', 'api'],
    flujos: [{ ruta: ['wompi', 'api'], tono: 'exito' }],
    doble: true,
    nota: { nodo: 'api', texto: 'Orden ya pagada: no se reprocesa' },
  },
  {
    titulo: 'Los correos salen en segundo plano',
    texto: 'Los envíos salen en segundo plano, con una cuenta de respaldo y un registro de cada correo.',
    etiqueta: 'Hangfire · SMTP',
    nodos: ['api', 'jobs', 'smtp'],
    flujos: [{ ruta: ['api', 'jobs', 'smtp'], tono: 'senal' }],
  },
  {
    titulo: 'Factura y certificado',
    texto: 'La factura electrónica sale ante la DIAN vía Siigo. Quien aprueba el curso recibe su certificado en PDF.',
    etiqueta: 'Siigo · DIAN · JasperReports',
    nodos: ['api', 'dian', 'jasper'],
    flujos: [
      { ruta: ['api', 'dian'], tono: 'exito' },
      { ruta: ['api', 'jasper'], tono: 'exito' },
    ],
  },
];

// ---------------------------------------------------------------- ¿a quién se le factura?

export type DestinoId = 'cliente' | 'ocupasalud' | 'autoaprender';

export interface DestinoFactura {
  id: DestinoId;
  nombre: string;
  detalle: string;
  /** De dónde sale el precio. Los valores no se muestran: los del grupo son confidenciales. */
  precio: string;
  color: string;
}

export const CLIENTE_FICTICIO = 'Transportes Demo S.A.S.';

export const DESTINOS: DestinoFactura[] = [
  {
    id: 'cliente',
    nombre: 'Por AHDO',
    detalle: 'Al tercero del propio cliente',
    precio: 'Precio acordado con el cliente',
    color: 'var(--ahdo-lila)',
  },
  {
    id: 'ocupasalud',
    nombre: 'Ocupasalud',
    detalle: 'Tercero fijo del grupo',
    precio: 'Tarifario central, no editable',
    color: '#53a7b2',
  },
  {
    id: 'autoaprender',
    nombre: 'Autoaprender',
    detalle: 'Tercero fijo del grupo',
    precio: 'Tarifario central, no editable',
    color: '#98ce16',
  },
];

export interface ServicioDemo {
  id: string;
  nombre: string;
  inscritos: number;
  inicial: DestinoId;
}

/** Servicios del cliente ficticio. El caso más común es facturarle la prueba a Ocupasalud. */
export const SERVICIOS_DEMO: ServicioDemo[] = [
  { id: 'curso', nombre: 'Curso virtual de manejo defensivo', inscritos: 18, inicial: 'cliente' },
  { id: 'psico', nombre: 'Prueba psicotécnica', inscritos: 18, inicial: 'ocupasalud' },
  { id: 'practica', nombre: 'Evaluación práctica de conducción', inscritos: 6, inicial: 'cliente' },
];

// ---------------------------------------------------------------- módulos y empresas

export type EmpresaId = 'ahdo' | 'autoaprender' | 'ocupasalud' | 'cuality' | 'clientes';

export interface EmpresaMapa {
  id: EmpresaId;
  nombre: string;
  /** Color de la marca de esa empresa: solo para puntos y líneas, no para texto. */
  color: string;
}

export const EMPRESAS: EmpresaMapa[] = [
  { id: 'ahdo', nombre: 'AHDO', color: '#aaaaff' },
  { id: 'ocupasalud', nombre: 'Ocupasalud', color: '#53a7b2' },
  { id: 'autoaprender', nombre: 'Autoaprender', color: '#98ce16' },
  { id: 'cuality', nombre: 'Cuality', color: '#3d9ad6' },
  { id: 'clientes', nombre: 'Empresas cliente', color: '#c4bce2' },
];

export type AutoriaModulo = 'construi' | 'termine' | 'amplie';

export const ETIQUETA_AUTORIA_MODULO: Record<AutoriaModulo, string> = {
  construi: 'Lo construí',
  termine: 'Lo terminé',
  amplie: 'Lo amplié',
};

export interface ModuloMapa {
  id: string;
  nombre: string;
  detalle: string;
  empresas: EmpresaId[];
  /** Solo donde git lo confirma. Sin dato, no se reclama nada. */
  autoria: AutoriaModulo | null;
  piloto?: boolean;
}

export const MODULOS: ModuloMapa[] = [
  {
    id: 'certificados',
    nombre: 'Certificados por marca',
    detalle: 'La idea de una marca por certificado venía en la base de 2024. Le sumé las plantillas de clientes, del teórico-práctico y de psicometría.',
    empresas: ['ahdo', 'autoaprender', 'ocupasalud', 'cuality'],
    autoria: 'amplie',
  },
  {
    id: 'psicometria',
    nombre: 'Psicometría digital',
    detalle: 'Las pruebas que la IPS aplicaba en papel, sobre un motor en el que la prueba es un dato.',
    empresas: ['ocupasalud'],
    autoria: 'construi',
  },
  {
    id: 'recepcion',
    nombre: 'Recepción y caja en las sedes',
    detalle: 'El mostrador inscribe al trabajador y cobra la matrícula y sus anexos en una sola operación. Otro desarrollador lo empezó.',
    empresas: ['ocupasalud'],
    autoria: 'termine',
  },
  {
    id: 'tarifarios',
    nombre: 'Servicios, terceros y tarifarios',
    detalle: 'Cada servicio del cliente sabe a quién se le factura y de qué tarifario sale su precio.',
    empresas: ['ahdo', 'ocupasalud', 'autoaprender'],
    autoria: 'construi',
  },
  {
    id: 'facturacion',
    nombre: 'Facturación electrónica y cartera',
    detalle: 'AHDO emite ante la DIAN vía Siigo y lleva el saldo de cada factura en un libro de pagos.',
    empresas: ['ahdo', 'clientes'],
    autoria: 'construi',
  },
  {
    id: 'practica',
    nombre: 'Evaluación práctica de conductores y montacargas',
    detalle: 'Videos por fases, rúbrica del instructor y verificación en el SIMIT.',
    empresas: ['clientes'],
    autoria: 'construi',
  },
  {
    id: 'anexos',
    nombre: 'Anexos de pago',
    detalle: 'Trámites que se cobran junto con la matrícula, solo a empresas con membresía.',
    empresas: ['ahdo', 'clientes'],
    autoria: 'construi',
  },
  {
    id: 'qr',
    nombre: 'Capacitaciones presenciales con QR',
    detalle: 'El asistente escanea, llena el formulario sin crear cuenta y recibe su constancia.',
    empresas: ['ahdo'],
    autoria: 'construi',
  },
  {
    id: 'masivo',
    nombre: 'Inscripciones masivas y tablero corporativo',
    detalle: 'Las empresas cliente inscriben a sus trabajadores por Excel y siguen su avance.',
    empresas: ['clientes'],
    autoria: null,
  },
  {
    id: 'cursos',
    nombre: 'Cursos en línea con pago',
    detalle: 'El catálogo, el visor de clases con video, los exámenes y el pago con Wompi.',
    empresas: ['ahdo'],
    autoria: null,
  },
  {
    id: 'sincronizacion',
    nombre: 'Sincronización con la nueva plataforma del grupo',
    detalle: 'Clientes y terceros compartidos por Kafka. Es un piloto: probado, todavía no en producción.',
    empresas: ['ocupasalud'],
    autoria: 'construi',
    piloto: true,
  },
];

// ---------------------------------------------------------------- cartera de ejemplo

export interface AbonoDemo {
  id: string;
  fecha: string;
  valor: number;
}

/** Valores ficticios y redondos: no corresponden a ninguna factura real. */
export const FACTURA_DEMO_TOTAL = 1_200_000;
export const ABONOS_DEMO: AbonoDemo[] = [
  { id: 'a1', fecha: '3 de septiembre', valor: 500_000 },
  { id: 'a2', fecha: '18 de septiembre', valor: 400_000 },
  { id: 'a3', fecha: '2 de octubre', valor: 300_000 },
];
