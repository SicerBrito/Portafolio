import { Component, DOCUMENT, DestroyRef, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Movimiento } from '../../core/movimiento';
import { Orientacion } from '../../core/orientacion';
import { PROYECTOS, type Proyecto } from '../../contenido/proyectos';
import { Sello } from '../../ui/sello';
import { TURNO } from './contenido';

const PROYECTO = PROYECTOS.find((p) => p.id === 'ocupasalud') as Proyecto;

/**
 * La fachada azul de la sede: el logo, el gancho del mundo y el dispensador de turnos. El
 * visitante toma el turno A-027 y entra como un paciente más. Debajo, las puertas de vidrio que
 * el scroll abre. Con movimiento reducido quedan abiertas; sin JavaScript, entreabiertas. El
 * letrero va siempre por delante del vidrio.
 */
@Component({
  selector: 'app-ocupa-fachada',
  imports: [NgOptimizedImage, RouterLink, Sello],
  templateUrl: './fachada.html',
  styleUrl: './fachada.scss',
})
export class FachadaOcupasalud {
  private readonly documento = inject(DOCUMENT);
  private readonly movimiento = inject(Movimiento);
  private readonly orientacion = inject(Orientacion);
  private readonly puertas = viewChild.required<ElementRef<HTMLElement>>('puertas');

  protected readonly p = PROYECTO;
  protected readonly turno = TURNO;
  /** La primera frase de mi papel: lo que hice, sin adornos. */
  protected readonly miParte = PROYECTO.papel.split('. ')[0].replace(/\.$/, '') + '.';
  protected readonly impreso = signal(false);

  /** La esfera de la fachada se corre un poco con el mouse o el celular. */
  protected readonly esfera = computed(() => {
    if (this.movimiento.reducido()) return 'none';
    const { x, y } = this.orientacion.inclinacion();
    return `translate(${(x * 18).toFixed(1)}px, ${(y * 14).toFixed(1)}px)`;
  });

  constructor() {
    const destruccion = inject(DestroyRef);

    afterNextRender(() => {
      if (this.movimiento.reducido()) return;
      let deshacer: (() => void) | null = null;
      let vivo = true;
      destruccion.onDestroy(() => {
        vivo = false;
        deshacer?.();
      });
      void (async () => {
        try {
          const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
          if (!vivo) return;
          gsap.registerPlugin(ScrollTrigger);
          const puertas = this.puertas().nativeElement;
          const ctx = gsap.context(() => {
            const linea = gsap.timeline({
              scrollTrigger: { trigger: puertas, start: 'top 85%', end: 'bottom 30%', scrub: 0.5 },
            });
            linea
              .fromTo('.hoja-izq', { xPercent: -8 }, { xPercent: -100, ease: 'none' }, 0)
              .fromTo('.hoja-der', { xPercent: 8 }, { xPercent: 100, ease: 'none' }, 0);
          }, puertas);
          deshacer = () => ctx.revert();
        } catch {
          // Sin GSAP las puertas quedan entreabiertas: no tapan nada.
        }
      })();
    });
  }

  protected tomarTurno(): void {
    this.impreso.set(true);
  }

  protected irAlRecorrido(): void {
    this.documento.getElementById('recorrido')?.scrollIntoView({
      behavior: this.movimiento.reducido() ? 'auto' : 'smooth',
      block: 'start',
    });
    // El foco viaja con la vista: con teclado, el siguiente Tab sigue en el recorrido.
    this.documento.getElementById('t-recorrido')?.focus({ preventScroll: true });
  }
}
