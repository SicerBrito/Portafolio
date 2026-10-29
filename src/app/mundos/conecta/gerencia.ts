import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Movimiento } from '../../core/movimiento';
import { CONVERSACIONES } from './contenido';
import { ICONO_CLAUDE, ICONO_MCP } from './iconos';

type Fase = 'herramientas' | 'panel';

/**
 * "La gerencia le pregunta a Claude": un chat de ejemplo. Claude escoge herramientas
 * MCP de solo lectura de Conecta y arma el panel con las mismas cifras de la pantalla.
 */
@Component({
  selector: 'app-conecta-gerencia',
  templateUrl: './gerencia.html',
  styleUrl: './gerencia.scss',
})
export class GerenciaConecta {
  private readonly reducido = inject(Movimiento).reducido;

  protected readonly conversaciones = CONVERSACIONES;
  protected readonly claude = ICONO_CLAUDE;
  protected readonly mcp = ICONO_MCP;

  /** Arranca con la primera conversación completa: así el HTML prerenderizado ya la trae. */
  protected readonly elegida = signal(0);
  protected readonly fase = signal<Fase>('panel');
  protected readonly conversacion = computed(() => CONVERSACIONES[this.elegida()]);

  private temporizador: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizador));
  }

  protected preguntar(i: number): void {
    clearTimeout(this.temporizador);
    this.elegida.set(i);
    if (this.reducido()) {
      this.fase.set('panel');
      return;
    }
    // Primero vuelan las herramientas; después Claude arma el panel y responde.
    this.fase.set('herramientas');
    this.temporizador = setTimeout(() => this.fase.set('panel'), 1100);
  }
}
