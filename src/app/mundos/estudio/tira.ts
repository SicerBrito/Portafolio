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
import { NgOptimizedImage } from '@angular/common';
import { Movimiento } from '../../core/movimiento';
import { Orientacion } from '../../core/orientacion';
import type {
  AnclaRodaje,
  ColoresRodaje,
  EscenaRodaje,
  PosicionAncla,
} from '../../escenas/estudio/rodaje';
import { ETIQUETA_PIEZA, PASOS_TIRA, PIEZAS_TIRA } from './contenido';
import { ULTIMO_FOTOGRAMA, tresCifras } from './motor';

type Modo = 'estatico' | 'fijado' | 'movil' | 'reducido';

const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * "La tira de película": la cadena del motor en 3D, sincronizada con el scroll.
 * Escritorio: la sección se fija y el scroll arrastra la escena (pin + scrub), con la lista de pasos encima.
 * Móvil: la escena queda pegada arriba y cada paso la lleva a su momento.
 * Movimiento reducido: un cuadro fijo por paso, con botones.
 * Sin WebGL queda el plano 2D, y los pasos cuentan lo mismo en texto.
 */
@Component({
  selector: 'app-estudio-tira',
  imports: [NgOptimizedImage],
  templateUrl: './tira.html',
  styleUrl: './tira.scss',
})
export class TiraEstudio {
  private readonly pista = viewChild.required<ElementRef<HTMLElement>>('pista');
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly contador = viewChild.required<ElementRef<HTMLElement>>('contador');
  private readonly barra = viewChild.required<ElementRef<HTMLElement>>('barra');
  private readonly porcentaje = viewChild.required<ElementRef<HTMLElement>>('porcentaje');
  protected readonly orientacion = inject(Orientacion);
  private readonly movimiento = inject(Movimiento);
  private readonly documento = inject(DOCUMENT);

  protected readonly pasos = PASOS_TIRA;
  protected readonly piezas = PIEZAS_TIRA;
  protected readonly etiqueta = ETIQUETA_PIEZA;
  protected readonly modo = signal<Modo>('estatico');
  protected readonly activo3d = signal(false);
  protected readonly pasoActivo = signal(0);

  private escena: EscenaRodaje | null = null;
  private progreso = 0;
  private porcentajeVisto = -1;
  /** Las etiquetas que siguen a cada pieza, con lo último que se les escribió (para no repetir). */
  private anclas: { id: AnclaRodaje; el: HTMLElement; x: number; y: number; visible: boolean }[] =
    [];

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
      const pista = this.pista().nativeElement;
      this.anclas = Array.from(pista.querySelectorAll<HTMLElement>('[data-ancla]')).map((el) => ({
        id: (el.dataset['ancla'] ?? '') as AnclaRodaje,
        el,
        x: Number.NaN,
        y: Number.NaN,
        visible: false,
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

      // three.js pesa: se descarga solo cuando la sección se acerca a la pantalla.
      const observador = new IntersectionObserver(
        async (entradas) => {
          if (!entradas.some((e) => e.isIntersecting)) return;
          observador.disconnect();
          try {
            const { crearRodaje } = await import('../../escenas/estudio/rodaje');
            if (!vivo) return;
            this.escena = crearRodaje({
              lienzo: this.lienzo().nativeElement,
              reducido,
              colores: this.colores(),
              alPosicionar: (pos) => this.posicionar(pos),
              alFotograma: (f) => this.mostrarFotograma(f),
            });
            this.escena.progreso(this.progreso);
            this.activo3d.set(true);
          } catch {
            // Sin WebGL queda el plano 2D y los pasos: el texto no depende del 3D.
          }
        },
        { rootMargin: '500px' },
      );
      observador.observe(pista);
      destruccion.onDestroy(() => observador.disconnect());
    });

    effect(() => {
      const i = this.orientacion.inclinacion();
      this.escena?.inclinar(i.x, i.y);
    });
  }

  protected irAPaso(i: number): void {
    const n = limitar(i, 0, PASOS_TIRA.length - 1);
    this.pasoActivo.set(n);
    this.aplicar(PASOS_TIRA[n].momento);
  }

  protected activarGiroscopio(): void {
    void this.orientacion.activar();
  }

  /** La clase va directo al elemento: el pin mide el diseño en el acto, antes del ciclo de Angular. */
  private fijarModo(modo: Modo): void {
    const pista = this.pista().nativeElement;
    pista.classList.toggle('fijado', modo === 'fijado');
    pista.classList.toggle('movil', modo === 'movil');
    pista.classList.toggle('reducido', modo === 'reducido');
    this.modo.set(modo);
  }

