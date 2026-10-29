import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Movimiento } from '../../core/movimiento';
import { CLIENTE_FICTICIO, DESTINOS, SERVICIOS_DEMO, type DestinoId, type ServicioDemo } from './datos';

type ModuloFlip = typeof import('gsap/Flip');

interface Arrastre {
  id: string;
  el: HTMLElement;
  puntero: number;
  x0: number;
  y0: number;
  sobre: DestinoId | null;
}

/**
 * La mesa de "¿A quién se le factura?": se mueve un servicio del cliente y la factura de ejemplo
 * se rearma. Se carga diferida (pesa); el texto de la historia vive en AhdoFactura.
 */
@Component({
  selector: 'app-ahdo-mesa',
  templateUrl: './mesa.html',
  styleUrl: './mesa.scss',
})
export class AhdoMesa {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly movimiento = inject(Movimiento);

  protected readonly cliente = CLIENTE_FICTICIO;
  protected readonly destinos = DESTINOS;
  protected readonly asignacion = signal<Record<string, DestinoId>>(
    Object.fromEntries(SERVICIOS_DEMO.map((s) => [s.id, s.inicial])),
  );
  protected readonly ultimo = signal<string>('psico');
  protected readonly sobre = signal<DestinoId | null>(null);
  protected readonly arrastrando = signal<string | null>(null);
  protected readonly anuncio = signal('');

  protected readonly porDestino = computed(() => {
    const a = this.asignacion();
    return DESTINOS.map((d) => ({ destino: d, servicios: SERVICIOS_DEMO.filter((s) => a[s.id] === d.id) }));
  });
  protected readonly facturas = computed(() => this.porDestino().filter((g) => g.servicios.length > 0));
  protected readonly registro = computed(() => {
    const s = SERVICIOS_DEMO.find((x) => x.id === this.ultimo()) ?? SERVICIOS_DEMO[0];
    return { servicio: s, destino: this.destinoDe(this.asignacion()[s.id]) };
  });

  private flip: ModuloFlip['Flip'] | null = null;
  private arrastre: Arrastre | null = null;
  // Los escuchas del documento existen solo mientras dura un arrastre.
  private readonly mover = (e: PointerEvent) => this.alMover(e);
  private readonly soltar = (e: PointerEvent) => this.alSoltar(e);
  private readonly abortar = () => this.limpiar();

  constructor() {
    let vivo = true;
    inject(DestroyRef).onDestroy(() => {
      vivo = false;
      this.cancelar();
    });
    afterNextRender(() => {
      if (this.movimiento.reducido()) return;
      void Promise.all([import('gsap'), import('gsap/Flip')]).then(([g, f]) => {
        if (!vivo) return;
        g.gsap.registerPlugin(f.Flip);
        this.flip = f.Flip;
      });
    });
  }

  protected destinoDe(id: DestinoId) {
    return DESTINOS.find((d) => d.id === id) ?? DESTINOS[0];
  }

  /** A quién se le factura, dicho con el nombre de quien recibe la factura. */
  protected receptor(id: DestinoId): string {
    return id === 'cliente' ? CLIENTE_FICTICIO : this.destinoDe(id).nombre;
  }

  protected asignar(servicio: ServicioDemo, destino: DestinoId): void {
    if (this.asignacion()[servicio.id] === destino) {
      this.ultimo.set(servicio.id);
      return;
    }
    const raiz = this.host.nativeElement;
    const estado = this.flip && !this.movimiento.reducido() ? this.flip.getState(raiz.querySelectorAll('[data-flip-id]')) : null;
    this.asignacion.update((a) => ({ ...a, [servicio.id]: destino }));
    this.ultimo.set(servicio.id);
    this.anuncio.set(`${servicio.nombre}: ahora se le factura a ${this.receptor(destino)}.`);
    if (estado && this.flip) {
      const flip = this.flip;
      afterNextRender(
        () => {
          flip.from(estado, {
            targets: raiz.querySelectorAll('[data-flip-id]'),
            duration: 0.55,
            ease: 'power3.inOut',
            nested: true,
            prune: true,
          });
        },
        { injector: this.injector },
      );
    }
  }

  // ---------------------------------------------------------------- arrastre con puntero

  protected empezar(evento: PointerEvent, servicio: ServicioDemo): void {
    if (evento.button !== 0) return;
    const el = (evento.currentTarget as HTMLElement).closest<HTMLElement>('.servicio');
    if (!el) return;
    evento.preventDefault();
    this.arrastre = { id: servicio.id, el, puntero: evento.pointerId, x0: evento.clientX, y0: evento.clientY, sobre: null };
    this.arrastrando.set(servicio.id);
    document.addEventListener('pointermove', this.mover);
    document.addEventListener('pointerup', this.soltar);
    document.addEventListener('pointercancel', this.abortar);
  }

  private alMover(evento: PointerEvent): void {
    const a = this.arrastre;
    if (!a || evento.pointerId !== a.puntero) return;
    a.el.style.transform = `translate(${evento.clientX - a.x0}px, ${evento.clientY - a.y0}px) rotate(-2deg)`;
    const debajo = document.elementFromPoint(evento.clientX, evento.clientY);
    const zona = debajo?.closest<HTMLElement>('[data-destino]');
    const id = (zona?.dataset['destino'] as DestinoId | undefined) ?? null;
    a.sobre = id;
    if (id !== this.sobre()) this.sobre.set(id);
  }

  private alSoltar(evento: PointerEvent): void {
    const a = this.arrastre;
    if (!a || evento.pointerId !== a.puntero) return;
    const servicio = SERVICIOS_DEMO.find((s) => s.id === a.id);
    const destino = a.sobre;
    // Primero se reasigna (Flip toma la foto con la tarjeta donde se soltó) y luego se limpia.
    if (servicio && destino) this.asignar(servicio, destino);
    this.limpiar();
  }

  private cancelar(): void {
    this.limpiar();
  }

  /** Solo toca el documento si hubo arrastre: en el servidor nunca lo hay. */
  private limpiar(): void {
    const a = this.arrastre;
    if (!a) return;
    document.removeEventListener('pointermove', this.mover);
    document.removeEventListener('pointerup', this.soltar);
    document.removeEventListener('pointercancel', this.abortar);
    a.el.style.transform = '';
    this.arrastre = null;
    this.arrastrando.set(null);
    this.sobre.set(null);
  }
}
