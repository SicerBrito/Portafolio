import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Movimiento } from '../../core/movimiento';
import type { EscenaPagina } from './contenido';
import { codigoTiempo } from './motor';

/** Píxeles de scroll por fotograma: la página se lee como un video a 30 fps. */
const PX_POR_FOTOGRAMA = 8;

/**
 * La barra del inspector del motor, al pie de la página: código de tiempo de la lectura,
 * cabezal de reproducción y una marca por escena para saltar a ella.
 * Va pegada abajo mientras se recorre el mundo.
 */
@Component({
  selector: 'app-estudio-inspector',
  template: `
    <nav class="barra" aria-label="Escenas de este mundo">
      <span class="tc" #tc aria-hidden="true">00:00:00:00</span>
      <ol>
        @for (e of escenas(); track e.id) {
          <li>
            <a
              [href]="'/proyectos/estudio#' + e.id"
              [attr.aria-label]="e.id + ': ' + e.nombre"
              [attr.aria-current]="activa() === e.id ? 'location' : null"
              (click)="ir($event, e.id)"
            >
              <span class="m-id">{{ e.id }}</span>
              <span class="m-nombre">{{ e.nombre }}</span>
            </a>
          </li>
        }
      </ol>
      <span class="cabezal" aria-hidden="true"><i #cabezal></i></span>
    </nav>
  `,
  styles: `
    :host {
      position: sticky;
      bottom: 0;
      z-index: 30;
      display: block;
    }
    .barra {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      height: 52px;
      padding-inline: max(12px, env(safe-area-inset-left, 0px));
      border-top: 1px solid var(--line-soft);
      background: var(--estudio-inspector);
    }
    .tc {
      flex: none;
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      font-variant-numeric: tabular-nums;
      color: var(--ink-2);
    }
    ol {
      flex: 1;
      display: flex;
      gap: 2px;
      min-width: 0;
      margin: 0;
      padding: 0;
      list-style: none;
      overflow-x: auto;
      scrollbar-width: none;
    }
    ol::-webkit-scrollbar {
      display: none;
    }
    li {
      flex: 1 0 auto;
    }
    a {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 44px;
      min-height: 44px;
      padding: 0 8px;
      border-radius: 6px;
      color: var(--ink-3);
      text-decoration: none;
      white-space: nowrap;
    }
    a:hover {
      color: var(--ink);
      background: rgba(170, 170, 255, 0.08);
    }
    /* La lista se desplaza en horizontal y recorta lo que sale de ella: el foco va por dentro. */
    a:focus-visible {
      outline-offset: -2px;
    }
    a[aria-current] {
      color: var(--ink);
      background: rgba(170, 170, 255, 0.14);
    }
    .m-id {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--signal-text);
    }
    .m-nombre {
      display: none;
      font-family: var(--estudio-fuente);
      font-size: 0.8125rem;
      font-weight: 600;
    }
    .cabezal {
      position: absolute;
      left: 0;
      right: 0;
      top: -1px;
      height: 3px;
      overflow: hidden;
    }
    .cabezal i {
      display: block;
      height: 100%;
      background: var(--estudio-barra);
      transform: scaleX(0);
      transform-origin: left center;
    }
    @media (max-width: 599.98px) {
      .tc {
        display: none;
      }
    }
    @media (min-width: 1180px) {
      .m-nombre {
        display: inline;
      }
    }
  `,
})
export class InspectorEstudio {
  readonly escenas = input.required<EscenaPagina[]>();
  protected readonly activa = signal('e01');
  private readonly tc = viewChild.required<ElementRef<HTMLElement>>('tc');
  private readonly cabezal = viewChild.required<ElementRef<HTMLElement>>('cabezal');
  private readonly documento = inject(DOCUMENT);
  private readonly movimiento = inject(Movimiento);
  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    const destruccion = inject(DestroyRef);

    afterNextRender(() => {
      const ventana = this.documento.defaultView;
      const articulo = this.anfitrion.nativeElement.parentElement;
      if (!ventana || !articulo) return;

      let pendiente = 0;
      let ultimoTc = '';
      const medir = () => {
        pendiente = 0;
        const caja = articulo.getBoundingClientRect();
        const recorrido = Math.max(1, caja.height - ventana.innerHeight);
        const leido = Math.min(recorrido, Math.max(0, -caja.top));
        const tc = codigoTiempo(leido / PX_POR_FOTOGRAMA);
        if (tc !== ultimoTc) {
          ultimoTc = tc;
          this.tc().nativeElement.textContent = tc;
        }
        this.cabezal().nativeElement.style.transform = `scaleX(${(leido / recorrido).toFixed(4)})`;
      };
      const alScroll = () => {
        if (!pendiente) pendiente = requestAnimationFrame(medir);
      };
      ventana.addEventListener('scroll', alScroll, { passive: true });
      ventana.addEventListener('resize', alScroll, { passive: true });
      medir();

      // La escena activa es la que cruza la mitad de la pantalla.
      const observador = new IntersectionObserver(
        (entradas) => {
          for (const e of entradas) {
            if (e.isIntersecting) this.activa.set((e.target as HTMLElement).id);
          }
        },
        { rootMargin: '-50% 0px -50% 0px' },
      );
      for (const e of this.escenas()) {
        const el = this.documento.getElementById(e.id);
        if (el) observador.observe(el);
      }

      destruccion.onDestroy(() => {
        ventana.removeEventListener('scroll', alScroll);
        ventana.removeEventListener('resize', alScroll);
        if (pendiente) cancelAnimationFrame(pendiente);
        observador.disconnect();
      });
    });
  }

  protected ir(evento: MouseEvent, id: string): void {
    const destino = this.documento.getElementById(id);
    if (!destino) return;
    evento.preventDefault();
    destino.scrollIntoView({
      behavior: this.movimiento.reducido() ? 'auto' : 'smooth',
      block: 'start',
    });
    destino.focus({ preventScroll: true });
    this.activa.set(id);
  }
}
