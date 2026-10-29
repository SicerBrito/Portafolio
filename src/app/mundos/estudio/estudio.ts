import { Component, DestroyRef, afterNextRender, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Movimiento } from '../../core/movimiento';
import { Mundo } from '../../core/mundo';
import { PROYECTOS, type Proyecto } from '../../contenido/proyectos';
import { Sello } from '../../ui/sello';
import { BAJADA, ESCENAS_PAGINA, SINOPSIS, SIN_RODAR } from './contenido';
import { GuionEstudio } from './guion';
import { REPARTO } from './iconos';
import { InspectorEstudio } from './inspector';
import { TiempoEstudio } from './tiempo';
import { TiraEstudio } from './tira';
import { TomasEstudio } from './tomas';

const INDICE = PROYECTOS.findIndex((p) => p.id === 'estudio');
const PROYECTO = PROYECTOS[INDICE] as Proyecto;
const SIGUIENTE = PROYECTOS[(INDICE + 1) % PROYECTOS.length];

/**
 * Mundo Estudio de Video: "Arrastra el tiempo".
 * La página se recorre como un video del motor: cada sección es una escena (e01…e08), la barra
 * del inspector marca el código de tiempo y el scroll es el cabezal. Entrada con claqueta, la escena
 * real del motor movida fotograma a fotograma, la tira de película en 3D, el guion que manda,
 * las tomas falsas, los créditos (lo que dice git), las escenas sin rodar y el próximo rollo.
 */
@Component({
  selector: 'app-mundo-estudio',
  imports: [
    NgOptimizedImage,
    RouterLink,
    Sello,
    TiempoEstudio,
    TiraEstudio,
    GuionEstudio,
    TomasEstudio,
    InspectorEstudio,
  ],
  templateUrl: './estudio.html',
  styleUrl: './estudio.scss',
})
export class MundoEstudio {
  protected readonly p = PROYECTO;
  protected readonly siguiente = SIGUIENTE;
  protected readonly siguienteResumen = SIGUIENTE.resumen.split('. ')[0].replace(/\.$/, '') + '.';
  protected readonly bajada = BAJADA;
  protected readonly escenas = ESCENAS_PAGINA;
  protected readonly sinopsis = SINOPSIS;
  protected readonly sinRodar = SIN_RODAR;
  protected readonly reparto = REPARTO;
  /** Número de toma de la claqueta: cada golpe suma una. */
  protected readonly toma = signal(1);
  protected readonly golpe = signal(0);

  constructor() {
    const mundo = inject(Mundo);
    mundo.actual.set('estudio');
    inject(DestroyRef).onDestroy(() => mundo.actual.set('planta'));

    inject(Title).setTitle('Estudio de Video · Arrastra el tiempo · Sicer Brito');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Estudio de Video, el prototipo de un motor para convertir un documento en un video formativo: cada fotograma es una página Angular que se fotografía. Hecho desde cero por Sicer Brito.',
    });

    // Un solo momento orquestado al llegar: la claqueta marca la toma 1.
    const movimiento = inject(Movimiento);
    afterNextRender(() => {
      if (!movimiento.reducido()) this.golpe.set(1);
    });
  }

  /** Otro golpe de claqueta: la toma siguiente. */
  protected marcar(): void {
    this.toma.update((t) => t + 1);
    this.golpe.update((g) => g + 1);
  }
}
