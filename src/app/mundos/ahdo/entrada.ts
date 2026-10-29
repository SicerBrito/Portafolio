import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Movimiento } from '../../core/movimiento';
import { Orientacion } from '../../core/orientacion';
import type { Proyecto } from '../../contenido/proyectos';
import { Sello } from '../../ui/sello';
import type { EscenaCertificado } from '../../escenas/ahdo/certificado';
import type { RecursosCertificado } from '../../escenas/ahdo/dibujo-certificado';
import { CERTIFICADO_FICTICIO, MARCAS, MODULOS } from './datos';
import { altoCabecera, cargarGsap, reordenar } from './animacion';

type Modo = 'html' | '3d' | '2d';

/** La entrada: el logo de AHDO y un certificado que cambia de marca con un clic o con el scroll. */
@Component({
  selector: 'app-ahdo-entrada',
  imports: [NgOptimizedImage, RouterLink, Sello],
  templateUrl: './entrada.html',
  styleUrl: './entrada.scss',
})
export class AhdoEntrada {
  readonly proyecto = input.required<Proyecto>();

  private readonly seccion = viewChild.required<ElementRef<HTMLElement>>('seccion');
  private readonly escenario = viewChild.required<ElementRef<HTMLElement>>('escenario');
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly plano = viewChild.required<ElementRef<HTMLCanvasElement>>('plano');
  protected readonly movimiento = inject(Movimiento);
  protected readonly orientacion = inject(Orientacion);

  protected readonly marcas = MARCAS;
  protected readonly ficticio = CERTIFICADO_FICTICIO;
  protected readonly indice = signal(0);
  protected readonly marca = computed(() => MARCAS[this.indice()]);
  protected readonly modo = signal<Modo>('html');
  /** En el plano 2D (sin WebGL) el giro es un volteo CSS. */
  protected readonly volteando = signal(false);
  protected readonly historia = computed(() => this.proyecto().historias[0]);
  /**
   * La entrada luce una idea que no es mía de origen: la marca por certificado venía en la base de 2024.
   * Se dice aquí, junto al mecanismo, con el mismo texto del mapa de módulos.
   */
  protected readonly autoriaCertificados = MODULOS.find((m) => m.id === 'certificados')?.detalle ?? '';

  private escena: EscenaCertificado | null = null;
  private redibujar2d: ((i: number) => void) | null = null;
  /** Temporizador del volteo CSS del plano 2D. */
  private volteo = 0;

  constructor() {
    const destruccion = inject(DestroyRef);
    let vivo = true;
    let revertir: (() => void) | null = null;
    destruccion.onDestroy(() => {
      vivo = false;
      revertir?.();
      if (this.volteo) clearTimeout(this.volteo);
      this.escena?.destruir();
    });

    afterNextRender(() => {
      const escenario = this.escenario().nativeElement;
      const observador = new IntersectionObserver(
        async (entradas) => {
          if (!entradas.some((e) => e.isIntersecting)) return;
          observador.disconnect();
          try {
            await this.montar(() => vivo);
            if (!vivo) return;
            revertir = await this.animarConScroll(() => vivo);
          } catch {
            // Si falla una descarga, queda el certificado en HTML: la entrada se lee igual.
          }
        },
        { rootMargin: '200px' },
      );
      observador.observe(escenario);
      destruccion.onDestroy(() => observador.disconnect());
    });

    effect(() => {
      const i = this.orientacion.inclinacion();
      this.escena?.inclinar(i.x, i.y);
    });

    // Si el visitante activa el movimiento reducido con la página abierta, la hoja deja de flotar y girar.
    effect(() => {
      const reducido = this.movimiento.reducido();
      this.escena?.reducir(reducido);
    });
  }

  protected elegir(i: number): void {
    if (i === this.indice() || i < 0 || i >= MARCAS.length) return;
    this.indice.set(i);
    if (this.escena) {
      this.escena.mostrar(i);
    } else if (this.redibujar2d) {
      this.redibujar2d(i);
    }
  }

