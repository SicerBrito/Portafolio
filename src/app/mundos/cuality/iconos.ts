import { siAngular, siDotnet, siJsonwebtokens, siPostgresql } from 'simple-icons';

/**
 * El stack de Cuality, en una caja de 24×24. Los de marca vienen de simple-icons (CC0) con su
 * color oficial, que se lee bien sobre el papel claro del mundo. EF Core y Angular Material no
 * están en esa colección: van con un dibujo propio y sencillo, y su nombre escrito al lado.
 */
export interface IconoStack {
  nombre: string;
  papel: string;
  path: string;
  /** Color oficial de la marca, o null si el dibujo es propio. */
  hex: string | null;
}

export const STACK_CUALITY: readonly IconoStack[] = [
  { nombre: '.NET 8', papel: 'API en tres capas', path: siDotnet.path, hex: `#${siDotnet.hex}` },
  {
    nombre: 'EF Core 8',
    papel: 'Entidades de seguridad y sus migraciones',
    hex: null,
    path: 'M3 3h7v6H3zm11 0h7v6h-7zM8.5 15h7v6h-7zM6.5 9v3h11V9h-2v1h-7V9zM11 12h2v3h-2z',
  },
  { nombre: 'PostgreSQL', papel: 'La base', path: siPostgresql.path, hex: `#${siPostgresql.hex}` },
  { nombre: 'Angular 19', papel: 'Componentes independientes', path: siAngular.path, hex: `#${siAngular.hex}` },
  { nombre: 'JWT', papel: 'Inicio de sesión', path: siJsonwebtokens.path, hex: `#${siJsonwebtokens.hex}` },
  {
    nombre: 'Angular Material',
    papel: 'Componentes de la interfaz',
    hex: null,
    // Una tarjeta con su botón: la pieza típica de una interfaz de componentes.
    path: 'M3 4h18v16H3zm2 2v8h14V6zm0 10v2h6v-2zm9 0v2h5v-2z',
  },
];
