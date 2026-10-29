/**
 * Íconos y trazos de marca del mundo Backbone.
 * Los íconos de las plataformas son de simple-icons (CC0), con el color oficial de cada marca, y
 * viven como archivos en public/marcas/backbone/: así no pesan en el chunk del mundo.
 */

/** El ícono "sparkles" del panel (trazo de 24×24): la insignia del menú y del login. */
export const DESTELLOS_PANEL = [
  'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z',
  'M19 16l.7 1.8L21.5 18.5l-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z',
];

/** El stack tal como lo declara contenido/proyectos.ts, con ícono donde la marca lo tiene. */
export const STACK_BACKBONE: { nombre: string; icono?: string }[] = [
  { nombre: '.NET 10', icono: '/marcas/backbone/dotnet.svg' },
  { nombre: 'Blazor', icono: '/marcas/backbone/blazor.svg' },
  { nombre: 'Microsoft Agent Framework' },
  { nombre: 'Claude', icono: '/marcas/backbone/claude.svg' },
  { nombre: 'PostgreSQL', icono: '/marcas/backbone/postgresql.svg' },
  { nombre: 'IIS' },
];
