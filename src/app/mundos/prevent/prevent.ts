import { Component, DestroyRef, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Mundo } from '../../core/mundo';
import { PROYECTOS, type Proyecto } from '../../contenido/proyectos';
import { Sello } from '../../ui/sello';
import { BITACORA, CATALOGO, COMBOS, CURSO_EJEMPLO, DOCUMENTOS_EMPRESA, PENDIENTES, REQUISITOS } from './contenido';
import { EscaladaPrevent } from './escalada';
import { HojaPrevent } from './hoja';
import { STACK_PREVENT } from './iconos';
import { TemaPrevent } from './tema';

const INDICE = PROYECTOS.findIndex((p) => p.id === 'prevent');
const PROYECTO = PROYECTOS[INDICE] as Proyecto;
const SIGUIENTE = PROYECTOS[(INDICE + 1) % PROYECTOS.length];

/**
 * Mundo Prevent: "La escalada".
 * La página es una obra que se recorre de abajo hacia arriba: se entra por el suelo de noche, se
 * lee qué es la plataforma, se sube el andamio 3D con el scroll (cada travesaño es un documento
 * requerido real), se procesa un Excel de trabajadores ficticios, se lee la bitácora del relevo
 * y se termina en la zona sin terminar, señalizada con cinta de peligro.
 * La hoja se carga con @defer; su explicación vive fuera del bloque y sale en el HTML prerenderizado.
 */
@Component({
  selector: 'app-mundo-prevent',
  imports: [NgOptimizedImage, RouterLink, Sello, EscaladaPrevent, HojaPrevent, TemaPrevent],
  templateUrl: './prevent.html',
  styleUrl: './prevent.scss',
})
export class MundoPrevent {
  protected readonly p = PROYECTO;
  protected readonly siguiente = SIGUIENTE;
  protected readonly requisitos = REQUISITOS;
  protected readonly curso = CURSO_EJEMPLO;
  protected readonly catalogo = CATALOGO;
  protected readonly combos = COMBOS;
  protected readonly documentosEmpresa = DOCUMENTOS_EMPRESA;
  protected readonly bitacora = BITACORA;
  protected readonly pendientes = PENDIENTES;
  protected readonly stack = STACK_PREVENT;
  protected readonly historiaDocumentos = PROYECTO.historias[0];
  protected readonly historiaExcel = PROYECTO.historias[1];

  constructor() {
    const mundo = inject(Mundo);
    mundo.actual.set('prevent');
    inject(DestroyRef).onDestroy(() => mundo.actual.set('planta'));

    inject(Title).setTitle('Prevent · La escalada · Sicer Brito');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Prevent, la plataforma de un centro de entrenamiento en trabajo seguro en alturas. Sicer Brito tomó el relevo: construyó los documentos requeridos por curso, rehízo la inscripción masiva por Excel y le dio a la interfaz la identidad dorada. Hoy no está en producción. Sube el andamio 3D con el scroll.',
    });
  }
}
