import { siAngular, siBootstrap, siDotnet, siPostgresql } from 'simple-icons';

/**
 * El stack de Prevent, en una caja de 24×24. Los de marca vienen de simple-icons (CC0); aquí se
 * pintan en un solo tono, el crema del mundo, porque sobre la noche de obra el negro oficial de
 * Angular desaparece. EF Core, ClosedXML y Hangfire no están en esa colección: van con un dibujo
 * propio y sencillo de lo que hacen, y su nombre escrito al lado.
 */
export interface IconoStack {
  nombre: string;
  papel: string;
  path: string;
}

export const STACK_PREVENT: readonly IconoStack[] = [
  { nombre: '.NET 8', papel: 'API en tres capas', path: siDotnet.path },
  {
    nombre: 'EF Core 8',
    papel: 'Entidades, migraciones y el catálogo sembrado',
    // Tres tablas unidas: el modelo de datos.
    path: 'M3 3h7v6H3zm11 0h7v6h-7zM8.5 15h7v6h-7zM6.5 9v3h11V9h-2v1h-7V9zM11 12h2v3h-2z',
  },
  { nombre: 'PostgreSQL', papel: 'La base', path: siPostgresql.path },
  { nombre: 'Angular 18', papel: 'La plataforma, con SSR', path: siAngular.path },
  { nombre: 'Bootstrap', papel: 'Rejilla y componentes', path: siBootstrap.path },
  {
    nombre: 'ClosedXML',
    papel: 'Lee el Excel de la inscripción masiva',
    // Una hoja de cálculo con su rejilla.
    path: 'M4 2h11l5 5v15H4zm10 1.5V8h4.5zM7 11v9h10v-9zm1.5 1.5h3v2h-3zm4.5 0h3v2h-3zM8.5 16h3v2.5h-3zm4.5 0h3v2.5h-3z',
  },
  {
    nombre: 'Hangfire',
    papel: 'Trabajos en segundo plano',
    // Una flecha que da la vuelta alrededor de un reloj.
    path: 'M12 3a9 9 0 0 1 8.5 6H23l-3.5 4.5L16 9h2.3A7 7 0 1 0 19 13h2a9 9 0 1 1-9-10Zm-1 4h2v5.2l3.4 2-1 1.7L11 13.4V7Z',
  },
];
