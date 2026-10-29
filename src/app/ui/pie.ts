import { Component } from '@angular/core';
import { PERFIL } from '../contenido/perfil';

@Component({
  selector: 'app-pie',
  template: `
    <footer class="wrap pie">
      <span class="label">© 2026 {{ perfil.nombre }}</span>
      <span class="label">{{ perfil.empleador }}</span>
      <span class="label">Construido con Angular 22, three.js y GSAP</span>
    </footer>
  `,
  styles: `
    .pie {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 8px 24px;
      padding-block: 24px;
      border-top: 1px solid var(--line);
    }
  `,
})
export class Pie {
  protected readonly perfil = PERFIL;
}
