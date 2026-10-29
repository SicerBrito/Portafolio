import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Movimiento } from '../core/movimiento';
import { Orientacion } from '../core/orientacion';
import type { EscenaSemitono } from '../escenas/semitono';

/**
 * Tu foto, nítida: entra armándose en semitono, se revela en duotono negro y lila, y
 * donde pasa el cursor se abre una lupa que deja ver los puntos de imprenta.
 */
@Component({
  selector: 'app-retrato',
  imports: [NgOptimizedImage],
  template: `
    <figure class="marco" (pointermove)="mover($event)" (pointerleave)="salir()">
      <div class="halo" aria-hidden="true"></div>
      <img
        class="base"
        [class.oculta]="listo()"
        ngSrc="/img/retrato-sicer.png"
        width="400"
        height="400"
        priority
        alt="Retrato de Sicer Brito"
      />
      <canvas #lienzo aria-hidden="true" [class.visible]="listo()"></canvas>
      <figcaption class="label pie-foto">Fig. 01 · Sicer Brito · pasa el cursor</figcaption>
    </figure>
  `,
  styles: `
    :host {
      display: block;
    }
    .marco {
      position: relative;
      margin: 0;
      aspect-ratio: 1;
      width: 100%;
      max-width: 100%;
      background:
        linear-gradient(var(--ink-3), var(--ink-3)) top left / 18px 1px no-repeat,
        linear-gradient(var(--ink-3), var(--ink-3)) top left / 1px 18px no-repeat,
        linear-gradient(var(--ink-3), var(--ink-3)) top right / 18px 1px no-repeat,
        linear-gradient(var(--ink-3), var(--ink-3)) top right / 1px 18px no-repeat,
        linear-gradient(var(--ink-3), var(--ink-3)) bottom left / 18px 1px no-repeat,
        linear-gradient(var(--ink-3), var(--ink-3)) bottom left / 1px 18px no-repeat,
        linear-gradient(var(--ink-3), var(--ink-3)) bottom right / 18px 1px no-repeat,
        linear-gradient(var(--ink-3), var(--ink-3)) bottom right / 1px 18px no-repeat;
    }
    /* Un resplandor morado detrás de la foto, en la escala de la casa. */
    .halo {
      position: absolute;
      inset: 10%;
      border-radius: 50%;
      background: radial-gradient(circle at 50% 42%, var(--morado-3) 0%, var(--morado-1) 45%, transparent 70%);
      opacity: 0.55;
      filter: blur(24px);
    }
    .base,
    canvas {
      position: absolute;
      inset: 6%;
      width: 88%;
      height: 88%;
      object-fit: contain;
      transition: opacity 600ms var(--ease-out);
    }
    .base {
      filter: grayscale(1) contrast(1.1) brightness(1.05);
    }
    .base.oculta,
    canvas {
      opacity: 0;
    }
    canvas.visible {
      opacity: 1;
    }
    .pie-foto {
      position: absolute;
      left: 0;
      bottom: -28px;
    }
  `,
})
export class Retrato {
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly movimiento = inject(Movimiento);
  private readonly orientacion = inject(Orientacion);
  private readonly raiz = inject(DOCUMENT).documentElement;
  protected readonly listo = signal(false);
  private escena: EscenaSemitono | null = null;

  constructor() {
    const destruccion = inject(DestroyRef);
    let vivo = true;
    destruccion.onDestroy(() => {
      vivo = false;
      this.escena?.destruir();
    });

    afterNextRender(async () => {
      const imagen = new Image();
      try {
        // Con `load` y no con decode(): decode() puede quedarse esperando mientras la
        // pestaña no pinta (en segundo plano o tapada), y el efecto no arrancaría nunca.
        await new Promise<void>((listo, fallo) => {
          imagen.onload = () => listo();
          imagen.onerror = () => fallo();
          imagen.src = '/img/retrato-sicer.png';
          if (imagen.complete && imagen.naturalWidth) listo();
        });
        const { crearSemitono } = await import('../escenas/semitono');
        if (!vivo) return;
        this.escena = crearSemitono({
          lienzo: this.lienzo().nativeElement,
          imagen,
          colores: () => {
            const css = getComputedStyle(this.raiz);
            const token = (n: string) => css.getPropertyValue(n).trim();
            return { punto: token('--retrato-punto'), sombra: token('--retrato-sombra'), luz: token('--retrato-luz') };
          },
          reducido: this.movimiento.reducido(),
        });
        // La foto de respaldo solo se oculta cuando el lienzo ya pintó: si la pestaña
        // carga en segundo plano y no hay cuadros, sigue viéndose la foto y no un hueco.
        requestAnimationFrame(() => requestAnimationFrame(() => this.listo.set(true)));
      } catch {
        // Sin el efecto queda la foto en escala de grises: el contenido no depende de él.
      }
    });

    effect(() => {
      const i = this.orientacion.inclinacion();
      this.escena?.inclinar(i.x, i.y);
    });
  }

  protected mover(e: PointerEvent): void {
    const r = this.lienzo().nativeElement.getBoundingClientRect();
    this.escena?.apuntar(e.clientX - r.left, e.clientY - r.top);
  }

  protected salir(): void {
    this.escena?.apuntar(null, null);
  }
}
