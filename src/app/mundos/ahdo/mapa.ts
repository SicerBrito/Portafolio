import { Component } from '@angular/core';
import { EMPRESAS, ETIQUETA_AUTORIA_MODULO, MODULOS, type ModuloMapa } from './datos';
import { AhdoRed } from './red';

/** "Quién usa qué": la sección y su texto; la red interactiva llega diferida. */
@Component({
  selector: 'app-ahdo-mapa',
  imports: [AhdoRed],
  templateUrl: './mapa.html',
  styleUrl: './mapa.scss',
})
export class AhdoMapa {
  protected readonly modulos = MODULOS;
  /** La lista prerenderizada lleva las mismas insignias de autoría que la red: la nota de abajo las nombra. */
  protected readonly etiquetaAutoria = ETIQUETA_AUTORIA_MODULO;

  protected nombres(m: ModuloMapa): string {
    const n = m.empresas.map((id) => EMPRESAS.find((e) => e.id === id)?.nombre ?? id);
    return n.length > 1 ? `${n.slice(0, -1).join(', ')} y ${n[n.length - 1]}` : (n[0] ?? '');
  }
}
