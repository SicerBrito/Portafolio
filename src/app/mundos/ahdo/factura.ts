import { Component, input } from '@angular/core';
import type { Historia } from '../../contenido/proyectos';
import { CLIENTE_FICTICIO, DESTINOS, SERVICIOS_DEMO, type DestinoId } from './datos';
import { AhdoMesa } from './mesa';

/**
 * "¿A quién se le factura?". El texto de la historia llega en el HTML prerenderizado; la mesa
 * interactiva se descarga al acercarse a la pantalla. Mientras tanto (y en el servidor) se ve
 * el mismo caso en texto: cada servicio y a quién se le factura.
 */
@Component({
  selector: 'app-ahdo-factura',
  imports: [AhdoMesa],
  templateUrl: './factura.html',
  styleUrl: './factura.scss',
})
export class AhdoFactura {
  readonly historia = input.required<Historia>();

  protected readonly cliente = CLIENTE_FICTICIO;
  protected readonly servicios = SERVICIOS_DEMO;

  protected receptor(id: DestinoId): string {
    return id === 'cliente' ? CLIENTE_FICTICIO : (DESTINOS.find((d) => d.id === id)?.nombre ?? id);
  }
}
