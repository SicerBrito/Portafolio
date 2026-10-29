import {
  siAngular,
  siClaude,
  siDotnet,
  siModelcontextprotocol,
  siOpenapiinitiative,
  siPostgresql,
  siWhatsapp,
} from 'simple-icons';

/** Íconos de marca (simple-icons, CC0): trazo SVG de 24×24 y su color oficial. */
export interface IconoMarca {
  titulo: string;
  path: string;
  hex: string;
}

const icono = (i: { title: string; path: string; hex: string }): IconoMarca => ({
  titulo: i.title,
  path: i.path,
  hex: `#${i.hex}`,
});

export const ICONO_WHATSAPP = icono(siWhatsapp);
export const ICONO_CLAUDE = icono(siClaude);
export const ICONO_MCP = icono(siModelcontextprotocol);

/** El stack de Conecta, idéntico al de contenido/proyectos.ts, con ícono donde la marca lo tiene. */
export const STACK_CONECTA: { nombre: string; icono?: IconoMarca }[] = [
  { nombre: '.NET 8', icono: icono(siDotnet) },
  { nombre: 'EF Core 8' },
  { nombre: 'PostgreSQL', icono: icono(siPostgresql) },
  { nombre: 'Angular 17', icono: icono(siAngular) },
  { nombre: 'WhatsApp Cloud API', icono: ICONO_WHATSAPP },
  { nombre: 'MCP · JSON-RPC 2.0', icono: ICONO_MCP },
  { nombre: 'xUnit' },
  { nombre: 'OpenAPI', icono: icono(siOpenapiinitiative) },
];