  private async montarScroll(vivo: () => boolean): Promise<(() => void) | null> {
    try {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (!vivo()) return null;
      gsap.registerPlugin(ScrollTrigger);
      const pista = this.pista().nativeElement;
      const cabecera = () =>
        parseFloat(
          getComputedStyle(this.documento.documentElement).getPropertyValue('--cabecera'),
        ) || 64;
      const mm = gsap.matchMedia();

      // 640 px de alto como mínimo: la lista de pasos con el activo abierto mide unos 440 px y
      // va encima del cuadro fijado (alto de la ventana menos 128 px).
      mm.add('(min-width: 960px) and (min-height: 640px)', () => {
        this.fijarModo('fijado');
        const proxy = { p: this.progreso };
        this.aplicar(proxy.p);
        gsap.to(proxy, {
          p: 1,
          ease: 'none',
          onUpdate: () => this.aplicar(proxy.p),
          scrollTrigger: {
            trigger: pista,
            start: () => `top top+=${cabecera()}`,
            end: '+=460%',
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            // Va después de "Arrastra el tiempo": se recalcula cuando el espacio de esa ya cuenta.
            refreshPriority: 1,
            invalidateOnRefresh: true,
          },
        });
        return () => this.fijarModo('estatico');
      });

      mm.add('(max-width: 959.98px), (max-height: 639.98px)', () => {
        this.fijarModo('movil');
        const proxy = { p: this.progreso };
        this.aplicar(proxy.p);
        pista.querySelectorAll<HTMLElement>('.paso').forEach((el, i) => {
          ScrollTrigger.create({
            trigger: el,
            // El paso se activa justo debajo de la escena pegada, donde se lee sin taparla.
            start: 'top 72%',
            end: 'bottom 72%',
            refreshPriority: 1,
            onToggle: (self) => {
              if (!self.isActive) return;
              this.pasoActivo.set(i);
              gsap.to(proxy, {
                p: PASOS_TIRA[i].momento,
                duration: 1.5,
                ease: 'power2.inOut',
                overwrite: true,
                onUpdate: () => this.aplicar(proxy.p),
              });
            },
          });
        });
        // El tween de cada paso nace en un callback, fuera del contexto de matchMedia:
        // revert() no lo alcanza, así que se mata a mano al salir del modo o al destruir.
        return () => {
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

  /** Un cuadro del recorrido: escena, barra con su porcentaje y paso activo. Escribe el DOM directo. */
  private aplicar(p: number): void {
    this.progreso = p;
    this.escena?.progreso(p);

    // El número sale del mismo valor que la barra, como en el motor.
    const ancho = p * 100;
    this.barra().nativeElement.style.transform = `scaleX(${p.toFixed(4)})`;
    const n = Math.round(ancho);
    if (n !== this.porcentajeVisto) {
      this.porcentajeVisto = n;
      this.porcentaje().nativeElement.textContent = `${n}%`;
    }

    if (this.modo() === 'fijado') {
      let i = PASOS_TIRA.length - 1;
      while (i > 0 && p < PASOS_TIRA[i].desde) i--;
      if (i !== this.pasoActivo()) this.pasoActivo.set(i);
    }
  }

  private mostrarFotograma(f: number | null): void {
    const el = this.contador().nativeElement;
    el.classList.toggle('visible', f !== null);
    if (f !== null)
      el.textContent = `fotograma ${tresCifras(f)} / ${ULTIMO_FOTOGRAMA} · foto ${f + 1} de ${ULTIMO_FOTOGRAMA + 1}`;
  }

  /** Corre en cada cuadro del bucle 3D: solo toca el DOM de la etiqueta que de verdad se movió. */
  private posicionar(pos: Readonly<Record<AnclaRodaje, PosicionAncla>>): void {
    for (let i = 0; i < this.anclas.length; i++) {
      const a = this.anclas[i];
      const p = pos[a.id];
      if (!p) continue;
      if (p.visible !== a.visible) {
        a.visible = p.visible;
        a.el.classList.toggle('visible', p.visible);
      }
      if (!p.visible || (Math.abs(p.x - a.x) < 0.1 && Math.abs(p.y - a.y) < 0.1)) continue;
      a.x = p.x;
      a.y = p.y;
      a.el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  private colores(): ColoresRodaje {
    const css = getComputedStyle(this.documento.documentElement);
    const t = (n: string, respaldo: string) => css.getPropertyValue(n).trim() || respaldo;
    return {
      lienzo: t('--estudio-lienzo', '#301f56'),
      inspector: t('--estudio-inspector', '#1a1030'),
      morado: t('--estudio-morado', '#8b5ffc'),
      lila: t('--estudio-lila', '#aaaaff'),
      papel: t('--estudio-papel', '#f4f2fc'),
      papelTinta: t('--estudio-papel-tinta', '#301f56'),
      cinta: t('--estudio-cinta', '#120a24'),
      linea: t('--line', '#5d4d94'),
      superficie2: t('--surface-2', '#3d2e69'),
    };
  }
}
