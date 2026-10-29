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
import { RouterLink } from '@angular/router';
import { Movimiento } from '../../core/movimiento';
import { Orientacion } from '../../core/orientacion';
import { horasRestantes, textoEspera, type AnclaSede, type SalaId } from '../../escenas/ocupasalud/momentos';
import type { ColoresSede, EscenaSede, PosicionAncla } from '../../escenas/ocupasalud/sede';
import { PASOS, TURNO } from './contenido';
import { ICONOS } from './iconos';
import { PICTOGRAMAS } from './pictogramas';

type Modo = 'estatico' | 'fijado' | 'pasos' | 'reducido';

const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Letreros de la sede, con el nombre que se lee en la puerta. */
const LETREROS: { id: SalaId; nombre: string }[] = [
  { id: 'recepcion', nombre: 'Recepción' },
  { id: 'cola', nombre: 'Sala de espera' },
  { id: 'medicina', nombre: 'Medicina' },
  { id: 'optometria', nombre: 'Optometría' },
  { id: 'audiometria', nombre: 'Audiometría' },
  { id: 'laboratorio', nombre: 'Laboratorio' },
  { id: 'rayosx', nombre: 'Rayos X' },
  { id: 'salida', nombre: 'Salida' },
];

/**
 * "Un día en la IPS": el paciente de ejemplo recorre la maqueta de la sede con el scroll.
 * Escritorio: la sección se fija y el scroll mueve al paciente (pin + scrub).
 * Móvil: la maqueta queda pegada arriba y cada paso la lleva a su sala.
 * Movimiento reducido: un cuadro fijo por paso, con botones.
 * Sin WebGL queda el plano en SVG y los pasos: el texto nunca depende del 3D.
 */
@Component({
  selector: 'app-ocupa-recorrido',
  imports: [RouterLink],
  templateUrl: './recorrido.html',
  styleUrl: './recorrido.scss',
})
export class RecorridoOcupasalud {
  private readonly raiz = viewChild.required<ElementRef<HTMLElement>>('raiz');
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly espera = viewChild.required<ElementRef<HTMLElement>>('espera');
  private readonly barra = viewChild.required<ElementRef<HTMLElement>>('barra');
  protected readonly orientacion = inject(Orientacion);
  private readonly movimiento = inject(Movimiento);
  protected readonly reducido = this.movimiento.reducido;
  private readonly documento = inject(DOCUMENT);

  protected readonly pasos = PASOS;
  protected readonly letreros = LETREROS;
  protected readonly turno = TURNO;
  protected readonly pictos = PICTOGRAMAS;
  protected readonly whatsapp = ICONOS.whatsapp;
  protected readonly modo = signal<Modo>('estatico');
  protected readonly activo3d = signal(false);
  protected readonly pasoActivo = signal(0);

