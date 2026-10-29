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
import type { AnclaPregunta, ColoresPregunta, EscenaPregunta, PosicionAncla } from '../../escenas/backbone/pregunta';
import { CONVERSACION_EJEMPLO, PASOS_PREGUNTA } from './contenido';

type Modo = 'estatico' | 'fijado' | 'pasos' | 'reducido';

const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Cuándo aparece cada pieza del DOM sobre la escena (mismo reloj que la escena). */
const BURBUJA = { desde: 0.015, hasta: 0.44 };
const CONSOLA = { desde: 0.5, hasta: 1.01 };
const EVENTOS = [0.53, 0.72, 0.9];
const TECLEO = { desde: 0.72, hasta: 0.9 };
const RECIBO = 0.92;

/** Avance de cada paso: de su `desde` al `desde` del siguiente. */
export function avancePaso(p: number, i: number): number {
  const a = PASOS_PREGUNTA[i].desde;
  const b = i + 1 < PASOS_PREGUNTA.length ? PASOS_PREGUNTA[i + 1].desde : 1;
  return limitar((p - a) / (b - a), 0, 1);
}

/** El paso que manda en un progreso dado. */
export function pasoEn(p: number): number {
  let i = PASOS_PREGUNTA.length - 1;
  while (i > 0 && p < PASOS_PREGUNTA[i].desde) i--;
  return i;
}

/**
 * "La vida de una pregunta": la traza de una petición, sincronizada con el scroll.
 * Escritorio: la sección se fija y el scroll arrastra la escena y llena la traza (pin + scrub).
 * Móvil: la escena queda pegada arriba y cada paso la lleva a su momento.
 * Movimiento reducido: un cuadro fijo por paso, con botones.
 */
@Component({
  selector: 'app-backbone-recorrido',
  templateUrl: './recorrido.html',
  styleUrl: './recorrido.scss',
})
export class RecorridoBackbone {
  private readonly raiz = viewChild.required<ElementRef<HTMLElement>>('raiz');
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly burbuja = viewChild.required<ElementRef<HTMLElement>>('burbuja');
  private readonly consola = viewChild.required<ElementRef<HTMLElement>>('consola');
  private readonly tecleado = viewChild.required<ElementRef<HTMLElement>>('tecleado');
  private readonly recibo = viewChild.required<ElementRef<HTMLElement>>('recibo');
  private readonly barra = viewChild.required<ElementRef<HTMLElement>>('barra');
  private readonly traza = viewChild.required<ElementRef<HTMLElement>>('traza');
  protected readonly orientacion = inject(Orientacion);
  private readonly movimiento = inject(Movimiento);
  protected readonly reducido = this.movimiento.reducido;
  private readonly documento = inject(DOCUMENT);

  protected readonly pasos = PASOS_PREGUNTA;
  protected readonly conversacion = CONVERSACION_EJEMPLO;
  protected readonly modo = signal<Modo>('estatico');
  protected readonly activo3d = signal(false);
  protected readonly pasoActivo = signal(0);

