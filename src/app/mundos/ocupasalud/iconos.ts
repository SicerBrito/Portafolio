import { siAngular, siApachekafka, siClaude, siDotnet, siGooglesheets, siWhatsapp } from 'simple-icons';

/**
 * Íconos de las plataformas que toca Ocupasalud, en una caja de 24×24.
 * Los de marca vienen de simple-icons (CC0) con su color oficial. SQL Server y Hangfire no están
 * en esa colección: van con un dibujo propio y sencillo de lo que hacen (una base de datos y un
 * trabajo que vuelve a intentarse), y su nombre escrito al lado.
 */
export type IconoId = 'dotnet' | 'angular' | 'kafka' | 'claude' | 'sheets' | 'whatsapp' | 'sqlserver' | 'hangfire';

export interface Icono {
  nombre: string;
  path: string;
  /** Color oficial de la marca, o null si el dibujo es propio. */
  hex: string | null;
}

const marca = (i: { title: string; path: string; hex: string }, nombre = i.title): Icono => ({
  nombre,
  path: i.path,
  hex: `#${i.hex}`,
});

export const ICONOS: Record<IconoId, Icono> = {
  dotnet: marca(siDotnet, '.NET'),
  angular: marca(siAngular, 'Angular'),
  kafka: marca(siApachekafka, 'Apache Kafka'),
  claude: marca(siClaude, 'Claude'),
  sheets: marca(siGooglesheets, 'Google Sheets'),
  whatsapp: marca(siWhatsapp, 'WhatsApp'),
  // Una base de datos: tres discos apilados.
  sqlserver: {
    nombre: 'SQL Server',
    hex: null,
    path: 'M12 2c4.4 0 8 1.3 8 3v14c0 1.7-3.6 3-8 3s-8-1.3-8-3V5c0-1.7 3.6-3 8-3Zm6 6.1C16.6 8.7 14.4 9 12 9s-4.6-.3-6-.9V11c0 .6 2.4 1.6 6 1.6s6-1 6-1.6V8.1Zm0 6c-1.4.6-3.6.9-6 .9s-4.6-.3-6-.9V17c0 .6 2.4 1.6 6 1.6s6-1 6-1.6v-2.9ZM12 4C8.4 4 6 5 6 5.5S8.4 7 12 7s6-1 6-1.5S15.6 4 12 4Z',
  },
  // Un trabajo en segundo plano: una flecha que da la vuelta alrededor de un reloj.
  hangfire: {
    nombre: 'Hangfire',
    hex: null,
    path: 'M12 3a9 9 0 0 1 8.5 6H23l-3.5 4.5L16 9h2.3A7 7 0 1 0 19 13h2a9 9 0 1 1-9-10Zm-1 4h2v5.2l3.4 2-1 1.7L11 13.4V7Z',
  },
};

/** El stack del mundo, en el orden en que aparece. */
export const STACK_OCUPASALUD: { icono: IconoId; papel: string }[] = [
  { icono: 'dotnet', papel: 'Backend del sistema actual y de la 2.0' },
  { icono: 'angular', papel: 'Frontend de las dos versiones' },
  { icono: 'sqlserver', papel: 'La base de cada IPS' },
  { icono: 'hangfire', papel: 'Trabajos en segundo plano' },
  { icono: 'claude', papel: 'Lee los exámenes en PDF' },
  { icono: 'sheets', papel: 'La hoja de seguimiento' },
  { icono: 'whatsapp', papel: 'La encuesta, vía Conecta' },
  { icono: 'kafka', papel: 'El bus del piloto con AHDO' },
];
