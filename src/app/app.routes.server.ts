import { RenderMode, ServerRoute } from '@angular/ssr';
import { MUNDOS } from './app.routes';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  ...MUNDOS.map((id) => ({ path: `proyectos/${id}`, renderMode: RenderMode.Prerender }) as ServerRoute),
  { path: '**', renderMode: RenderMode.Prerender },
];