  private escena: EscenaPregunta | null = null;
  private progreso = 0;
  private letras = -1;
  /** `ancho`: medida de la etiqueta, tomada una sola vez (0 = sin medir). */
  private anclas: { id: AnclaPregunta; el: HTMLElement; ancho: number }[] = [];
  /** El ancho del lienzo con el que se midieron las etiquetas: si cambia, se vuelven a medir. */
  private anchoMedido = 0;
  private barrasPaso: HTMLElement[] = [];
  private eventosEl: HTMLElement[] = [];

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
        id: (el.dataset['ancla'] ?? '') as AnclaPregunta,
        el,
        ancho: 0,
      }));
      this.barrasPaso = Array.from(raiz.querySelectorAll<HTMLElement>('[data-barra]'));
      this.eventosEl = Array.from(raiz.querySelectorAll<HTMLElement>('[data-evento]'));
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
            const { crearPregunta } = await import('../../escenas/backbone/pregunta');
            if (!vivo) return;
            this.escena = crearPregunta({
              lienzo: this.lienzo().nativeElement,
              reducido,
              colores: () => this.colores(),
              alPosicionar: (pos, ancho) => this.posicionar(pos, ancho),
            });
            this.escena.progreso(this.progreso);
            this.escena.margenIzquierdo(this.margenEscena());
            this.activo3d.set(true);
          } catch {
            // Sin WebGL quedan el plano, la traza y la consola: el texto no depende del 3D.
          }
        },
        { rootMargin: '400px' },
      );
      observador.observe(raiz);
      destruccion.onDestroy(() => observador.disconnect());
    });

    // Con movimiento reducido la cámara no sigue al mouse ni al giroscopio.
    effect(() => {
      const i = this.orientacion.inclinacion();
      if (this.reducido()) return;
      this.escena?.inclinar(i.x, i.y);
    });
  }

  protected irAPaso(i: number): void {
    const n = limitar(i, 0, PASOS_PREGUNTA.length - 1);
    this.pasoActivo.set(n);
    this.aplicar(PASOS_PREGUNTA[n].momento);
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
    this.modo.set(modo);
    this.escena?.margenIzquierdo(this.margenEscena());
  }

  /** En escritorio la traza tapa la izquierda de la escena: la imagen se corre ese tanto. */
  private margenEscena(): number {
    return this.modo() === 'fijado' ? this.traza().nativeElement.offsetWidth + 20 : 0;
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
            end: '+=520%',
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
            start: 'top 70%',
            end: 'bottom 70%',
            onToggle: (self) => {
              if (!self.isActive) return;
              this.pasoActivo.set(i);
              gsap.to(proxy, {
                p: PASOS_PREGUNTA[i].momento,
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

      void this.documento.fonts?.ready.then(() => {
        if (vivo()) ScrollTrigger.refresh();
      });
      return () => mm.revert();
    } catch {
      return null;
    }
  }

  /** Un cuadro del recorrido: escena, traza, burbuja, consola y recibo. Escribe el DOM directo. */
  private aplicar(p: number): void {
    this.progreso = p;
    this.escena?.progreso(p);

    for (let i = 0; i < this.barrasPaso.length; i++) {
      this.barrasPaso[i].style.transform = `scaleX(${avancePaso(p, i).toFixed(3)})`;
    }
    this.burbuja().nativeElement.classList.toggle('visible', p > BURBUJA.desde && p < BURBUJA.hasta);
    this.consola().nativeElement.classList.toggle('visible', p > CONSOLA.desde && p < CONSOLA.hasta);
    for (let i = 0; i < this.eventosEl.length; i++) {
      this.eventosEl[i].classList.toggle('llegado', p >= EVENTOS[i]);
    }
    const t = limitar((p - TECLEO.desde) / (TECLEO.hasta - TECLEO.desde), 0, 1);
    const n = Math.round(t * CONVERSACION_EJEMPLO.respuesta.length);
    if (n !== this.letras) {
      this.letras = n;
      this.tecleado().nativeElement.textContent = CONVERSACION_EJEMPLO.respuesta.slice(0, n);
    }
    this.recibo().nativeElement.classList.toggle('visible', p >= RECIBO);
    this.barra().nativeElement.style.transform = `scaleX(${p.toFixed(4)})`;

    if (this.modo() === 'fijado') {
      const i = pasoEn(p);
      if (i !== this.pasoActivo()) this.pasoActivo.set(i);
    }
  }

  private posicionar(pos: Readonly<Record<AnclaPregunta, PosicionAncla>>, ancho: number): void {
    // Cambió el ancho (giro del celular, otra media query): las etiquetas se vuelven a medir.
    if (ancho !== this.anchoMedido) {
      this.anchoMedido = ancho;
      for (let i = 0; i < this.anclas.length; i++) this.anclas[i].ancho = 0;
    }
    for (let i = 0; i < this.anclas.length; i++) {
      const ancla = this.anclas[i];
      const a = pos[ancla.id];
      if (!a) continue;
      ancla.el.classList.toggle('visible', a.visible);
      // La oculta no se mueve: así no se arma un texto nuevo por cuadro para nada.
      if (!a.visible) continue;
      // Se mide una vez por etiqueta, no por cuadro.
      if (!ancla.ancho) ancla.ancho = ancla.el.offsetWidth;
      // En 375 px una etiqueta centrada en su objeto quedaba cortada contra el borde: se corre adentro.
      const medio = ancla.ancho / 2 + 6;
      const x = ancho > medio * 2 ? limitar(a.x, medio, ancho - medio) : a.x;
      ancla.el.style.transform = `translate(${x.toFixed(1)}px, ${a.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  private colores(): ColoresPregunta {
    const css = getComputedStyle(this.documento.documentElement);
    const t = (n: string, respaldo: string) => css.getPropertyValue(n).trim() || respaldo;
    return {
      fondo: t('--bg', '#0b0f1a'),
      linea: t('--line', '#38425f'),
      lineaSuave: t('--line-soft', '#252d44'),
      tinta: t('--ink', '#e8ecf6'),
      tinta3: t('--ink-3', '#9aa5bf'),
      senal: t('--signal', '#8b93ff'),
      indigo: t('--backbone-indigo', '#4f46e5'),
      violeta: t('--backbone-violeta', '#7c3aed'),
      noche: t('--backbone-noche', '#312e81'),
      exito: t('--backbone-exito', '#4ade9c'),
      aviso: t('--backbone-aviso', '#fbbf24'),
      peligro: t('--backbone-peligro', '#ff8a8a'),
      ahdo: t('--backbone-ahdo', '#8b5ffc'),
      ocupasalud: t('--backbone-ocupasalud', '#0077bd'),
      superficie: t('--surface', '#121829'),
      superficie2: t('--surface-2', '#1a2136'),
    };
  }
}
