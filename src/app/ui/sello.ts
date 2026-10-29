import { Component, computed, input } from '@angular/core';
import { ETIQUETA_ESTADO, SELLO_AUTORIA, type Estado, type TipoAutoria } from '../contenido/proyectos';

/** Sello de autoría y estado: lo que dice git, a la vista. */
@Component({
  selector: 'app-sello',
  template: `
    <span class="sello" [class.lleno]="lleno()">{{ autoriaTexto() }}</span>
    @if (estado(); as e) {
      <span class="estado" [class]="'estado estado-' + e">{{ estadoTexto() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px 12px;
    }
    .sello {
      display: inline-block;
      padding: 4px 10px;
      border: 2px solid var(--signal-text);
      outline: 1px solid var(--signal-text);
      outline-offset: 2px;
      color: var(--signal-text);
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 500;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      transform: rotate(-2deg);
      white-space: nowrap;
    }
    .sello.lleno {
      background: var(--signal);
      border-color: var(--signal);
      outline-color: var(--signal);
      color: var(--on-signal);
    }
    .estado {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--ink-2);
      white-space: nowrap;
    }
    .estado::before {
      content: '';
      width: 9px;
      height: 9px;
      border-radius: 50%;
      border: 2px solid currentColor;
    }
    .estado-produccion::before,
    .estado-desplegado::before {
      background: var(--signal);
      border-color: var(--signal);
    }
    .estado-prototipo::before {
      border-style: dashed;
    }
    .estado-inactivo {
      color: var(--ink-3);
    }
  `,
})
export class Sello {
  readonly autoria = input.required<TipoAutoria>();
  readonly estado = input<Estado>();

  protected readonly autoriaTexto = computed(() => SELLO_AUTORIA[this.autoria()]);
  protected readonly estadoTexto = computed(() => {
    const e = this.estado();
    return e ? ETIQUETA_ESTADO[e] : '';
  });
  protected readonly lleno = computed(() => this.autoria() === 'desde-cero' || this.autoria() === 'principal');
}
