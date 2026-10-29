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
import { Movimiento } from '../../core/movimiento';
import { Orientacion } from '../../core/orientacion';
import type { AnclaCanal, ColoresCanal, EscenaCanal, PosicionAncla } from '../../escenas/conecta/canal';
import { ESTADOS_ENTREGA, PASOS, PEDIDO_EJEMPLO } from './contenido';

type Modo = 'estatico' | 'fijado' | 'pasos' | 'reducido';

/** Cuándo se enciende cada estado: copia de MOMENTOS de la escena (importarlos traería three a este chunk). */
const LLEGADAS = [0.86, 0.91, 0.96];
const TECLEO = { desde: 0.25, hasta: 0.36 };
const TERMINAL_VISIBLE = { desde: 0.24, hasta: 0.5 };

const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * "Tres nodos, un canal": el viaje de un mensaje, sincronizado con el scroll.
 * Escritorio: la sección se fija y el scroll recorre la escena (pin + scrub).
 * Móvil: la escena queda pegada arriba y cada paso la lleva a su momento.
 * Movimiento reducido: un cuadro fijo por paso, con botones.
 */
@Component({
  selector: 'app-conecta-recorrido',
  templateUrl: './recorrido.html',
  styleUrl: './recorrido.scss',
})
export class RecorridoConecta {
  private readonly raiz = viewChild.required<ElementRef<HTMLElement>>('raiz');
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly terminal = viewChild.required<ElementRef<HTMLElement>>('terminal');
  private readonly tecleado = viewChild.required<ElementRef<HTMLElement>>('tecleado');
  private readonly barra = viewChild.required<ElementRef<HTMLElement>>('barra');
  protected readonly orientacion = inject(Orientacion);
  private readonly movimiento = inject(Movimiento);
  protected readonly reducido = this.movimiento.reducido;
  private readonly documento = inject(DOCUMENT);

  protected readonly pasos = PASOS;
  protected readonly pedido = PEDIDO_EJEMPLO;
  protected readonly estados = ESTADOS_ENTREGA;
  protected readonly modo = signal<Modo>('estatico');
  protected readonly activo3d = signal(false);
  protected readonly pasoActivo = signal(0);

  private escena: EscenaCanal | null = null;
  private progreso = 0;
  private letras = -1;
  /** Arreglo y no Map: se recorre en cada cuadro y así no crea entradas nuevas. */
  private anclas: { id: AnclaCanal; el: HTMLElement }[] = [];
  private estadosEl: HTMLElement[] = [];

  constructor() {
    const destruccion = inject(DestroyRef);
    let vivo = true;
    let deshacerScroll: (() => void) | null = null;
    destruccion.onDestroy(() => {
      vivo = false;
      deshacerScroll?.();
      this.escena?.destruir();
      this.escena = null;
    });

    afterNextRender(() => {
      const raiz = this.raiz().nativeElement;
      this.anclas = Array.from(raiz.querySelectorAll<HTMLElement>('[data-ancla]')).map((el) => ({
        id: (el.dataset['ancla'] ?? '') as AnclaCanal,
        el,
      }));
      this.estadosEl = Array.from(raiz.querySelectorAll<HTMLElement>('[data-estado]'));
      const reducido = this.movimiento.reducido();

      if (reducido) {
        this.fijarModo('reducido');
        this.irAPaso(0);
      } else {
        void this.montarScroll(() => vivo).then((deshacer) => {
          if (vivo) deshacerScroll = deshacer;
          else deshacer?.();
        });
      }

      // three.js pesa: se descarga solo cuando el recorrido se acerca a la pantalla.
      const observador = new IntersectionObserver(
        async (entradas) => {
          if (!entradas.some((e) => e.isIntersecting)) return;
          observador.disconnect();
          try {
            const { crearCanal } = await import('../../escenas/conecta/canal');
            if (!vivo) return;
            this.escena = crearCanal({
              lienzo: this.lienzo().nativeElement,
              reducido,
              colores: () => this.colores(),
              alPosicionar: (pos) => this.posicionar(pos),
            });
            this.escena.progreso(this.progreso);
            this.activo3d.set(true);
          } catch {
            // Sin WebGL quedan la ilustración y los pasos: el texto no depende del 3D.
          }
        },
        { rootMargin: '400px' },
      );
      observador.observe(raiz);
      destruccion.onDestroy(() => observador.disconnect());
    });

    // Con movimiento reducido el celular no sigue al mouse ni al giroscopio: sería parallax.
    effect(() => {
      const i = this.orientacion.inclinacion();
      if (this.reducido()) return;
      this.escena?.inclinar(i.x, i.y);
    });
  }

  protected irAPaso(i: number): void {
    const n = limitar(i, 0, PASOS.length - 1);
    this.pasoActivo.set(n);
    this.aplicar(PASOS[n].momento);
  }

  protected activarGiroscopio(): void {
    void this.orientacion.activar();
  }

  /** La clase va directo al elemento: el pin mide el diseño en el acto, antes del ciclo de Angular. */
  private fijarModo(modo: Modo): void {
    const raiz = this.raiz().nativeElement;
    raiz.classList.toggle('vivo', modo !== 'estatico');
    raiz.classList.toggle('fijado', modo === 'fijado');
    raiz.classList.toggle('pasos-movil', modo === 'pasos');
    raiz.classList.toggle('reducido', modo === 'reducido');
    this.terminal().nativeElement.setAttribute('aria-hidden', modo === 'estatico' ? 'false' : 'true');
    this.modo.set(modo);
  }

