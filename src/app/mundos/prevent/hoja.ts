import { Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { Movimiento } from '../../core/movimiento';
import { HOJA, RESULTADO_FILA, SERVICIOS_SOLICITUD, capitalizar, soloDigitos, type FilaHoja } from './contenido';

type EstadoFila = 'espera' | 'leyendo' | 'normalizada' | 'lista';

interface Fila extends FilaHoja {
  n: number;
  estado: EstadoFila;
  limpio: { documento: string; nombres: string; apellidos: string; telefono: string };
}

interface Tarjeta {
  documento: string;
  nombre: string;
  origen: 'nuevo' | 'existente';
}

const crearFilas = (): Fila[] =>
  HOJA.map((f, i) => ({
    ...f,
    // La plantilla real empieza a leer en la fila 6.
    n: 6 + i,
    estado: 'espera',
    limpio: {
      documento: soloDigitos(f.documento),
      nombres: capitalizar(f.nombres),
      apellidos: capitalizar(f.apellidos),
      telefono: soloDigitos(f.telefono),
    },
  }));

/**
 * "Del Excel a los trabajadores": la inscripción masiva, fila por fila. Los nombres quedan con
 * mayúscula inicial, los números sin símbolos, la fila sin documento se salta y quien ya está
 * en la solicitud no se matricula dos veces. Todo es ficticio.
 */
@Component({
  selector: 'app-prevent-hoja',
  templateUrl: './hoja.html',
  styleUrl: './hoja.scss',
})
export class HojaPrevent {
  private readonly injector = inject(Injector);
  private readonly reducido = inject(Movimiento).reducido;
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly tabla = viewChild.required<ElementRef<HTMLElement>>('tabla');

  protected readonly servicios = SERVICIOS_SOLICITUD;
  protected readonly filas = signal<Fila[]>(crearFilas());
  protected readonly tarjetas = signal<Tarjeta[]>([]);
  protected readonly registro = signal<string[]>([]);
  protected readonly procesando = signal(false);
  protected readonly abierta = signal<string | null>(null);
  protected readonly terminado = computed(() => this.filas().every((f) => f.estado === 'lista'));
  protected readonly matriculas = computed(() => this.tarjetas().length * SERVICIOS_SOLICITUD.length);

  private temporizadores: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    inject(DestroyRef).onDestroy(() => this.limpiarTiempos());
  }

  protected procesar(): void {
    if (this.procesando() || this.terminado()) return;
    this.procesando.set(true);
    if (this.reducido()) {
      for (let i = 0; i < HOJA.length; i++) {
        this.cambiarFila(i, 'normalizada');
        this.resolver(i, false);
      }
      this.procesando.set(false);
      return;
    }
    const paso = 1150;
    HOJA.forEach((_, i) => {
      this.despues(i * paso, () => this.cambiarFila(i, 'leyendo'));
      this.despues(i * paso + 380, () => this.cambiarFila(i, 'normalizada'));
      this.despues(i * paso + 820, () => this.resolver(i, true));
    });
    this.despues(HOJA.length * paso, () => this.procesando.set(false));
  }

  protected reiniciar(): void {
    this.limpiarTiempos();
    this.filas.set(crearFilas());
    this.tarjetas.set([]);
    this.registro.set([]);
    this.abierta.set(null);
    this.procesando.set(false);
  }

  protected alternar(documento: string): void {
    this.abierta.update((a) => (a === documento ? null : documento));
  }

  private resolver(i: number, animar: boolean): void {
    const fila = this.filas()[i];
    const { destino, limpio } = fila;
    const nombre = `${limpio.nombres} ${limpio.apellidos}`.trim();
    let origen: DOMRect | null = null;
    if (animar) {
      origen = this.tabla().nativeElement.querySelector(`[data-fila="${fila.n}"]`)?.getBoundingClientRect() ?? null;
    }
    this.cambiarFila(i, 'lista');
    this.registro.update((r) => [...r, `Fila ${fila.n}: ${RESULTADO_FILA[destino]}`]);

    if (destino === 'nuevo' || destino === 'existente') {
      this.tarjetas.update((t) => [...t, { documento: limpio.documento, nombre, origen: destino }]);
      if (animar && origen) {
        const desde = origen;
        afterNextRender(() => this.volar(limpio.documento, desde), { injector: this.injector });
      }
    } else if (destino === 'repetida' && animar) {
      // Quien ya está en la solicitud rebota: su tarjeta tiembla y la fila vuelve a su sitio.
      const tarjeta = this.panel().nativeElement.querySelector<HTMLElement>(`[data-documento="${limpio.documento}"]`);
      tarjeta?.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-10px)' },
          { transform: 'translateX(8px)' },
          { transform: 'translateX(-4px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 480, easing: 'ease-out' },
      );
      const filaEl = this.tabla().nativeElement.querySelector<HTMLElement>(`[data-fila="${fila.n}"]`);
      filaEl?.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(36px)' }, { transform: 'translateX(0)' }],
        { duration: 560, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
      );
    }
  }

  /** La tarjeta nueva sale de la fila del Excel y aterriza en la solicitud. */
  private volar(documento: string, desde: DOMRect): void {
    const el = this.panel().nativeElement.querySelector<HTMLElement>(`[data-documento="${documento}"]`);
    if (!el) return;
    const hasta = el.getBoundingClientRect();
    const dx = desde.left - hasta.left;
    const dy = desde.top - hasta.top;
    const sx = Math.max(desde.width / Math.max(hasta.width, 1), 0.2);
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, 0.6)`, opacity: 0.4, transformOrigin: '0 0' },
        { transform: 'translate(0, 0) scale(1, 1)', opacity: 1, transformOrigin: '0 0' },
      ],
      { duration: 620, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    );
  }

  private cambiarFila(i: number, estado: EstadoFila): void {
    this.filas.update((fs) => fs.map((f, j) => (j === i ? { ...f, estado } : f)));
  }

  private despues(ms: number, fn: () => void): void {
    this.temporizadores.push(setTimeout(fn, ms));
  }

  private limpiarTiempos(): void {
    for (const t of this.temporizadores) clearTimeout(t);
    this.temporizadores = [];
  }
}
