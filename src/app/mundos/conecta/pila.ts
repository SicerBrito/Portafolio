import { Component } from '@angular/core';
import { STACK_CONECTA } from './iconos';

/** El stack con los íconos de cada marca. Se carga diferido: los trazos pesan. */
@Component({
  selector: 'app-conecta-pila',
  template: `
    <ul class="stack" aria-label="Tecnologías">
      @for (t of stack; track t.nombre) {
        <li>
          @if (t.icono; as i) {
            <svg viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="i.path" [attr.fill]="i.hex" /></svg>
          } @else {
            <span class="sin-icono" aria-hidden="true"></span>
          }
          {{ t.nombre }}
        </li>
      }
    </ul>
  `,
  styles: `
    .stack {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 10px;
      background: var(--surface-2);
      border: 1px solid var(--line-soft);
      font-size: 0.875rem;
      font-weight: 500;
    }
    svg {
      width: 18px;
      height: 18px;
    }
    .sin-icono {
      width: 10px;
      height: 10px;
      border-radius: 3px;
      background: var(--conecta-oro-3);
    }
  `,
})
export class PilaConecta {
  protected readonly stack = STACK_CONECTA;
}
