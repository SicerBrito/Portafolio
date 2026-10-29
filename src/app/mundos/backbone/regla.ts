import { Component, input } from '@angular/core';
import type { Cifra } from '../../contenido/proyectos';

/**
 * Las 48 horas a escala: el miércoles de la auditoría, el commit del jueves a las 10:45 y el
 * despliegue de esa noche, sobre una regla de una raya por hora.
 */
@Component({
  selector: 'app-backbone-regla',
  template: `
    <div class="regla">
      <p class="regla-antes">
        <span class="regla-dia">Antes, hasta el martes 20</span>
        Otro desarrollador crea el proyecto. Git registra sus tres commits ese martes, entre las 10:15 y las 11:11.
      </p>

      <div
        class="regla-pista"
        role="img"
        aria-label="Del miércoles 21 a la medianoche del jueves 22: el miércoles lo recibo, lo audito y lo pruebo en local; el jueves a las 10:45 hago el commit; el jueves en la noche lo despliego y lo pruebo desde afuera."
      >
        <span class="dia dia-1">Miércoles 21</span>
        <span class="dia dia-2">Jueves 22</span>
        <span class="tramo tramo-auditoria"><b>Lo recibo, lo audito y lo pruebo en local</b></span>
        <span class="hito hito-commit"><b>10:45</b> el commit</span>
        <span class="tramo tramo-noche"><b>Despliegue</b></span>
        @for (h of horas; track $index) {
          <span class="hora" [style.left.%]="$index * 12.5">{{ h }}</span>
        }
      </div>
      <p class="regla-fuente">{{ cifra().valor }} {{ cifra().etiqueta }}. Fuente: {{ cifra().fuente }}.</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .regla {
      display: grid;
      gap: 14px;
    }

    .regla-antes {
      color: var(--ink-2);
      font-size: 0.9375rem;
    }

    .regla-dia {
      margin-right: 8px;
      color: var(--ink);
      font-weight: 600;
    }

    .regla-pista {
      position: relative;
      height: 172px;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      /* Una raya por hora y una más alta cada seis horas. */
      background:
        linear-gradient(90deg, var(--line) 1px, transparent 1px) 0 100% / calc(100% / 8) 22px repeat-x,
        linear-gradient(90deg, var(--line-soft) 1px, transparent 1px) 0 100% / calc(100% / 48) 10px repeat-x;
    }

    /* La medianoche entre el miércoles y el jueves. */
    .regla-pista::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      border-left: 1px dashed var(--line);
    }

    .dia {
      position: absolute;
      top: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--ink);
    }
    .dia-1 {
      left: 8px;
    }
    .dia-2 {
      left: calc(50% + 8px);
    }

    .tramo {
      position: absolute;
      top: 36px;
      height: 56px;
      display: flex;
      align-items: center;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.8125rem;
      line-height: 1.3;
    }
    .tramo b {
      font-weight: 600;
    }
    .tramo-auditoria {
      left: 0;
      width: calc(50% - 6px);
      background: rgba(139, 147, 255, 0.14);
      border: 1px solid var(--signal);
      color: var(--ink);
    }
    .tramo-noche {
      /* De las 19:00 del jueves a la medianoche. */
      left: calc((43 / 48) * 100%);
      right: 0;
      background: var(--backbone-degradado);
      color: #ffffff;
      justify-content: center;
      padding: 4px;
    }
    .tramo-noche b {
      writing-mode: vertical-rl;
      transform: rotate(180deg);
      font-size: 0.75rem;
    }

    .hito-commit {
      position: absolute;
      /* 10:45 del jueves: (24 + 10,75) / 48. */
      left: calc((34.75 / 48) * 100%);
      top: 30px;
      bottom: 48px;
      display: flex;
      align-items: flex-end;
      padding-left: 8px;
      border-left: 2px solid var(--backbone-exito);
      color: var(--ink-2);
      font-size: 0.8125rem;
      white-space: nowrap;
    }
    .hito-commit b {
      margin-right: 4px;
      font-family: var(--backbone-mono);
      font-weight: 500;
      color: var(--backbone-exito);
    }

    .hora {
      position: absolute;
      bottom: 26px;
      padding-left: 4px;
      font-family: var(--backbone-mono);
      font-size: 0.6875rem;
      color: var(--ink-3);
    }

    .regla-fuente {
      color: var(--ink-3);
      font-size: 0.875rem;
    }

    @media (max-width: 640px) {
      .regla-pista {
        height: 196px;
      }
      .tramo {
        height: 74px;
      }
      .hito-commit {
        flex-direction: column;
        justify-content: flex-end;
        align-items: flex-start;
        white-space: normal;
        max-width: 84px;
        bottom: 46px;
      }
      .hora:nth-child(odd) {
        display: none;
      }
    }
  `,
})
export class ReglaBackbone {
  readonly cifra = input.required<Cifra>();
  protected readonly horas = ['00', '06', '12', '18', '00', '06', '12', '18'];
}
