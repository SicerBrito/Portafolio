import { Component, computed, signal } from '@angular/core';
import { ESPERA_HORAS, VENTANA_EJEMPLO } from './contenido';

/** La regla de tiempo va de las 6 a. m. a las 8 a. m. del día siguiente (hora 32). */
const DESDE = 6;
const HASTA = 32;
const pct = (h: number) => ((h - DESDE) / (HASTA - DESDE)) * 100;

const hora = (h: number): string => {
  const total = Math.round(h * 60) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const sufijo = hh < 12 ? 'a. m.' : hh === 12 && mm === 0 ? 'm.' : 'p. m.';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${mm.toString().padStart(2, '0')} ${sufijo}`;
};

/** "a la 1:30 p. m." pero "a las 4:00 p. m.". */
const aLas = (h: number): string => {
  const hh = Math.floor(Math.round(h * 60) / 60) % 24;
  return `${hh % 12 === 1 ? 'a la' : 'a las'} ${hora(h)}`;
};

const horaCorta = (h: number): string => {
  const hh = h % 24;
  if (hh === 12) return '12 m.';
  if (hh === 0) return '12 a. m.';
  return `${hh % 12} ${hh < 12 ? 'a. m.' : 'p. m.'}`;
};

/**
 * "La pregunta tiene su momento": la encuesta sale cuando el paciente ya terminó.
 * El deslizador mueve la hora de ingreso; el formulario decide la espera y el servicio, la
 * ventana horaria (en Conecta es un ajuste general, no de cada formulario).
 */
@Component({
  selector: 'app-conecta-momento',
  template: `
    <div class="momento">
      <div class="mando">
        <label for="ingreso-paciente">
          Hora de ingreso del paciente
          <output for="ingreso-paciente">{{ textoIngreso() }}</output>
        </label>
        <input
          id="ingreso-paciente"
          type="range"
          min="6"
          max="19"
          step="0.5"
          [value]="ingreso()"
          [attr.aria-valuetext]="textoIngreso()"
          (input)="mover($event)"
        />
      </div>

      <div class="regla" aria-hidden="true">
        <span class="rotulo arriba" [style.left.%]="pIngreso()">Ingresa</span>
        <div class="pista">
          <span class="ventana" [style.left.%]="ventanaHoy.izq" [style.width.%]="ventanaHoy.ancho"></span>
          <span class="ventana" [style.left.%]="ventanaManana.izq" [style.width.%]="ventanaManana.ancho"></span>
          <span class="medianoche" [style.left.%]="medianoche"></span>
          <span class="espera" [style.left.%]="pIngreso()" [style.width.%]="anchoEspera()"></span>
          @if (corre()) {
            <span class="corre" [style.left.%]="pIdeal()" [style.width.%]="anchoCorre()"></span>
          }
          <span class="ingreso" [style.left.%]="pIngreso()"></span>
          <span class="salida" [style.left.%]="pSalida()">
            <svg viewBox="0 0 20 16"><path d="M2 2h16v12H2z M2 2l8 6 8-6" /></svg>
          </span>
        </div>
        <span class="rotulo abajo" [class.al-final]="pSalida() > 75" [style.left.%]="pSalida()">Sale la encuesta</span>
        <div class="marcas">
          @for (m of marcas; track m.h) {
            <span [style.left.%]="m.p">{{ m.texto }}</span>
          }
        </div>
      </div>

      <p class="resultado" aria-live="polite">{{ resultado() }}</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .momento {
      display: grid;
      gap: 18px;
      padding: clamp(16px, 3vw, 28px);
      border-radius: 24px;
      background: var(--surface);
      border: 1px solid var(--line-soft);
      box-shadow: var(--conecta-sombra);
      font-family: var(--conecta-texto);
    }
    .mando {
      display: grid;
      gap: 6px;
      max-width: 520px;
    }
    label {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      color: var(--ink-2);
    }
    output {
      font: 700 1.125rem var(--conecta-titulo);
      font-variant-numeric: tabular-nums;
      color: var(--conecta-tinta);
    }
    input {
      width: 100%;
      min-height: 44px;
      accent-color: var(--conecta-oro-5);
      cursor: pointer;
    }
    .regla {
      position: relative;
      margin: 0 24px;
      padding: 30px 0 56px;
    }
    .pista {
      position: relative;
      height: 44px;
      border-radius: 12px;
      background: var(--surface-2);
      box-shadow: inset 0 0 0 1px var(--line-soft);
    }
    .pista > span,
    .rotulo,
    .marcas span {
      position: absolute;
    }
    .ventana {
      top: 0;
      bottom: 0;
      border-radius: 10px;
      background: var(--conecta-oro-tenue);
    }
    .medianoche {
      top: -8px;
      bottom: -8px;
      width: 0;
      border-left: 2px dashed var(--conecta-lila);
    }
    .espera {
      top: 15px;
      height: 14px;
      border-radius: 7px;
      background: var(--conecta-oro-1);
      transition: width 160ms var(--ease-out), left 160ms var(--ease-out);
    }
    .corre {
      top: 20px;
      height: 0;
      border-top: 4px dotted var(--conecta-lila);
    }
    .ingreso,
    .salida {
      top: 50%;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      background: var(--conecta-tinta);
      transition: left 160ms var(--ease-out);
    }
    .ingreso {
      width: 20px;
      height: 20px;
    }
    .salida {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
    }
    .salida svg {
      width: 18px;
      height: 14px;
      fill: none;
      stroke: var(--conecta-oro-1);
      stroke-width: 1.8;
      stroke-linejoin: round;
    }
    .rotulo {
      transform: translateX(-50%);
      font: 700 0.875rem var(--conecta-titulo);
      color: var(--conecta-tinta);
      white-space: nowrap;
      transition: left 160ms var(--ease-out);
    }
    .rotulo.arriba {
      top: 4px;
    }
    .rotulo.abajo {
      bottom: 26px;
    }
    .rotulo.al-final {
      transform: translateX(calc(-100% + 17px));
    }
    .marcas {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 20px;
    }
    .marcas span {
      transform: translateX(-50%);
      font-size: 0.75rem;
      color: var(--ink-2);
      white-space: nowrap;
    }
    .resultado {
      font: 500 clamp(1.125rem, 1rem + 0.6vw, 1.375rem) / 1.4 var(--conecta-titulo);
      color: var(--conecta-tinta);
      max-width: 60ch;
    }
    @media (max-width: 480px) {
      .regla {
        margin: 0 18px;
      }
      .marcas span {
        font-size: 0.6875rem;
      }
    }
  `,
})
export class MomentoConecta {
  protected readonly ingreso = signal(13.5);

  protected readonly ventanaHoy = {
    izq: pct(VENTANA_EJEMPLO.desde),
    ancho: pct(VENTANA_EJEMPLO.hasta) - pct(VENTANA_EJEMPLO.desde),
  };
  protected readonly ventanaManana = {
    izq: pct(24 + VENTANA_EJEMPLO.desde),
    ancho: 100 - pct(24 + VENTANA_EJEMPLO.desde),
  };
  protected readonly medianoche = pct(24);
  protected readonly marcas = [6, 12, 18, 24, 30].map((h) => ({ h, p: pct(h), texto: horaCorta(h) }));

  private readonly ideal = computed(() => this.ingreso() + ESPERA_HORAS);
  private readonly salida = computed(() => {
    const h = this.ideal();
    if (h < VENTANA_EJEMPLO.desde) return VENTANA_EJEMPLO.desde;
    if (h > VENTANA_EJEMPLO.hasta) return 24 + VENTANA_EJEMPLO.desde;
    return h;
  });

  protected readonly corre = computed(() => this.salida() !== this.ideal());
  protected readonly pIngreso = computed(() => pct(this.ingreso()));
  protected readonly pIdeal = computed(() => pct(this.ideal()));
  protected readonly pSalida = computed(() => pct(this.salida()));
  protected readonly anchoEspera = computed(() => pct(this.ideal()) - pct(this.ingreso()));
  protected readonly anchoCorre = computed(() => pct(this.salida()) - pct(this.ideal()));
  protected readonly textoIngreso = computed(() => hora(this.ingreso()));

  protected readonly resultado = computed(() => {
    const entra = aLas(this.ingreso());
    if (!this.corre()) {
      return `Si entra ${entra}, la encuesta sale ${aLas(this.salida())}, cuando ya terminó su visita.`;
    }
    return `Si entra ${entra}, la espera se cumple ${aLas(this.ideal())} y la ventana ya cerró: la encuesta sale mañana ${aLas(this.salida())}, cuando vuelve a abrir.`;
  });

  protected mover(evento: Event): void {
    this.ingreso.set(Number((evento.target as HTMLInputElement).value));
  }
}
