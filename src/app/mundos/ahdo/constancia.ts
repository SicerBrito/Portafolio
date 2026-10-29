import { Component, computed, input } from '@angular/core';
import type { Proyecto } from '../../contenido/proyectos';
import { Sello } from '../../ui/sello';
import { ICONOS, type Icono } from './iconos';

const ICONO_STACK: Record<string, Icono | undefined> = {
  '.NET 8': ICONOS.dotnet,
  PostgreSQL: ICONOS.postgresql,
  'Angular 17': ICONOS.angular,
  Hangfire: ICONOS.hangfire,
  Wompi: ICONOS.pago,
  'Siigo · DIAN': ICONOS.factura,
  'Claude API': ICONOS.claude,
  JasperReports: ICONOS.pdf,
  BunnyCDN: ICONOS.bunny,
};

/**
 * La ficha de autoría, dicha como lo que AHDO sabe hacer: una constancia.
 * No la emite AHDO: la respalda git. Al lado, las cifras con su fuente, lo que falta y el stack.
 */
@Component({
  selector: 'app-ahdo-constancia',
  imports: [Sello],
  templateUrl: './constancia.html',
  styleUrl: './constancia.scss',
})
export class AhdoConstancia {
  readonly proyecto = input.required<Proyecto>();

  protected readonly cifrasNegocio = computed(() => this.proyecto().cifras.filter((c) => !c.etiqueta.includes('controllers')));
  protected readonly cifraControllers = computed(() => this.proyecto().cifras.find((c) => c.etiqueta.includes('controllers')));
  protected readonly stack = computed(() => this.proyecto().stack.map((nombre) => ({ nombre, icono: ICONO_STACK[nombre] ?? null })));

  /** 91 controllers hoy: los primeros 21 son los que había al llegar (git, oct 2026). */
  protected readonly controllers = Array.from({ length: 91 }, (_, i) => i < 21);
}
