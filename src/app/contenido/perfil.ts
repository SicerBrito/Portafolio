export interface Hito {
  fecha: string;
  titulo: string;
  texto?: string;
  tipo: 'trabajo' | 'proyecto' | 'formacion';
  actual?: boolean;
}

export const PERFIL = {
  nombre: 'Sicer Brito',
  nombreCompleto: 'Sicer Andrés Brito Gutiérrez',
  rol: 'Líder de Desarrollo · Full Stack .NET & Angular',
  ubicacion: 'Bucaramanga, Colombia · UTC−5 · Remoto',
  bajada:
    'Pagos, facturación electrónica, WhatsApp, IA y certificados: sistemas que hoy usan a diario varias empresas de un mismo grupo. Algunos los construí desde cero; otros los tomé y los llevé más lejos.',
  correo: 'jobdevbrito@gmail.com',
  linkedin: 'https://linkedin.com/in/sicer-brito',
  github: 'https://github.com/SicerBrito',
  repoMetodo: 'https://github.com/SicerBrito/spec-driven-development',
  idiomas: 'Español nativo · Inglés A2: leo documentación técnica con fluidez y la conversación está en progreso',
  empleador: 'Grupo Empresarial Prometeo · Bucaramanga, Colombia',
};

export const TRAYECTORIA: Hito[] = [
  {
    fecha: 'Jun 2026 – hoy',
    titulo: 'Líder de Desarrollo · AHDO',
    texto:
      'American Human Development Organization S.A.S. Lidero a un desarrollador: asigno y reviso su trabajo y lo incorporo con un plan de onboarding de seis fases que escribí. Sigo programando.',
    tipo: 'trabajo',
    actual: true,
  },
  {
    fecha: 'Sep – oct 2026',
    titulo: 'Conecta, desde cero',
    texto: 'El canal de WhatsApp y formularios del grupo, en producción y usado por varias empresas.',
    tipo: 'proyecto',
  },
  {
    fecha: 'Sep 2024 – jun 2026',
    titulo: 'Único desarrollador de AHDO',
    texto: 'Construí la mayor parte de lo que hoy está en producción: facturación, cartera, psicometría, evaluaciones prácticas e IA.',
    tipo: 'trabajo',
  },
  {
    fecha: 'May 2024',
    titulo: 'Desarrollador Full Stack · Ocupasalud IPS',
    texto:
      'Entré a AHDO cuando era una plantilla y una base de backend sin usuarios. Un mentor me orientó los primeros tres meses, y salimos a producción con el equipo de ingeniería.',
    tipo: 'trabajo',
  },
  { fecha: 'Sep 2025', titulo: 'Angular Moderno · Comfenalco · 50 h', tipo: 'formacion' },
  { fecha: 'Feb 2023 – ene 2024', titulo: 'Técnico Laboral en Programación de Software · Campuslands · 2.080 h', tipo: 'formacion' },
];

export const METODO = [
  { titulo: 'Plan técnico', texto: 'Qué se construye, qué cambia en la base de datos y qué queda fuera del alcance.' },
  { titulo: 'Criterios de aceptación', texto: 'Cómo se comprueba que quedó bien, escrito antes de programar.' },
  { titulo: 'Migración con reversa', texto: 'Cada cambio de esquema trae su camino de vuelta.' },
  { titulo: 'Despliegue con checklist', texto: 'Nada sale a producción sin pasos escritos y un plan para revertir.' },
];
