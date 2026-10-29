import { Component, DOCUMENT, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Mundo } from '../../core/mundo';
import { Movimiento } from '../../core/movimiento';
import { PROYECTOS, type Proyecto } from '../../contenido/proyectos';
import { Sello } from '../../ui/sello';
import {
  BITACORA,
  COMMITS_ORIGEN,
  DESPLIEGUE,
  HALLAZGOS,
  OBRA_ORIGEN,
  PRUEBAS_AFUERA,
} from './contenido';
import { AutoresBackbone } from './autores';
import { CostoBackbone } from './costo';
import { EntornosBackbone } from './entornos';
import { DESTELLOS_PANEL, STACK_BACKBONE } from './iconos';
import { MuroBackbone } from './muro';
import { RecorridoBackbone } from './recorrido';
import { ReglaBackbone } from './regla';
import { SiguienteBackbone } from './siguiente';
import { TableroBackbone } from './tablero';

const INDICE = PROYECTOS.findIndex((p) => p.id === 'backbone');
const PROYECTO = PROYECTOS[INDICE] as Proyecto;
const SIGUIENTE = PROYECTOS[(INDICE + 1) % PROYECTOS.length];

/**
 * Mundo Backbone de IA: una bitácora de guardia de 48 horas.
 * El eje es el tiempo: un riel con la hora de cada entrada, y un color que dice de quién es cada
 * cosa (la obra de otro desarrollador o mi parte). Las dos piezas en 3D cuentan cómo responde una
 * pregunta y qué cambió al pasar de desarrollo a producción.
 */
@Component({
  selector: 'app-mundo-backbone',
  imports: [
    NgOptimizedImage,
    RouterLink,
    Sello,
    RecorridoBackbone,
    EntornosBackbone,
    MuroBackbone,
    CostoBackbone,
    ReglaBackbone,
    SiguienteBackbone,
    AutoresBackbone,
    TableroBackbone,
  ],
  templateUrl: './backbone.html',
  styleUrl: './backbone.scss',
})
export class MundoBackbone {
  protected readonly p = PROYECTO;
  protected readonly siguiente = SIGUIENTE;
  protected readonly siguienteResumen = SIGUIENTE.resumen.split('. ')[0].replace(/\.$/, '') + '.';
  protected readonly bitacora = BITACORA;
  protected readonly commitsOrigen = COMMITS_ORIGEN;
  protected readonly obraOrigen = OBRA_ORIGEN;
  protected readonly hallazgos = HALLAZGOS;
  protected readonly despliegue = DESPLIEGUE;
  protected readonly pruebas = PRUEBAS_AFUERA;
  protected readonly stack = STACK_BACKBONE;
  protected readonly destellos = DESTELLOS_PANEL;

  /** La entrada de la bitácora que se está leyendo: la marca el riel. */
  protected readonly entradaActiva = signal(BITACORA[0].id);
  /** Cuántas pruebas desde afuera ya respondieron. En el HTML prerenderizado, todas. */
  protected readonly pruebasListas = signal(PRUEBAS_AFUERA.length);
  protected readonly probando = signal(false);

  private readonly movimiento = inject(Movimiento);
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const mundo = inject(Mundo);
    const destruccion = inject(DestroyRef);
    const documento = inject(DOCUMENT);
    mundo.actual.set('backbone');
    destruccion.onDestroy(() => {
      mundo.actual.set('planta');
      this.pararPruebas();
    });

    inject(Title).setTitle('Backbone de IA · De recibido a producción en 48 horas · Sicer Brito');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'El servicio central de IA del Grupo Prometeo. Lo creó otro desarrollador; Sicer Brito lo auditó, lo endureció y lo llevó a producción en 48 horas. Cómo responde una pregunta, en 3D, y el interruptor de desarrollo a producción.',
    });

    // El riel sigue la lectura: la entrada que cruza la franja media de la pantalla queda marcada.
    afterNextRender(() => {
      const secciones = BITACORA.map((e) => documento.getElementById(e.id)).filter(
        (el): el is HTMLElement => el !== null,
      );
      const observador = new IntersectionObserver(
        (entradas) => {
          for (const e of entradas) {
            if (e.isIntersecting) this.entradaActiva.set(e.target.id);
          }
        },
        { rootMargin: '-45% 0px -50% 0px' },
      );
      secciones.forEach((s) => observador.observe(s));
      destruccion.onDestroy(() => observador.disconnect());
    });
  }

  /** Repite la validación desde afuera, una respuesta a la vez. */
  protected repetirPruebas(): void {
    this.pararPruebas();
    if (this.movimiento.reducido()) {
      this.pruebasListas.set(PRUEBAS_AFUERA.length);
      return;
    }
    this.probando.set(true);
    this.pruebasListas.set(0);
    const siguiente = () => {
      const n = this.pruebasListas() + 1;
      this.pruebasListas.set(n);
      if (n < PRUEBAS_AFUERA.length) this.temporizador = setTimeout(siguiente, 650);
      else this.probando.set(false);
    };
    this.temporizador = setTimeout(siguiente, 500);
  }

  private pararPruebas(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
    this.probando.set(false);
  }
}
