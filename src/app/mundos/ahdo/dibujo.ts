import { Component, DestroyRef, ElementRef, afterNextRender, inject, input, signal } from '@angular/core';
import { Movimiento } from '../../core/movimiento';
import { ICONOS } from './iconos';

/** Ilustraciones de línea de "Dos módulos por dentro". Se dibujan una vez al entrar en pantalla. */
@Component({
  selector: 'app-ahdo-dibujo',
  templateUrl: './dibujo.html',
  styleUrl: './dibujo.scss',
  host: { '[class.visto]': 'visto()', '[class.animar]': 'animar()' },
})
export class AhdoDibujo {
  readonly cual = input.required<'psicometria' | 'facturacion'>();

  protected readonly icoFactura = ICONOS.factura;
  protected readonly renglones = [38, 62, 86, 110];
  protected readonly filas = [{ texto: 'Preguntas' }, { texto: 'Saltos' }, { texto: 'Reglas' }];
  protected readonly visto = signal(false);
  /** Sin JavaScript (o con movimiento reducido) los trazos ya están dibujados. */
  protected readonly animar = signal(false);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destruccion = inject(DestroyRef);
    const movimiento = inject(Movimiento);
    afterNextRender(() => {
      if (movimiento.reducido()) return;
      this.animar.set(true);
      const observador = new IntersectionObserver(
        (entradas) => {
          if (!entradas.some((e) => e.isIntersecting)) return;
          observador.disconnect();
          this.visto.set(true);
        },
        { threshold: 0.3 },
      );
      observador.observe(host);
      destruccion.onDestroy(() => observador.disconnect());
    });
  }
}
