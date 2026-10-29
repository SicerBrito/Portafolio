/**
 * Contenido propio del mundo Cuality. Los códigos de permiso son los reales de la base
 * (PermissionCodes, enero de 2026). El árbol de pantallas es un ejemplo armado con esos códigos:
 * la base no traía un árbol sembrado, traía la estructura para tenerlo.
 */

export type Permiso =
  | 'DASHBOARD_VIEW'
  | 'UI_NAV_ADMIN'
  | 'USERS_VIEW'
  | 'USERS_CREATE'
  | 'USERS_UPDATE'
  | 'USERS_DELETE'
  | 'ROLES_VIEW'
  | 'ROLES_CREATE'
  | 'ROLES_UPDATE'
  | 'ROLES_DELETE'
  | 'ROLES_MANAGE'
  | 'REPORTS_VIEW'
  | 'AUDITS_VIEW'
  | 'AUDITS_CREATE';

export interface Llave {
  codigo: Permiso;
  /** Lo que permite, dicho como lo dice el catálogo de permisos. */
  nombre: string;
  grupo: 'Sistema' | 'Usuarios' | 'Roles';
}

export const LLAVES: readonly Llave[] = [
  { codigo: 'DASHBOARD_VIEW', nombre: 'Ver el tablero', grupo: 'Sistema' },
  { codigo: 'UI_NAV_ADMIN', nombre: 'Ver Administración en el menú', grupo: 'Sistema' },
  { codigo: 'REPORTS_VIEW', nombre: 'Ver reportes', grupo: 'Sistema' },
  { codigo: 'AUDITS_VIEW', nombre: 'Ver auditorías', grupo: 'Sistema' },
  { codigo: 'AUDITS_CREATE', nombre: 'Crear auditorías', grupo: 'Sistema' },
  { codigo: 'USERS_VIEW', nombre: 'Ver usuarios', grupo: 'Usuarios' },
  { codigo: 'USERS_CREATE', nombre: 'Crear usuarios', grupo: 'Usuarios' },
  { codigo: 'USERS_UPDATE', nombre: 'Editar usuarios', grupo: 'Usuarios' },
  { codigo: 'USERS_DELETE', nombre: 'Eliminar usuarios', grupo: 'Usuarios' },
  { codigo: 'ROLES_VIEW', nombre: 'Ver roles', grupo: 'Roles' },
  { codigo: 'ROLES_CREATE', nombre: 'Crear roles', grupo: 'Roles' },
  { codigo: 'ROLES_UPDATE', nombre: 'Editar roles', grupo: 'Roles' },
  { codigo: 'ROLES_DELETE', nombre: 'Eliminar roles', grupo: 'Roles' },
  { codigo: 'ROLES_MANAGE', nombre: 'Asignar permisos a un rol', grupo: 'Roles' },
];

export const GRUPOS = ['Sistema', 'Usuarios', 'Roles'] as const;

/** El usuario de ejemplo: unas llaves le llegan por su rol y otra se le asignó directo. */
export const LLAVES_DEL_ROL: readonly Permiso[] = ['DASHBOARD_VIEW', 'UI_NAV_ADMIN', 'USERS_VIEW', 'USERS_CREATE'];
export const LLAVES_DIRECTAS: readonly Permiso[] = ['REPORTS_VIEW'];

/** ---------------------------------------------------------------- el árbol de pantallas */

export type TipoNodo = 'modulo' | 'pagina' | 'boton';

export interface NodoArbol {
  id: string;
  nombre: string;
  tipo: TipoNodo;
  permiso: Permiso;
  padre: string | null;
  /** Ángulo en el sello, en grados (0 = arriba, sentido horario). */
  angulo: number;
}

export const ARBOL: readonly NodoArbol[] = [
  // Módulos
  { id: 'tablero', nombre: 'Tablero', tipo: 'modulo', permiso: 'DASHBOARD_VIEW', padre: null, angulo: 0 },
  { id: 'admin', nombre: 'Administración', tipo: 'modulo', permiso: 'UI_NAV_ADMIN', padre: null, angulo: 135 },
  { id: 'reportes', nombre: 'Reportes', tipo: 'modulo', permiso: 'REPORTS_VIEW', padre: null, angulo: 250 },
  // Páginas
  { id: 'resumen', nombre: 'Resumen', tipo: 'pagina', permiso: 'DASHBOARD_VIEW', padre: 'tablero', angulo: 0 },
  { id: 'usuarios', nombre: 'Usuarios', tipo: 'pagina', permiso: 'USERS_VIEW', padre: 'admin', angulo: 100 },
  { id: 'roles', nombre: 'Roles', tipo: 'pagina', permiso: 'ROLES_VIEW', padre: 'admin', angulo: 165 },
  { id: 'informes', nombre: 'Informes', tipo: 'pagina', permiso: 'REPORTS_VIEW', padre: 'reportes', angulo: 230 },
  { id: 'auditorias', nombre: 'Auditorías', tipo: 'pagina', permiso: 'AUDITS_VIEW', padre: 'reportes', angulo: 280 },
  // Botones
  { id: 'u-crear', nombre: 'Crear usuario', tipo: 'boton', permiso: 'USERS_CREATE', padre: 'usuarios', angulo: 78 },
  { id: 'u-editar', nombre: 'Editar usuario', tipo: 'boton', permiso: 'USERS_UPDATE', padre: 'usuarios', angulo: 98 },
  { id: 'u-eliminar', nombre: 'Eliminar usuario', tipo: 'boton', permiso: 'USERS_DELETE', padre: 'usuarios', angulo: 118 },
  { id: 'r-crear', nombre: 'Crear rol', tipo: 'boton', permiso: 'ROLES_CREATE', padre: 'roles', angulo: 142 },
  { id: 'r-editar', nombre: 'Editar rol', tipo: 'boton', permiso: 'ROLES_UPDATE', padre: 'roles', angulo: 160 },
  { id: 'r-permisos', nombre: 'Asignar permisos', tipo: 'boton', permiso: 'ROLES_MANAGE', padre: 'roles', angulo: 178 },
  { id: 'r-eliminar', nombre: 'Eliminar rol', tipo: 'boton', permiso: 'ROLES_DELETE', padre: 'roles', angulo: 196 },
  { id: 'a-crear', nombre: 'Registrar auditoría', tipo: 'boton', permiso: 'AUDITS_CREATE', padre: 'auditorias', angulo: 288 },
];