  private async montarScroll(vivo: () => boolean): Promise<(() => void) | null> {
    try {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
      if (!vivo()) return null;
      gsap.registerPlugin(ScrollTrigger);
      const raiz = this.raiz().nativeElement;
      const cabecera = () =>
        parseFloat(getComputedStyle(this.documento.documentElement).getPropertyValue('--cabecera')) || 64;
      const mm = gsap.matchMedia();

      mm.add('(min-width: 960px)', () => {
        this.fijarModo('fijado');
        const proxy = { p: this.progreso };
        this.aplicar(proxy.p);
        gsap.to(proxy, {
          p: 1,
          ease: 'none',
          onUpdate: () => this.aplicar(proxy.p),
          scrollTrigger: {
            trigger: raiz,
            start: () => `top top+=${cabecera()}`,
            end: '+=420%',
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        return () => this.fijarModo('estatico');
      });

      mm.add('(max-width: 959.98px)', () => {
        this.fijarModo('pasos');
        const proxy = { p: this.progreso };
        this.aplicar(proxy.p);
        raiz.querySelectorAll<HTMLElement>('.paso').forEach((el, i) => {
          ScrollTrigger.create({
            trigger: el,
            // El paso se activa justo debajo de la escena pegada, donde se lee sin taparla.
            start: 'top 66%',
            end: 'bottom 66%',
            onToggle: (self) => {
              if (!self.isActive) return;
              this.pasoActivo.set(i);
              gsap.to(proxy, {
                p: PASOS[i].momento,
                duration: 1.6,
                ease: 'power2.inOut',
                overwrite: true,
                onUpdate: () => this.aplicar(proxy.p),
              });
            },
          });
        });
        return () => {
          // Los tweens de onToggle nacen fuera del contexto de matchMedia: se matan a mano.
          gsap.killTweensOf(proxy);
          this.fijarModo('estatico');
        };
      });

      // Las letras cambian alturas: recalcular cuando terminen de cargar.
      void this.documento.fonts?.ready.then(() => {
        if (vivo()) ScrollTrigger.refresh();
      });
      return () => mm.revert();
    } catch {
      return null;
    }
  }

  /** Un cuadro del recorrido: escena, pedido tecleado, estados y barra. Escribe el DOM directo. */
  private aplicar(p: number): void {
    this.progreso = p;
    this.escena?.progreso(p);

    const t = limitar((p - TECLEO.desde) / (TECLEO.hasta - TECLEO.desde), 0, 1);
    const n = Math.round(t * PEDIDO_EJEMPLO.length);
    if (n !== this.letras) {
      this.letras = n;
      this.tecleado().nativeElement.textContent = PEDIDO_EJEMPLO.slice(0, n);
    }
    this.terminal().nativeElement.classList.toggle(
      'visible',
      p > TERMINAL_VISIBLE.desde && p < TERMINAL_VISIBLE.hasta,
    );
    for (let i = 0; i < this.estadosEl.length; i++) {
      this.estadosEl[i].classList.toggle('encendido', p >= LLEGADAS[i]);
    }
    this.barra().nativeElement.style.transform = `scaleX(${p.toFixed(4)})`;

    if (this.modo() === 'fijado') {
      let i = PASOS.length - 1;
      while (i > 0 && p < PASOS[i].desde) i--;
      if (i !== this.pasoActivo()) this.pasoActivo.set(i);
    }
  }

  private posicionar(pos: Readonly<Record<AnclaCanal, PosicionAncla>>): void {
    for (let i = 0; i < this.anclas.length; i++) {
      const { id, el } = this.anclas[i];
      const p = pos[id];
      if (!p) continue;
      el.classList.toggle('visible', p.visible);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  private colores(): ColoresCanal {
    const css = getComputedStyle(this.documento.documentElement);
    const t = (n: string, respaldo: string) => css.getPropertyValue(n).trim() || respaldo;
    return {
      oro1: t('--conecta-oro-1', '#dcab2f'),
      oro2: t('--conecta-oro-2', '#d29d1b'),
      oro3: t('--conecta-oro-3', '#c6901a'),
      oro6: t('--conecta-oro-6', '#ab7211'),
      oroClaro: t('--conecta-oro-claro', '#f3d98e'),
      tinta: t('--conecta-tinta', '#241640'),
      tinta2: t('--conecta-tinta-2', '#301f56'),
      tintaSuave: t('--conecta-tinta-suave', '#b9aed6'),
      lila: t('--conecta-lila', '#6f5e9c'),
      linea: t('--line', '#ddd2ba'),
      ocupasalud: t('--conecta-ocupasalud', '#007fb8'),
      autoaprender: t('--conecta-autoaprender', '#a5cd39'),
      chat: t('--conecta-chat', '#efe6d6'),
      chatPunto: t('--conecta-chat-punto', 'rgba(171, 114, 17, 0.12)'),
      burbujaTexto: t('--conecta-burbuja-texto', '#1f1b24'),
      textoSuave: t('--ink-2', '#5b5266'),
      enlace: t('--conecta-enlace', '#1f7fb5'),
    };
  }
}
