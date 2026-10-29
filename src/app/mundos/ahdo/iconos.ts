import { siAngular, siAnthropic, siBunnydotnet, siDotnet } from 'simple-icons';

/**
 * Íconos de las plataformas que usa AHDO, todos en una caja de 24×24.
 * Los de marca vienen de simple-icons (CC0). Hangfire, Wompi, Siigo, JasperReports y el
 * correo no están en esa colección: van con un ícono propio y sencillo de lo que hacen.
 * PostgreSQL va con un cilindro propio: su elefante pesa 5 KB de trazo y el presupuesto no da.
 * La API de Claude va con el logo de Anthropic, la empresa que la ofrece.
 */
export type IconoId =
  | 'angular'
  | 'dotnet'
  | 'postgresql'
  | 'claude'
  | 'bunny'
  | 'hangfire'
  | 'correo'
  | 'pago'
  | 'factura'
  | 'pdf'
  | 'empresa';

export interface Icono {
  path: string;
  /** Los propios recortan huecos con evenodd; los de simple-icons usan la regla por defecto. */
  regla: 'nonzero' | 'evenodd';
  /** true si es un logo de marca y no un dibujo propio. */
  marca: boolean;
}

const deMarca = (path: string): Icono => ({ path, regla: 'nonzero', marca: true });
const propio = (path: string): Icono => ({ path, regla: 'evenodd', marca: false });

export const ICONOS: Record<IconoId, Icono> = {
  angular: deMarca(siAngular.path),
  dotnet: deMarca(siDotnet.path),
  claude: deMarca(siAnthropic.path),
  bunny: deMarca(siBunnydotnet.path),
  // Una base de datos.
  postgresql: propio('M12 2c4.4 0 8 1.3 8 3v14c0 1.7-3.6 3-8 3s-8-1.3-8-3V5c0-1.7 3.6-3 8-3Zm6 6.1C16.6 8.7 14.4 9 12 9s-4.6-.3-6-.9V11c0 .6 2.4 1.6 6 1.6s6-1 6-1.6V8.1Zm0 6c-1.4.6-3.6.9-6 .9s-4.6-.3-6-.9V17c0 .6 2.4 1.6 6 1.6s6-1 6-1.6v-2.9ZM12 4C8.4 4 6 5 6 5.5S8.4 7 12 7s6-1 6-1.5S15.6 4 12 4Z'),
  // Una fila de tareas en segundo plano.
  hangfire: propio('M3 4h13a2 2 0 0 1 0 4H3a2 2 0 0 1 0-4Zm5 6h13a2 2 0 0 1 0 4H8a2 2 0 0 1 0-4Zm-5 6h10a2 2 0 0 1 0 4H3a2 2 0 0 1 0-4Z'),
  // Un sobre.
  correo: propio('M2 5h20v14H2V5Zm2 2.4V17h16V7.4l-8 5.3-8-5.3Z'),
  // Una tarjeta de pago.
  pago: propio('M2 6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6Zm2 3.5V18h16V9.5H4Zm2 5h5v2H6v-2Z'),
  // Una factura aceptada.
  factura: propio('M5 2h10l4 4v16H5V2Zm2 2v16h10V7.5h-3.5V4H7Zm1.6 9.4 1.4-1.4 1.6 1.6 3.6-3.6 1.4 1.4-5 5-3-3Z'),
  // Un documento en PDF.
  pdf: propio('M5 2h10l4 4v16H5V2Zm2 2v16h10V7.5h-3.5V4H7Zm2 6h6v1.6H9V10Zm0 3.2h6v1.6H9v-1.6Zm0 3.2h4V18H9v-1.6Z'),
  // Una empresa.
  empresa: propio('M3 21V9l6-3v3l6-3v3l6-3v15H3Zm3-8v2h2v-2H6Zm5 0v2h2v-2h-2Zm5 0v2h2v-2h-2ZM6 17v2h2v-2H6Zm5 0v2h2v-2h-2Zm5 0v2h2v-2h-2Z'),
};
