import { Component } from '@angular/core';
import { buscarProyecto } from '../../contenido/proyectos';
import { TomaBlanco } from './toma-blanco';
import { TomaFoto } from './toma-foto';

const HISTORIAS = buscarProyecto('estudio')?.historias ?? [];

/**
 * "Tomas falsas": dos fallas silenciosas que el motor previene (el código y el plan las
 * describen como riesgo, no como incidentes: no se presentan como errores que ocurrieron).
 * El texto (de contenido/proyectos.ts) sale en el HTML prerenderizado; cada recreación
 * interactiva se carga con @defer al acercarse.
 */
@Component({
  selector: 'app-estudio-tomas',
  imports: [TomaFoto, TomaBlanco],
  templateUrl: './tomas.html',
  styleUrl: './tomas.scss',
})
export class TomasEstudio {
  /** [1] el doble requestAnimationFrame, [2] los fotogramas en blanco. */
  protected readonly rAF = HISTORIAS[1];
  protected readonly blanco = HISTORIAS[2];
}
