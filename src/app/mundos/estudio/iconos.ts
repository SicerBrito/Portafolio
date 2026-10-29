/**
 * Íconos de las plataformas del motor. Los trazos son de simple-icons (CC0) y viven como archivos
 * blancos en public/marcas/estudio/icono-*.svg: así no pesan en el chunk del mundo.
 * Playwright, PdfPig, Open XML y xUnit no tienen ícono en simple-icons: van como etiqueta.
 */

export interface IconoMarca {
  /** Archivo del ícono (glifo blanco, 24 × 24). */
  archivo: string;
  /** Color oficial de la marca: solo de fondo de la ficha, nunca como color de texto. */
  hex: string;
}

/** El stack del motor (contenido/proyectos.ts) en el orden de la ficha, con ícono donde existe. */
export const REPARTO: { nombre: string; papel: string; icono?: IconoMarca }[] = [
  {
    nombre: '.NET 8',
    papel: 'Orquesta el render',
    icono: { archivo: '/marcas/estudio/icono-dotnet.svg', hex: '#512bd4' },
  },
  { nombre: 'Playwright', papel: 'Fotografía cada fotograma' },
  {
    nombre: 'FFmpeg',
    papel: 'Une las fotos en un MP4',
    icono: { archivo: '/marcas/estudio/icono-ffmpeg.svg', hex: '#007808' },
  },
  {
    nombre: 'Angular 17',
    papel: 'Dibuja cada escena',
    icono: { archivo: '/marcas/estudio/icono-angular.svg', hex: '#0f0f11' },
  },
  {
    nombre: 'TypeScript',
    papel: 'Las curvas del movimiento',
    icono: { archivo: '/marcas/estudio/icono-typescript.svg', hex: '#3178c6' },
  },
  { nombre: 'PdfPig', papel: 'Lee los PDF' },
  { nombre: 'Open XML', papel: 'Lee las presentaciones' },
  { nombre: 'xUnit', papel: 'La prueba de humo del render' },
];
