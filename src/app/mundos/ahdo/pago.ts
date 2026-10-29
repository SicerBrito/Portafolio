import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Movimiento } from '../../core/movimiento';
import { Orientacion } from '../../core/orientacion';
import type { EscenaPlanta, PosicionEtiqueta } from '../../escenas/ahdo/planta';
import { CONDUCTOS_PLANTA, NODOS_PLANTA, PASOS_PAGO, type NodoPlantaId } from './datos';
import { ICONOS } from './iconos';
import { altoCabecera, cargarGsap, reordenar, type Gsap } from './animacion';

/** 'fijo': sin animación (o antes de cargar). 'pin': escritorio, el scroll decide el paso. 'pila': celular. */
type Modo = 'fijo' | 'pin' | 'pila';

/** Fracción del ancho que ocupa el texto sobre la maqueta en escritorio. */
const RESERVA_PANEL = 0.44;

/** Los conductos vistos desde arriba, en ángulo recto como en la maqueta. */
const CONDUCTOS_PLANO = CONDUCTOS_PLANTA.map(([de, a]) => {
  const A = NODOS_PLANTA.find((n) => n.id === de);
  const B = NODOS_PLANTA.find((n) => n.id === a);
  if (!A || !B) return '';
  return A.x !== B.x && A.z !== B.z ? `M${A.x} ${A.z}H${B.x}V${B.z}` : `M${A.x} ${A.z}L${B.x} ${B.z}`;
});

/** "La vida de un pago": la maqueta 3D de AHDO, sincronizada con el scroll. */
@Component({
  selector: 'app-ahdo-pago',
  templateUrl: './pago.html',
  styleUrl: './pago.scss',
})
export class AhdoPago {
  private readonly pin = viewChild.required<ElementRef<HTMLElement>>('pin');
  private readonly caja = viewChild.required<ElementRef<HTMLElement>>('caja');
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly riel = viewChild<ElementRef<HTMLElement>>('riel');
  private readonly movimiento = inject(Movimiento);
  private readonly orientacion = inject(Orientacion);
  private readonly raiz = inject(DOCUMENT).documentElement;

  protected readonly pasos = PASOS_PAGO;
  protected readonly nodos = NODOS_PLANTA;
  protected readonly iconos = ICONOS;
  protected readonly conductos = CONDUCTOS_PLANO;
  protected readonly pasoActivo = signal(0);
  protected readonly modo = signal<Modo>('fijo');
  protected readonly listo = signal(false);
  protected readonly con3d = signal(false);
  protected readonly activos = computed(() => new Set<NodoPlantaId>(PASOS_PAGO[this.pasoActivo()].nodos));
  protected readonly nota = computed(() => PASOS_PAGO[this.pasoActivo()].nota ?? null);

  private escena: EscenaPlanta | null = null;
  private disparador: ReturnType<Gsap['ScrollTrigger']['create']> | null = null;
  private etiquetas = new Map<string, HTMLElement>();
  /** Última posición escrita de cada etiqueta: el DOM solo se toca si cambió. */
  private readonly previas = new Map<string, { x: number; y: number; visible: boolean | null }>();

  constructor() {
    const destruccion = inject(DestroyRef);
    let vivo = true;
    let revertir: (() => void) | null = null;
    destruccion.onDestroy(() => {
      vivo = false;
      revertir?.();
      this.escena?.destruir();
    });

    afterNextRender(() => {
      const pin = this.pin().nativeElement;
      const observador = new IntersectionObserver(
        async (entradas) => {
          if (!entradas.some((e) => e.isIntersecting)) return;
          observador.disconnect();
          await this.montar(() => vivo);
          if (!vivo) return;
          this.listo.set(true);
          try {
            revertir = await this.sincronizar(() => vivo);
          } catch {
            // Sin GSAP quedan los botones de paso: el recorrido se sigue igual.
          }
        },
        { rootMargin: '400px' },
      );
      observador.observe(pin);
      destruccion.onDestroy(() => observador.disconnect());
    });

    effect(() => {
      const i = this.orientacion.inclinacion();
      this.escena?.inclinar(i.x * 0.6, i.y * 0.6);
    });

    // Si el visitante activa el movimiento reducido con la página abierta, los paquetes se detienen.
    effect(() => {
      const reducido = this.movimiento.reducido();
      this.escena?.reducir(reducido);
    });
  }

