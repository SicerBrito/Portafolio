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
import type { AnclaAndamio, ColoresAndamio, EscenaAndamio, PosicionAncla } from '../../escenas/prevent/andamio';
import { conteo, estadoDocumento, limitar, NIVELES, type EstadoDocumento } from '../../escenas/prevent/fases';
import { CURSO_EJEMPLO, PASOS, REQUISITOS } from './contenido';

type Modo = 'estatico' | 'fijado' | 'pasos' | 'reducido';

const ETIQUETA_ESTADO: Record<EstadoDocumento, string> = {
  pendiente: 'Pendiente',
  cargado: 'Cargado',
  valido: 'Válido',
};

/**
 * "La escalada": subir el andamio es cumplir los requisitos del curso.
 * Escritorio: la sección se fija y el scroll sube por el andamio (pin + scrub).
 * Móvil: el andamio queda pegado arriba y cada paso lo lleva a su travesaño.
 * Movimiento reducido: un cuadro fijo por paso, con botones.
 */
@Component({
  selector: 'app-prevent-escalada',
  templateUrl: './escalada.html',
  styleUrl: './escalada.scss',
})
export class EscaladaPrevent {
  private readonly raiz = viewChild.required<ElementRef<HTMLElement>>('raiz');
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly barra = viewChild.required<ElementRef<HTMLElement>>('barra');
  private readonly aguja = viewChild.required<ElementRef<HTMLElement>>('aguja');
  protected readonly orientacion = inject(Orientacion);
  private readonly movimiento = inject(Movimiento);
  protected readonly reducido = this.movimiento.reducido;
  private readonly documento = inject(DOCUMENT);

  protected readonly pasos = PASOS;
  protected readonly requisitos = REQUISITOS;
  protected readonly curso = CURSO_EJEMPLO;
  protected readonly etiquetas = ETIQUETA_ESTADO;
  /** Los pasos de un travesaño con documento alternativo muestran sus dos opciones. */
  protected readonly alternativas = PASOS.map((_, i) =>
    i > 0 && i <= REQUISITOS.length ? (REQUISITOS[i - 1].alternativas ?? null) : null,
  );
  protected readonly niveles = NIVELES;
  protected readonly modo = signal<Modo>('estatico');
  protected readonly activo3d = signal(false);
  protected readonly pasoActivo = signal(0);
  /** Estados de los cuatro documentos y los contadores de la matrícula de ejemplo. */
  protected readonly estados = signal<readonly EstadoDocumento[]>(REQUISITOS.map(() => 'pendiente' as const));
  protected readonly cuenta = signal(conteo(0));

