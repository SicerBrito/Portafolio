import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Proyecto } from '../../contenido/proyectos';

/** El enlace a la siguiente nave: una barra de su color que crece al pasar por encima. */
@Component({
  selector: 'app-backbone-siguiente',
  imports: [RouterLink],
  template: `
    <nav class="siguiente" aria-label="Siguiente proyecto" [style.--color-siguiente]="proyecto().color">
      <a class="siguiente-enlace" [routerLink]="['/proyectos', proyecto().id]">
        <span class="siguiente-pre">Siguiente nave</span>
        <span class="siguiente-nombre">{{ proyecto().nombre }}</span>
        <span class="siguiente-resumen">{{ resumen() }}</span>
        <svg class="siguiente-flecha" viewBox="0 0 64 24" aria-hidden="true">
          <path d="M0 12h58M48 3l10 9-10 9" fill="none" stroke="currentColor" stroke-width="3" />
        </svg>
      </a>
    </nav>
  `,
  styles: `
    :host {
      display: block;
    }

    .siguiente {
      border-top: 1px solid var(--line);
    }

    .siguiente-enlace {
      position: relative;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 6px 24px;
      align-items: end;
      max-width: var(--wrap);
      margin-inline: auto;
      padding: clamp(40px, 7vw, 96px) max(16px, env(safe-area-inset-right, 0px)) clamp(40px, 7vw, 96px)
        max(16px, env(safe-area-inset-left, 0px));
      color: var(--ink);
      text-decoration: none;
    }
    .siguiente-enlace::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 6px;
      background: var(--color-siguiente);
      transition: width 420ms var(--ease-out);
    }
    .siguiente-enlace:hover::before,
    .siguiente-enlace:focus-visible::before {
      width: 18px;
    }
    .siguiente-enlace:hover .siguiente-flecha,
    .siguiente-enlace:focus-visible .siguiente-flecha {
      transform: translateX(10px);
    }
    .siguiente-enlace:focus-visible {
      outline-offset: -6px;
    }

    .siguiente-pre {
      grid-column: 1 / -1;
      color: var(--ink-2);
      font-size: 0.9375rem;
      font-weight: 600;
    }

    .siguiente-nombre {
      font-weight: 700;
      font-size: clamp(3rem, 1.6rem + 7vw, 8rem);
      line-height: 0.9;
      letter-spacing: -0.045em;
    }

    .siguiente-resumen {
      grid-column: 1;
      max-width: 52ch;
      color: var(--ink-2);
    }

    .siguiente-flecha {
      grid-column: 2;
      grid-row: 2 / span 2;
      width: clamp(48px, 8vw, 96px);
      height: auto;
      color: var(--color-siguiente);
      transition: transform 320ms var(--ease-out);
    }
  `,
})
export class SiguienteBackbone {
  readonly proyecto = input.required<Proyecto>();
  readonly resumen = input.required<string>();
}
