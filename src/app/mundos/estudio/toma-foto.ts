import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Movimiento } from '../../core/movimiento';
import { EscenaMotor } from './escena-motor';
import { tresCifras } from './motor';

type Espera = 'inmediata' | 'doble';

/** Los pasos del ciclo del navegador entre pedir un fotograma y fotografiarlo. */
const CICLO = [
  { id: 'pedir', texto: 'irAFrame(n) cambia el fotograma' },
  { id: 'detectar', texto: 'detectChanges() actualiza el DOM' },
  { id: 'raf1', texto: 'Primer requestAnimationFrame: antes de pintar' },
  { id: 'pintar', texto: 'El navegador pinta' },
  { id: 'raf2', texto: 'Segundo requestAnimationFrame: ya pintó' },
] as const;

/**
 * Toma falsa 1, recreada: si la foto se toma apenas cambia el DOM, sale el fotograma anterior.
 * Con dos cuadros del navegador de espera, sale el pedido. Es una simulación del ciclo, no una captura.
 */
@Component({
  selector: 'app-estudio-toma-foto',
  imports: [EscenaMotor],
  templateUrl: './toma-foto.html',
  styleUrl: './toma-foto.scss',
})
export class TomaFoto {
  private readonly movimiento = inject(Movimiento);
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  protected readonly ciclo = CICLO;
  protected readonly tres = tresCifras;
  protected readonly espera = signal<Espera>('inmediata');
  protected readonly pedido = signal(88);
  protected readonly foto = signal<number | null>(null);
  protected readonly corriendo = signal(false);
  /** Después de qué paso del ciclo se toma la foto. */
  protected readonly disparoTras = computed(() =>
    this.espera() === 'doble' ? 'raf2' : 'detectar',
  );
  protected readonly siguiente = computed(() =>
    this.foto() !== null ? this.pedido() + 1 : this.pedido(),
  );
  protected readonly desfasada = computed(() => {
    const f = this.foto();
    return f !== null && f !== this.pedido();
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.temporizador) clearTimeout(this.temporizador);
    });
  }

  protected elegirEspera(e: Espera): void {
    this.espera.set(e);
    this.foto.set(null);
  }

  /** Pide el siguiente fotograma y lo "fotografía" según la espera elegida. */
  protected fotografiar(): void {
    if (this.corriendo()) return;
    if (this.foto() !== null) this.pedido.update((n) => n + 1);
    const pedido = this.pedido();
    // Sin esperar, la foto ve el DOM viejo: sale el fotograma anterior.
    const resultado = this.espera() === 'doble' ? pedido : pedido - 1;
    this.foto.set(null);
    this.corriendo.set(true);
    const terminar = () => {
      this.temporizador = null;
      this.corriendo.set(false);
      this.foto.set(resultado);
    };
    if (this.movimiento.reducido()) terminar();
    else this.temporizador = setTimeout(terminar, 1300);
  }
}