  private escena: EscenaAndamio | null = null;
  private progreso = 0;
  private anclas: { id: AnclaAndamio; el: HTMLElement }[] = [];
  /** Ancho de la etiqueta de la cima, medido la primera vez que se ve (0 = sin medir). */
  private anchoCumbre = 0;

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
        id: (el.dataset['ancla'] ?? '') as AnclaAndamio,
        el,
      }));
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

      // three.js pesa: se descarga solo cuando el andamio se acerca a la pantalla.
      const observador = new IntersectionObserver(
        async (entradas) => {
          if (!entradas.some((e) => e.isIntersecting)) return;
          observador.disconnect();
          try {
            const { crearAndamio } = await import('../../escenas/prevent/andamio');
            if (!vivo) return;
            this.escena = crearAndamio({
              lienzo: this.lienzo().nativeElement,
              reducido,
              personaje: '/marcas/prevent/personaje-prevent.webp',
              colores: () => this.colores(),
              alPosicionar: (pos) => this.posicionar(pos),
            });
            this.escena.progreso(this.progreso);
            this.activo3d.set(true);
            void this.documento.fonts?.ready.then(() => {
              if (!vivo) return;
              // Con Poppins cargada la etiqueta de la cima cambia de ancho: se vuelve a medir.
              this.anchoCumbre = 0;
              this.escena?.redibujarTextos();
            });
          } catch {
            // Sin WebGL quedan el dibujo del andamio y los pasos: el texto no depende del 3D.
          }
        },
        { rootMargin: '400px' },
      );
      observador.observe(raiz);
      destruccion.onDestroy(() => observador.disconnect());
    });

    // Con movimiento reducido el andamio no se balancea: sería movimiento que nadie pidió.
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
            // Subir cuesta: cinco pantallas de scroll para cuatro travesaños y la cumbre.
            end: '+=500%',
            pin: true,
            scrub: 0.7,
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
        // Un solo disparador para toda la lista: el paso activo es el último que cruzó la línea
        // de lectura, debajo de la escena pegada. Así también acierta si el scroll salta.
        const lista = Array.from(raiz.querySelectorAll<HTMLElement>('.paso'));
        let actual = -1;
        const elegir = () => {
          const linea = window.innerHeight * 0.66;
          let i = 0;
          for (let k = 0; k < lista.length; k++) if (lista[k].getBoundingClientRect().top <= linea) i = k;
          if (i === actual) return;
          actual = i;
          this.pasoActivo.set(i);
          gsap.to(proxy, {
            p: PASOS[i].momento,
            duration: 1.8,
            ease: 'power2.inOut',
            overwrite: true,
            onUpdate: () => this.aplicar(proxy.p),
          });
        };
        ScrollTrigger.create({
          trigger: raiz.querySelector('.pasos') ?? raiz,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: elegir,
          onRefresh: elegir,
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

  /** Un cuadro del recorrido: escena, cielo, altímetro, contadores y paso activo. */
  private aplicar(p: number): void {
    this.progreso = p;
    this.escena?.progreso(p);
    const raiz = this.raiz().nativeElement;
    raiz.style.setProperty('--altura', p.toFixed(3));
    this.barra().nativeElement.style.transform = `scaleX(${p.toFixed(4)})`;
    this.aguja().nativeElement.style.transform = `translateY(${((1 - p) * 100).toFixed(2)}%)`;

    // Los signals solo cambian cuando cambia un estado: no en cada cuadro del scroll.
    const actuales = this.estados();
    let cambio = false;
    for (let i = 0; i < actuales.length; i++) {
      if (estadoDocumento(p, i) !== actuales[i]) {
        cambio = true;
        break;
      }
    }
    if (cambio) {
      this.estados.set(REQUISITOS.map((_, i) => estadoDocumento(p, i)));
      this.cuenta.set(conteo(p));
    }

    if (this.modo() === 'fijado') {
      let i = PASOS.length - 1;
      while (i > 0 && p < PASOS[i].desde) i--;
      if (i !== this.pasoActivo()) this.pasoActivo.set(i);
    }
  }

  private posicionar(pos: Readonly<Record<AnclaAndamio, PosicionAncla>>): void {
    for (let i = 0; i < this.anclas.length; i++) {
      const { id, el } = this.anclas[i];
      const p = pos[id];
      if (!p) continue;
      el.classList.toggle('visible', p.visible);
      // Una etiqueta oculta no se mueve: así no se arma un texto de transform por cuadro para nada.
      if (!p.visible) continue;
      let x = p.x;
      // La etiqueta cuelga a la izquierda de su punto. En el celular el certificado queda cerca del
      // borde y la de la cima se cortaba (medido a 375 px): se mantiene dentro del escenario. Su
      // ancho no cambia con el recorrido, así que se lee una sola vez.
      if (id === 'cumbre') {
        if (!this.anchoCumbre) this.anchoCumbre = el.offsetWidth;
        x = Math.max(x, this.anchoCumbre + 8);
      }
      el.style.transform = `translate(${x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-100%, -50%)`;
    }
  }

  private colores(): ColoresAndamio {
    const css = getComputedStyle(this.documento.documentElement);
    const t = (n: string, respaldo: string) => css.getPropertyValue(n).trim() || respaldo;
    return {
      oro: t('--prevent-oro', '#c09230'),
      oroClaro: t('--prevent-amarillo-claro', '#ffef42'),
      ambar: t('--prevent-ambar', '#e9b036'),
      marron: t('--prevent-marron', '#855623'),
      amarillo: t('--prevent-amarillo', '#f1df14'),
      verde: t('--prevent-verde', '#80a315'),
      gris: t('--prevent-gris', '#727272'),
      fondo: t('--bg', '#0f0b07'),
      superficie: t('--surface-2', '#231a10'),
      linea: t('--line', '#3a2c1b'),
      crema: t('--ink', '#fbf4e6'),
    };
  }
}
