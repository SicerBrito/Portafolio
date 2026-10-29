import { Component, computed, input } from '@angular/core';
import { estadoEscena, tresCifras } from './motor';

/** Cómo sale la foto: normal, en blanco (antes de que carguen las letras) o con la letra de respaldo. */
export type CargaEscena = 'normal' | 'vacio' | 'respaldo';

/** De píxeles del lienzo de 1280 a unidades del contenedor: así la escena se escala sin JavaScript. */
const cqw = (px: number) => `${((px * 100) / 1280).toFixed(4)}cqw`;

/**
 * La escena de título del motor (escena-titulo.component.ts), reconstruida en el navegador.
 * Mismos colores, mismas medidas sobre un lienzo de 1280 × 720 y mismas curvas.
 * Es decorativa: quien la usa pone al lado su descripción en texto.
 */
@Component({
  selector: 'app-estudio-escena',
  host: { 'aria-hidden': 'true' },
  template: `
    <div class="lienzo" [class.respaldo]="carga() === 'respaldo'">
      @if (carga() !== 'vacio') {
        <div class="contenido">
          <p class="modulo" [style.opacity]="e().opacidadModulo" [style.transform]="yModulo()">
            {{ modulo() }}
          </p>
          <p class="titulo" [style.opacity]="e().opacidadTitulo" [style.transform]="yTitulo()">
            {{ titulo() }}
          </p>
          <div class="barra-zona" [style.opacity]="e().opacidadBarra">
            <div class="barra-fondo">
              <div class="barra" [style.width.%]="e().anchoBarra"></div>
            </div>
            <span class="barra-valor">{{ e().valorBarra }}%</span>
          </div>
        </div>
      }
      @if (quemado()) {
        <span class="quemado">f {{ cifras() }}</span>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      container-type: inline-size;
      aspect-ratio: 16 / 9;
    }
    .lienzo {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      overflow: hidden;
      background: var(--estudio-lienzo, #301f56);
      font-family: var(--estudio-fuente, 'Segoe UI', system-ui, sans-serif);
    }
    /* El halo lila del motor: profundidad sin un color nuevo. */
    .lienzo::after {
      content: '';
      position: absolute;
      right: -14.0625cqw;
      top: -14.0625cqw;
      width: 48.4375cqw;
      height: 48.4375cqw;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(170, 170, 255, 0.22), transparent 70%);
    }
    .contenido {
      position: relative;
      z-index: 1;
      width: 100%;
      padding: 0 8.5938cqw;
    }
    .modulo {
      margin: 0 0 1.0938cqw;
      font-size: 1.7188cqw;
      font-weight: 600;
      line-height: 1;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #aaaaff;
    }
    .titulo {
      margin: 0 0 4.2188cqw;
      max-width: 15ch;
      font-size: 6.0938cqw;
      font-weight: 700;
      line-height: 1.08;
      color: #ffffff;
    }
    .barra-zona {
      display: flex;
      align-items: center;
      gap: 2.0313cqw;
      max-width: 59.375cqw;
    }
    .barra-fondo {
      flex: 1;
      height: 1.25cqw;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.14);
      overflow: hidden;
    }
    .barra {
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, #8b5ffc, #aaaaff);
    }
    .barra-valor {
      min-width: 4ch;
      font-size: 2.3438cqw;
      font-weight: 700;
      line-height: 1;
      color: #ffffff;
    }
    /* La letra de respaldo: lo que sale si se fotografía antes de que lleguen las fuentes. */
    .respaldo .modulo,
    .respaldo .titulo,
    .respaldo .barra-valor {
      font-family: 'Times New Roman', Times, serif;
      font-weight: 400;
      letter-spacing: 0;
    }
    /* Código de tiempo quemado en la imagen, como en una copia de trabajo. */
    .quemado {
      position: absolute;
      z-index: 2;
      left: 2cqw;
      bottom: 2cqw;
      padding: 0.6cqw 1.2cqw;
      background: rgba(0, 0, 0, 0.55);
      color: #ffffff;
      font-family: var(--font-mono);
      font-size: 3.4cqw;
      line-height: 1;
    }
  `,
})
export class EscenaMotor {
  readonly fotograma = input(150);
  readonly separadas = input(false);
  readonly quemado = input(false);
  readonly carga = input<CargaEscena>('normal');
  readonly modulo = input('Módulo 1 · Introducción');
  readonly titulo = input('Trabajo seguro en alturas');

  protected readonly e = computed(() => estadoEscena(this.fotograma(), this.separadas()));
  protected readonly yModulo = computed(() => `translateY(${cqw(this.e().yModulo)})`);
  protected readonly yTitulo = computed(() => `translateY(${cqw(this.e().yTitulo)})`);
  protected readonly cifras = computed(() => tresCifras(this.fotograma()));
}
