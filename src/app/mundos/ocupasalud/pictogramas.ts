/**
 * Pictogramas de señalética propios, de trazo, en una caja de 24×24: los de los letreros de la
 * sede y los del directorio. Se pintan con stroke="currentColor".
 */
export const PICTOGRAMAS = {
  recepcion: 'M3 20h18M5 20v-6h14v6M12 3.5a2.6 2.6 0 1 1 0 5.2a2.6 2.6 0 0 1 0-5.2ZM7.8 14a4.2 4.2 0 0 1 8.4 0',
  cola: 'M6 3v10h12M6 13v8M18 13v8M6 17h12M4 9h2',
  medicina: 'M12 4v16M4 12h16',
  optometria: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Zm10-3.2a3.2 3.2 0 1 1 0 6.4a3.2 3.2 0 0 1 0-6.4Z',
  audiometria: 'M4 16v-4a8 8 0 0 1 16 0v4M4 15h3.5v6H4zM16.5 15H20v6h-3.5z',
  laboratorio: 'M9 3h6M10 3v6.5L4.8 19a1.4 1.4 0 0 0 1.2 2h12a1.4 1.4 0 0 0 1.2-2L14 9.5V3M7.4 15h9.2',
  rayosx: 'M4 3h16v18H4zM12 6v12M8 8.5h8M8 12h8M8 15.5h8',
  salida: 'M13 3H5v18h8M9 12h11M17 8.5l3.5 3.5-3.5 3.5',
  consultorios: 'M12 4v16M4 12h16',
  certificados: 'M6 2.5h9l4 4V21H6zM15 2.5v4h4M9 11h7M9 14.5h4.5M15 17.5a1.8 1.8 0 1 1 0 .1',
  facturacion: 'M6 2.5h12V21l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21zM9 7h6M9 10.5h6M9 14h3.5',
  pdf: 'M6 2.5h9l4 4V21H6zM15 2.5v4h4M8.5 12h7M8.5 15.5h7M8.5 8.5h3',
} as const;

export type PictogramaId = keyof typeof PICTOGRAMAS;