/** ---------------------------------------------------------------- el recorrido con el scroll */

export interface Paso {
  titulo: string;
  texto: string;
  /** Desde dónde manda este paso en el recorrido fijado. */
  desde: number;
  /** El punto del recorrido al que salta el paso en el celular o con los botones. */
  momento: number;
  /** Fragmento de código real que resume el paso. */
  codigo?: string;
}

/** Momentos de la escena: los comparten el anfitrión y la escena (sin three.js). */
export const MOMENTOS = {
  llavero: 0.16,
  forja: 0.36,
  cache: 0.56,
  arbol: 0.72,
  menu: 0.88,
} as const;

export const PASOS: readonly Paso[] = [
  {
    titulo: 'Todo cuelga de un sello',
    texto:
      'Cada módulo, página y botón de Cuality es un nodo de un árbol, y cada nodo pide un permiso. Desde arriba se ve como el sello del logo: anillos de módulos, páginas y botones.',
    desde: 0,
    momento: 0.06,
  },
  {
    titulo: 'El llavero del usuario',
    texto:
      'Cada usuario junta llaves de dos lados: las que trae su rol y las que se le asignaron directo. Las azules vienen del rol; la gris es directa.',
    desde: MOMENTOS.llavero,
    momento: MOMENTOS.llavero + 0.1,
  },
  {
    titulo: 'La forja: una política al vuelo',
    texto:
      'Un endpoint pide permiso con un nombre, como ROLES_CREATE. Nadie registró una política con ese nombre: el proveedor de políticas la crea en el momento. Así no hay que escribir una política por cada permiso.',
    desde: MOMENTOS.forja,
    momento: MOMENTOS.forja + 0.1,
    codigo: '[Authorize(Policy = PermissionCodes.ROLES_CREATE)]',
  },
  {
    titulo: 'La caché del usuario',
    texto:
      'La primera vez se leen de la base los permisos del rol y los directos, y quedan en caché por usuario. Así no hay que consultar la base en cada petición para saber qué puede hacer cada quien.',
    desde: MOMENTOS.cache,
    momento: MOMENTOS.cache + 0.08,
  },
  {
    titulo: 'El árbol se enciende',
    texto:
      'Solo se levantan los nodos cuyo permiso está en el llavero. Los demás quedan planos y no llegan al menú.',
    desde: MOMENTOS.arbol,
    momento: MOMENTOS.arbol + 0.08,
  },
  {
    titulo: 'El menú se arma',
    texto:
      'El backend devuelve solo las ramas permitidas y el frontend arma el menú con ellas. Los botones aparecen con una directiva que pregunta por su permiso. Prueba: activa y desactiva llaves.',
    desde: MOMENTOS.menu,
    momento: 0.97,
  },
];

/** ---------------------------------------------------------------- el error del servidor */

/**
 * El problema de la historia, sin decir "producción": la carga falló en un servidor IIS donde se
 * publicó la API, y Cuality nunca salió a producción.
 */
export const SERVIDOR_PROBLEMA =
  'Las fotos de usuario se guardaban dentro de la carpeta pública del proyecto web. Al publicar la aplicación en un servidor, esa carpeta no existía y la carga fallaba.';

/** ---------------------------------------------------------------- qué es */

export const DOMINIO: readonly string[] = [
  'Empresas y centros de trabajo',
  'Empleados, cargos y funciones',
  'Antecedentes y diagnósticos',
  'Demandas biomecánicas, antropométricas y fisiológicas',
  'Condiciones ambientales y clase de riesgo',
  'Conclusiones y recomendaciones del evaluador',
];

export const BASE: readonly string[] = [
  'Los dos repositorios, creados el 21 de enero de 2026',
  'Arquitectura en tres capas: .NET 8 y Angular 19',
  'Inicio de sesión con JWT y claves con BCrypt',
  'Usuarios, roles y permisos, con su administración',
  'Políticas creadas al vuelo y caché por usuario',
  'El árbol de pantallas que arma el menú',
];

/** ---------------------------------------------------------------- el acta de entrega */

export const ACTA: readonly { campo: string; valor: string }[] = [
  { campo: 'Repositorios', valor: 'Creados por mí el 21 de enero de 2026' },
  { campo: 'Construcción inicial', valor: 'Backend: 100 archivos. Frontend: 72 archivos.' },
  { campo: 'Lo que entregué', valor: 'La base: arquitectura, autenticación, permisos y menú' },
  { campo: 'Lo que integré', valor: 'Los cambios de otro desarrollador, hasta marzo de 2026' },
  { campo: 'Lo que no es mío', valor: 'Los módulos de estudios de puesto de trabajo' },
  { campo: 'Código vivo mío', valor: 'Cerca del 39 % del backend y el 9 % del frontend, según git blame' },
];