  private escena: EscenaSede | null = null;
  private progreso = 0;
  private esperaTexto = '';
  /** Las etiquetas que siguen a la maqueta, en dos listas paralelas: se recorren en cada cuadro. */
  private anclaIds: AnclaSede[] = [];
  private anclaEls: HTMLElement[] = [];

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
      this.anclaEls = Array.from(raiz.querySelectorAll<HTMLElement>('[data-ancla]'));
      this.anclaIds = this.anclaEls.map((el) => el.dataset['ancla'] as AnclaSede);
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
            const { crearSede } = await import('../../escenas/ocupasalud/sede');
            if (!vivo) return;
            this.escena = crearSede({
              lienzo: this.lienzo().nativeElement,
              reducido,
              colores: () => this.colores(),
              alPosicionar: (pos) => this.posicionar(pos),
            });
            this.escena.encuadre(this.modo() === 'fijado' ? this.fraccionPasos() : 0);
            this.escena.progreso(this.progreso);
            this.activo3d.set(true);
          } catch {
            // Sin WebGL quedan el plano y los pasos.
          }
        },
        { rootMargin: '400px' },
      );
      observador.observe(raiz);
      destruccion.onDestroy(() => observador.disconnect());
    });

    effect(() => {
      const i = this.orientacion.inclinacion();
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
    this.escena?.encuadre(modo === 'fijado' ? this.fraccionPasos() : 0);
  }

  /**
   * En escritorio los pasos tapan la esquina de abajo a la izquierda, que la isométrica deja casi
   * libre: basta correr la maqueta un poco a la derecha.
   */
  private fraccionPasos(): number {
    return 0.18;
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
            end: '+=480%',
            pin: true,
            scrub: 0.7,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onRefresh: () => this.escena?.encuadre(this.fraccionPasos()),
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
            // El paso se activa justo debajo de la maqueta pegada, donde se lee sin taparla.
            start: 'top 70%',
            end: 'bottom 70%',
            onToggle: (self) => {
              if (!self.isActive) return;
              this.pasoActivo.set(i);
              gsap.to(proxy, {
                p: PASOS[i].momento,
                duration: 1.8,
                ease: 'power2.inOut',
                overwrite: true,
                onUpdate: () => this.aplicar(proxy.p),
              });
            },
          });
        });
        // El tween del paso nace en un callback, fuera del contexto de matchMedia: se mata a mano.
        return () => {
          gsap.killTweensOf(proxy);
          this.fijarModo('estatico');
        };
      });

      void this.documento.fonts?.ready.then(() => {
        if (vivo()) ScrollTrigger.refresh();
      });

      // ScrollTrigger mide una vez. Si la página crece por encima (el tiquete del turno, un bloque
      // diferido que llega), las marcas quedan corridas: se vuelven a medir cuando el alto cambia.
      const cuerpo = this.documento.body;
      let alto = Math.round(cuerpo.getBoundingClientRect().height);
      let espera: ReturnType<typeof setTimeout> | undefined;
      const alCrecer = new ResizeObserver(() => {
        const ahora = Math.round(cuerpo.getBoundingClientRect().height);
        if (Math.abs(ahora - alto) < 2) return;
        clearTimeout(espera);
        espera = setTimeout(() => {
          if (!vivo()) return;
          ScrollTrigger.refresh();
          alto = Math.round(cuerpo.getBoundingClientRect().height);
        }, 220);
      });
      alCrecer.observe(cuerpo);

      return () => {
        clearTimeout(espera);
        alCrecer.disconnect();
        mm.revert();
      };
    } catch {
      return null;
    }
  }

  /** Un cuadro del recorrido: maqueta, reloj de la encuesta y barra. Escribe el DOM directo. */
  private aplicar(p: number): void {
    this.progreso = p;
    this.escena?.progreso(p);

    const texto = textoEspera(horasRestantes(p));
    if (texto !== this.esperaTexto) {
      this.esperaTexto = texto;
      this.espera().nativeElement.textContent = texto === 'ya' ? 'sale ya' : `en ${texto}`;
    }
    this.barra().nativeElement.style.transform = `scaleX(${p.toFixed(4)})`;

    if (this.modo() === 'fijado') {
      let i = PASOS.length - 1;
      while (i > 0 && p < PASOS[i].desde) i--;
      if (i !== this.pasoActivo()) this.pasoActivo.set(i);
    }
  }

  private posicionar(pos: Readonly<Record<AnclaSede, PosicionAncla>>): void {
    for (let i = 0; i < this.anclaEls.length; i++) {
      const el = this.anclaEls[i];
      const p = pos[this.anclaIds[i]];
      if (!p) continue;
      el.classList.toggle('visible', p.visible);
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  private colores(): ColoresSede {
    const css = getComputedStyle(this.documento.documentElement);
    const t = (n: string, respaldo: string) => css.getPropertyValue(n).trim() || respaldo;
    return {
      azul: t('--ocupasalud-azul', '#0077bd'),
      verde: t('--ocupasalud-verde', '#51a8b1'),
      marino: t('--ocupasalud-marino', '#133b5c'),
      esfera: t('--ocupasalud-esfera', '#0792d4'),
      plata: t('--ocupasalud-plata', '#c8c8c8'),
      plata2: t('--ocupasalud-plata-2', '#d8d8d8'),
      rojo: t('--ocupasalud-rojo', '#e00000'),
      rayos: t('--ocupasalud-rayos', '#00a8ec'),
      base: t('--surface-2', '#eef5fa'),
      piso: t('--bg', '#ffffff'),
      muro: '#ffffff',
    };
  }
}