  /** Botones de paso: en escritorio llevan el scroll al punto del paso; si no, cambian el paso. */
  protected irA(i: number): void {
    const paso = Math.max(0, Math.min(PASOS_PAGO.length - 1, i));
    const st = this.disparador;
    if (this.modo() === 'pin' && st) {
      const destino = st.start + (paso / (PASOS_PAGO.length - 1)) * (st.end - st.start);
      window.scrollTo({ top: destino + 1, behavior: 'smooth' });
      return;
    }
    if (this.modo() === 'pila') {
      const el = this.pin().nativeElement.querySelectorAll<HTMLElement>('.paso')[paso];
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    this.fijarPaso(paso);
  }

  private fijarPaso(i: number): void {
    if (i !== this.pasoActivo()) this.pasoActivo.set(i);
    this.escena?.progreso(i);
  }

  private async montar(vivo: () => boolean): Promise<void> {
    try {
      const { crearPlanta } = await import('../../escenas/ahdo/planta');
      if (!vivo()) return;
      const caja = this.caja().nativeElement;
      this.etiquetas = new Map(
        Array.from(caja.querySelectorAll<HTMLElement>('[data-id]')).map((el) => [el.dataset['id'] ?? '', el]),
      );
      this.escena = crearPlanta({
        lienzo: this.lienzo().nativeElement,
        nodos: NODOS_PLANTA,
        conductos: CONDUCTOS_PLANTA,
        pasos: PASOS_PAGO,
        colores: () => this.colores(),
        reducido: this.movimiento.reducido(),
        alPosicionar: (pos) => this.posicionar(pos),
      });
      this.escena.progreso(this.pasoActivo());
      this.con3d.set(true);
    } catch {
      // Sin WebGL quedan los siete pasos en texto: la explicación no depende del 3D.
    }
  }

  private async sincronizar(vivo: () => boolean): Promise<(() => void) | null> {
    if (this.movimiento.reducido()) return null;
    const { gsap, ScrollTrigger } = await cargarGsap();
    if (!vivo()) return null;
    const pin = this.pin().nativeElement;
    const ultimo = PASOS_PAGO.length - 1;
    const mm = gsap.matchMedia();

    mm.add('(min-width: 1000px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)', () => {
      this.modo.set('pin');
      this.escena?.reservar(RESERVA_PANEL);
      this.disparador = ScrollTrigger.create({
        trigger: pin,
        pin: true,
        start: () => `top top+=${altoCabecera()}`,
        end: () => `+=${Math.round(window.innerHeight * 0.6 * PASOS_PAGO.length)}`,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: (st) => {
          const p = st.progress * ultimo;
          this.escena?.progreso(p);
          const riel = this.riel()?.nativeElement;
          if (riel) riel.style.transform = `scaleX(${st.progress.toFixed(4)})`;
          const i = Math.round(p);
          if (i !== this.pasoActivo()) this.pasoActivo.set(i);
        },
      });
      return () => {
        this.disparador = null;
        this.modo.set('fijo');
        this.escena?.reservar(0);
      };
    });

    mm.add(
      '(prefers-reduced-motion: no-preference) and (max-width: 999.98px), (prefers-reduced-motion: no-preference) and (max-height: 699.98px)',
      () => {
        this.modo.set('pila');
        pin.querySelectorAll<HTMLElement>('.paso').forEach((el, i) => {
          ScrollTrigger.create({
            trigger: el,
            start: 'top 62%',
            end: 'bottom 62%',
            onToggle: (st) => {
              if (st.isActive) this.fijarPaso(i);
            },
          });
        });
        return () => this.modo.set('fijo');
      },
    );

    // El pin cambia el alto de la página: las secciones de abajo recalculan sus posiciones.
    // Dos cuadros: el primero deja que Angular pinte la clase del modo; el segundo mide.
    requestAnimationFrame(() => requestAnimationFrame(() => vivo() && reordenar(ScrollTrigger)));
    return () => mm.revert();
  }

  /** Corre en cada cuadro de la escena: si la cámara no se movió, no asigna nada ni toca el DOM. */
  private posicionar(pos: Record<string, PosicionEtiqueta>): void {
    for (const id in pos) {
      const p = pos[id];
      const el = this.etiquetas.get(id);
      if (!p || !el) continue;
      let previa = this.previas.get(id);
      if (!previa) {
        previa = { x: Number.NaN, y: Number.NaN, visible: null };
        this.previas.set(id, previa);
      }
      if (previa.visible !== p.visible) {
        previa.visible = p.visible;
        el.style.visibility = p.visible ? 'visible' : 'hidden';
      }
      if (Math.abs(previa.x - p.x) < 0.1 && Math.abs(previa.y - p.y) < 0.1) continue;
      previa.x = p.x;
      previa.y = p.y;
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  private colores() {
    const css = getComputedStyle(this.raiz);
    const token = (n: string) => css.getPropertyValue(n).trim();
    return {
      lineaSuave: token('--line') || '#3d3066',
      linea: token('--line') || '#3d3066',
      reposo: token('--surface-2') || '#2a1f4a',
      tinta3: token('--ink-3') || '#9a90c2',
      senal: token('--ahdo-lila') || '#aaaaff',
      morado: token('--ahdo-morado') || '#8b5ffc',
      azul: token('--ahdo-azul') || '#007fb8',
      verde: token('--ahdo-verde') || '#00944a',
    };
  }
}
