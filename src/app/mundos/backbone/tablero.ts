import { Component } from '@angular/core';
import { ESTADO_HOY } from './contenido';

/** El tablero de "lo que todavía falta": un piloto por pieza, verde si quedó lista. */
@Component({
  selector: 'app-backbone-tablero',
  template: `
    <ul class="tablero">
      @for (e of estadoHoy; track e.que) {
        <li [class.bien]="e.bien">
          <i aria-hidden="true"></i>
          <span class="que">{{ e.que }}</span>
          <span class="estado">{{ e.estado }}</span>
        </li>
      }
    </ul>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .tablero {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr));
      gap: 10px;
      width: 100%;
      max-width: 920px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 2px 10px;
      align-items: center;
      padding: 14px 16px;
      border-radius: 12px;
      border: 1px solid var(--line-soft);
      background: var(--surface);
    }
    i {
      grid-row: span 2;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid var(--backbone-aviso);
    }
    .bien i {
      border-color: var(--backbone-exito);
      background: var(--backbone-exito);
    }
    .que {
      font-weight: 600;
    }
    .estado {
      color: var(--ink-2);
      font-size: 0.875rem;
    }
  `,
})
export class TableroBackbone {
  protected readonly estadoHoy = ESTADO_HOY;
}
