import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Movimiento } from '../../core/movimiento';
import type { ColoresValvula, ConteoValvula, JuegoValvula, ModoValvula } from '../../escenas/conecta/valvula';

/**
 * "La válvula": un deslizador suelta personas hacia el celular.
 * Sin tope, lo que pasa el escalón de Meta se pierde en silencio y el panel igual dice
 * "enviado" (así era Conecta antes de su tope). Con el tope propio, lo que sobra hace fila
 * y sale cuando hay cupo.
 */
@Component({
  selector: 'app-conecta-valvula',
  templateUrl: './juego-valvula.html',
  styleUrl: './juego-valvula.scss',
})
export class JuegoValvulaConecta {
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly documento = inject(DOCUMENT);
  protected readonly reducido = inject(Movimiento).reducido;

  protected readonly modo = signal<ModoValvula>('sin-control');
  protected readonly flujo = signal(1);
  protected readonly listo = signal(false);
  protected readonly conteo = signal<ConteoValvula>({ enviados: 0, llegaron: 0, enFila: 0, perdidos: 0, uso: 0 });

  /** Sin números: así el lector de pantalla solo habla cuando cambia lo que pasa. */
  protected readonly veredicto = computed(() => {
    const c = this.conteo();
    if (this.modo() === 'sin-control' && c.perdidos > 0) {
      return 'El panel cuenta como enviados mensajes que nunca llegaron. Nadie recibió un error.';
    }
    if (this.modo() === 'conecta' && c.enFila > 0) {
      return 'Lo que no cabe espera en fila y sale cuando se libera cupo. No se pierde ninguno.';
    }
    if (this.modo() === 'conecta') return 'Con el tope propio, todo lo que sale llega.';
    return 'Por ahora todo llega. Sube el deslizador para soltar más personas.';
  });

  protected readonly porcentajeUso = computed(() => Math.round(this.conteo().uso * 100));

  private juego: JuegoValvula | null = null;

  constructor() {
    const destruccion = inject(DestroyRef);
    let vivo = true;
    destruccion.onDestroy(() => {
      vivo = false;
      this.juego?.destruir();
      this.juego = null;
    });

    afterNextRender(() => {
      const lienzo = this.lienzo().nativeElement;
      const observador = new IntersectionObserver(
        async (entradas) => {
          if (!entradas.some((e) => e.isIntersecting)) return;
          observador.disconnect();
          try {
            const { crearValvula } = await import('../../escenas/conecta/valvula');
            if (!vivo) return;
            this.juego = crearValvula({
              lienzo,
              reducido: this.reducido(),
              colores: () => this.colores(),
              alContar: (c) => this.conteo.set({ ...c }),
            });
            this.juego.flujo(this.flujo());
            this.juego.modo(this.modo());
            this.listo.set(true);
          } catch {
            // Si el código del juego no llega, quedan el texto y la nota: nada depende de él.
          }
        },
        { rootMargin: '200px' },
      );
      observador.observe(lienzo);
      destruccion.onDestroy(() => observador.disconnect());
    });
  }

  protected cambiarModo(m: ModoValvula): void {
    this.modo.set(m);
    this.juego?.modo(m);
  }

  protected cambiarFlujo(evento: Event): void {
    const valor = Number((evento.target as HTMLInputElement).value);
    this.flujo.set(valor);
    this.juego?.flujo(valor);
  }

  protected reiniciar(): void {
    this.juego?.reiniciar();
  }

  protected simular(): void {
    this.juego?.simular(20);
  }

  private colores(): ColoresValvula {
    const css = getComputedStyle(this.documento.documentElement);
    const t = (n: string, respaldo: string) => css.getPropertyValue(n).trim() || respaldo;
    return {
      oro1: t('--conecta-oro-1', '#dcab2f'),
      oro3: t('--conecta-oro-3', '#c6901a'),
      oroTexto: t('--signal-text', '#8a5a0b'),
      tinta: t('--conecta-tinta', '#241640'),
      tintaSuave: t('--conecta-lila', '#6f5e9c'),
      linea: t('--line', '#ddd2ba'),
      superficie: t('--surface', '#ffffff'),
      textoSuave: t('--ink-2', '#5b5266'),
      exito: t('--conecta-exito', '#0f7a45'),
    };
  }
}