  /** Flechas izquierda y derecha dentro del grupo de marcas. */
  protected mover(evento: KeyboardEvent, i: number): void {
    const delta = evento.key === 'ArrowRight' || evento.key === 'ArrowDown' ? 1 : evento.key === 'ArrowLeft' || evento.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    evento.preventDefault();
    const siguiente = (i + delta + MARCAS.length) % MARCAS.length;
    this.elegir(siguiente);
    const botones = this.seccion().nativeElement.querySelectorAll<HTMLButtonElement>('.chip');
    botones[siguiente]?.focus();
  }

  private async montar(vivo: () => boolean): Promise<void> {
    const { cargarRecursos } = await import('../../escenas/ahdo/dibujo-certificado');
    const recursos = await cargarRecursos(MARCAS);
    if (!vivo()) return;
    try {
      const { crearCertificado } = await import('../../escenas/ahdo/certificado');
      if (!vivo()) return;
      this.escena = crearCertificado({
        lienzo: this.lienzo().nativeElement,
        marcas: MARCAS,
        recursos,
        inicial: this.indice(),
        reducido: this.movimiento.reducido(),
      });
      this.modo.set('3d');
      const i = this.orientacion.inclinacion();
      this.escena.inclinar(i.x, i.y);
    } catch {
      // Sin WebGL: el mismo dibujo en un lienzo plano, con un volteo CSS al cambiar de marca.
      this.montarPlano(recursos);
    }
  }

  private montarPlano(recursos: RecursosCertificado): void {
    const lienzo = this.plano().nativeElement;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return;
    void import('../../escenas/ahdo/dibujo-certificado').then(({ dibujarCertificado }) => {
      const pintar = (i: number) => {
        const ancho = Math.max(1, Math.round(lienzo.clientWidth * Math.min(devicePixelRatio || 1, 2)));
        const alto = Math.max(1, Math.round(lienzo.clientHeight * Math.min(devicePixelRatio || 1, 2)));
        lienzo.width = ancho;
        lienzo.height = alto;
        dibujarCertificado(ctx, ancho, alto, MARCAS[i], recursos);
      };
      this.modo.set('2d');
      requestAnimationFrame(() => pintar(this.indice()));
      this.redibujar2d = (i: number) => {
        if (this.movimiento.reducido()) {
          pintar(i);
          return;
        }
        this.volteando.set(true);
        if (this.volteo) clearTimeout(this.volteo);
        this.volteo = window.setTimeout(() => {
          this.volteo = 0;
          pintar(this.indice());
          this.volteando.set(false);
        }, 220);
      };
    });
  }

  /**
   * Escritorio con espacio: la entrada mide casi dos pantallas y el certificado queda pegado;
   * cada cuarto del recorrido cambia de marca. Al salir, la hoja se inclina y se aleja.
   */
  private async animarConScroll(vivo: () => boolean): Promise<(() => void) | null> {
    if (this.movimiento.reducido()) return null;
    const { gsap, ScrollTrigger } = await cargarGsap();
    if (!vivo()) return null;
    const seccion = this.seccion().nativeElement;
    let ultimoPorScroll = -1;
    const mm = gsap.matchMedia();
    mm.add(
      {
        pegado: '(min-width: 1000px) and (min-height: 760px) and (prefers-reduced-motion: no-preference)',
        suelto: 'not all and (min-width: 1000px) and (min-height: 760px)',
        reducido: '(prefers-reduced-motion: reduce)',
      },
      (contexto) => {
        const { pegado, reducido } = contexto.conditions as { pegado: boolean; reducido: boolean };
        // Si el visitante activa el movimiento reducido con la página abierta, el scroll deja de mover la hoja.
        if (reducido) return;
        if (pegado) {
          ScrollTrigger.create({
            trigger: seccion,
            start: () => `top top+=${altoCabecera()}`,
            end: 'bottom bottom',
            invalidateOnRefresh: true,
            onUpdate: (st) => {
              const i = Math.min(MARCAS.length - 1, Math.floor(st.progress * MARCAS.length));
              if (i === ultimoPorScroll) return;
              ultimoPorScroll = i;
              this.elegir(i);
            },
          });
        }
        ScrollTrigger.create({
          trigger: seccion,
          start: pegado ? 'bottom bottom' : `top top+=${altoCabecera()}`,
          end: 'bottom top',
          invalidateOnRefresh: true,
          onUpdate: (st) => this.escena?.alejar(st.progress),
        });
      },
    );
    reordenar(ScrollTrigger);
    return () => mm.revert();
  }
}
