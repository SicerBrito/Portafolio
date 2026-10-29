import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Mundo } from '../core/mundo';
import { PROYECTOS } from '../contenido/proyectos';

@Component({
  selector: 'app-cabecera',
  imports: [RouterLink],
  template: `
    <header class="cabecera">
      <div class="wrap fila">
        <a class="marca" routerLink="/">Sicer Brito</a>
        @if (enMundo()) {
          <span class="mundo label" aria-live="polite">Mundo · {{ enMundo() }}</span>
        }
        <nav class="nav" aria-label="Secciones">
          <a routerLink="/" fragment="proyectos">Proyectos</a>
          <a routerLink="/" fragment="metodo">Cómo trabajo</a>
          <a routerLink="/" fragment="trayectoria">Trayectoria</a>
          <a class="nav-cta" routerLink="/" fragment="contacto">Contacto</a>
        </nav>
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
      position: sticky;
      top: env(safe-area-inset-top, 0px);
      z-index: 9;
    }
    :host::before {
      content: '';
      position: fixed;
      inset: 0 0 auto;
      height: env(safe-area-inset-top, 0px);
      background: var(--bg);
    }
    .cabecera {
      position: relative;
      background: var(--bg);
      border-bottom: 1px solid var(--line);
      transition: background-color 400ms var(--ease-out);
    }
    /* Cuánto de la página se ha recorrido, sin JS: una animación atada al scroll. */
    @supports (animation-timeline: scroll()) {
      .cabecera::after {
        content: '';
        position: absolute;
        inset: auto 0 -1px;
        height: 2px;
        background: linear-gradient(90deg, color-mix(in oklab, var(--signal) 35%, transparent), var(--signal));
        transform-origin: left;
        animation: recorrido linear both;
        animation-timeline: scroll(root);
      }
    }
    @keyframes recorrido {
      from {
        transform: scaleX(0);
      }
      to {
        transform: scaleX(1);
      }
    }
    .fila {
      display: flex;
      align-items: center;
      gap: 20px;
      min-height: var(--cabecera);
    }
    .marca {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 1.375rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      text-decoration: none;
    }
    .marca::before {
      content: '';
      width: 14px;
      height: 14px;
      background: var(--signal);
    }
    .mundo {
      color: var(--signal-text);
    }
    .nav {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 22px;
    }
    .nav a {
      font-family: var(--font-mono);
      font-size: var(--fs-label);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      text-decoration: none;
      color: var(--ink-2);
      padding-block: 10px;
    }
    .nav a:hover {
      color: var(--ink);
    }
    .nav .nav-cta {
      color: var(--on-signal);
      background: var(--signal);
      padding: 10px 14px;
    }
    .nav .nav-cta:hover {
      color: var(--on-signal);
    }
    @media (max-width: 760px) {
      .nav a:not(.nav-cta) {
        display: none;
      }
      .mundo {
        display: none;
      }
    }
  `,
})
export class Cabecera {
  private readonly mundo = inject(Mundo);
  protected readonly enMundo = computed(() => {
    const actual = this.mundo.actual();
    if (actual === 'planta') return null;
    
    return PROYECTOS.find((p) => p.mundo === actual)?.nombre ?? null;
  });
}
