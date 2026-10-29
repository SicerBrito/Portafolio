import { Component, computed, signal } from '@angular/core';
import { EscenaMotor, type CargaEscena } from './escena-motor';

/** Fotogramas de la hoja de contacto. */
const CONTACTO = [36, 96, 156, 216];

/**
 * Toma falsa 2, recreada: sin esperar a que carguen letras e imágenes, los primeros fotogramas
 * salen vacíos o con la letra de respaldo, y nada falla. Es una simulación, no una captura.
 */
@Component({
  selector: 'app-estudio-toma-blanco',
  imports: [EscenaMotor],
  templateUrl: './toma-blanco.html',
  styleUrl: './toma-blanco.scss',
})
export class TomaBlanco {
  protected readonly esperaCarga = signal(false);
  protected readonly hoja = computed(() =>
    CONTACTO.map((f, i) => {
      const carga: CargaEscena = this.esperaCarga()
        ? 'normal'
        : i === 0
          ? 'vacio'
          : i === 1
            ? 'respaldo'
            : 'normal';
      return { f, carga };
    }),
  );
}
