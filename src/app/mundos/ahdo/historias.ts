import { Component, input } from '@angular/core';
import type { Historia } from '../../contenido/proyectos';
import { AhdoDibujo } from './dibujo';
import { AhdoLibro } from './libro';

/**
 * Dos módulos por dentro: el motor de pruebas y la cartera con su libro de pagos.
 * El texto llega en el HTML prerenderizado; los dibujos y el libro interactivo se cargan después.
 */
@Component({
  selector: 'app-ahdo-historias',
  imports: [AhdoDibujo, AhdoLibro],
  templateUrl: './historias.html',
  styleUrl: './historias.scss',
})
export class AhdoHistorias {
  readonly psicometria = input.required<Historia>();
  readonly facturacion = input.required<Historia>();
}
