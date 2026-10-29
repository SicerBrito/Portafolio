import { Component, DestroyRef, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Mundo } from '../../core/mundo';
import { PROYECTOS, buscarProyecto, type Proyecto } from '../../contenido/proyectos';
import { AhdoEntrada } from './entrada';
import { AhdoPago } from './pago';
import { AhdoFactura } from './factura';
import { AhdoMapa } from './mapa';
import { AhdoHistorias } from './historias';
import { AhdoConstancia } from './constancia';

const AHDO = buscarProyecto('ahdo') as Proyecto;

/**
 * Mundo AHDO: "Una plataforma, varias marcas".
 * Una plataforma que emite documentos, contada con sus documentos: el certificado que cambia de
 * marca, la planta por donde viaja un pago, la factura que se rearma según a quién se le cobra,
 * la red de módulos y empresas y, al final, la constancia de autoría verificada con git.
 */
@Component({
  selector: 'app-mundo-ahdo',
  imports: [RouterLink, AhdoEntrada, AhdoPago, AhdoFactura, AhdoMapa, AhdoHistorias, AhdoConstancia],
  templateUrl: './ahdo.html',
  styleUrl: './ahdo.scss',
})
export class MundoAhdo {
  protected readonly proyecto = AHDO;
  protected readonly siguiente: Proyecto = PROYECTOS[(PROYECTOS.findIndex((p) => p.id === 'ahdo') + 1) % PROYECTOS.length];
  /** Primera frase del resumen de la siguiente nave. */
  protected readonly siguienteResumen = this.siguiente.resumen.split('. ')[0].replace(/\.$/, '') + '.';

  constructor() {
    const mundo = inject(Mundo);
    mundo.actual.set('ahdo');
    inject(DestroyRef).onDestroy(() => mundo.actual.set('planta'));

    inject(Title).setTitle('AHDO · Una plataforma, varias marcas · Sicer Brito');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'AHDO: una sola plataforma en la que varias empresas de un grupo forman, evalúan, certifican y facturan, cada una con su marca y sus precios. Desarrollador principal desde 2024.',
    });
  }
}
