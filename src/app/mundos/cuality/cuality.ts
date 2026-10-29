import { Component, DestroyRef, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Mundo } from '../../core/mundo';
import { PROYECTOS, type Proyecto } from '../../contenido/proyectos';
import { Sello } from '../../ui/sello';
import { CarpetaCuality } from './carpeta';
import { ACTA, BASE, DOMINIO, SERVIDOR_PROBLEMA } from './contenido';
import { STACK_CUALITY } from './iconos';
import { RecorridoCuality } from './recorrido';

const INDICE = PROYECTOS.findIndex((p) => p.id === 'cuality');
const PROYECTO = PROYECTOS[INDICE] as Proyecto;
const SIGUIENTE = PROYECTOS[(INDICE + 1) % PROYECTOS.length];

/** Guilloche del sello: rosetas de líneas finas, calculadas una vez (también en el servidor). */
function roseta(radio: number, amplitud: number, ondas: number, fase: number): string {
  const pasos = 240;
  let d = '';
  for (let i = 0; i <= pasos; i++) {
    const a = (i / pasos) * Math.PI * 2;
    const r = radio + Math.sin(a * ondas + fase) * amplitud;
    const x = 200 + Math.cos(a) * r;
    const y = 200 + Math.sin(a) * r;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d + 'Z';
}

const ROSETAS = [
  roseta(150, 8, 18, 0),
  roseta(150, 8, 18, Math.PI / 3),
  roseta(150, 8, 18, (Math.PI * 2) / 3),
  roseta(172, 5, 30, 0),
  roseta(172, 5, 30, Math.PI / 2),
];

/**
 * Mundo Cuality: "La llave arma el menú".
 * La página es un expediente de acreditación: se entra por el sello, se ve el edificio de dos pisos
 * (el dominio de otro desarrollador arriba, la base mía abajo), se recorre el árbol de permisos en
 * 3D con el scroll y con el llavero, se reproduce el error que solo aparecía en el servidor y se
 * firma el acta de entrega.
 */
@Component({
  selector: 'app-mundo-cuality',
  imports: [NgOptimizedImage, RouterLink, Sello, RecorridoCuality, CarpetaCuality],
  templateUrl: './cuality.html',
  styleUrl: './cuality.scss',
})
export class MundoCuality {
  protected readonly p = PROYECTO;
  protected readonly siguiente = SIGUIENTE;
  protected readonly dominio = DOMINIO;
  protected readonly base = BASE;
  protected readonly acta = ACTA;
  protected readonly stack = STACK_CUALITY;
  protected readonly rosetas = ROSETAS;
  protected readonly historiaPermisos = PROYECTO.historias[0];
  protected readonly historiaServidor = PROYECTO.historias[1];
  /** El problema dicho sin "producción": Cuality nunca salió a producción. */
  protected readonly servidorProblema = SERVIDOR_PROBLEMA;

  constructor() {
    const mundo = inject(Mundo);
    mundo.actual.set('cuality');
    inject(DestroyRef).onDestroy(() => mundo.actual.set('planta'));

    inject(Title).setTitle('Cuality · La llave arma el menú · Sicer Brito');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Cuality, un sistema de estudios de puesto de trabajo. Sicer Brito fundó su base: .NET 8, Angular 19, JWT y permisos granulares que arman el menú. Recorre en 3D el árbol de permisos y prueba el llavero.',
    });
  }
}
