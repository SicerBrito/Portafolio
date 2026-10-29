import { Component, DestroyRef, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Mundo } from '../../core/mundo';
import { PROYECTOS, type Proyecto } from '../../contenido/proyectos';
import { Sello } from '../../ui/sello';
import { BusKafkaOcupasalud } from './bus-kafka';
import { DIRECTORIO, EVOLUCION, PENDIENTES, PIEZAS_CREADAS, QUIENES_LO_USAN, TURNO } from './contenido';
import { FachadaOcupasalud } from './fachada';
import { ICONOS, STACK_OCUPASALUD } from './iconos';
import { PapelDatoOcupasalud } from './papel-dato';
import { PICTOGRAMAS } from './pictogramas';
import { RecorridoOcupasalud } from './recorrido';

const INDICE = PROYECTOS.findIndex((p) => p.id === 'ocupasalud');
const PROYECTO = PROYECTOS[INDICE] as Proyecto;
const SIGUIENTE = PROYECTOS[(INDICE + 1) % PROYECTOS.length];

/** El turno que sigue al del paciente de ejemplo: la pantalla de la salida lo llama. */
const TURNO_SIGUIENTE = TURNO.replace(/\d+$/, (n) => String(Number(n) + 1).padStart(n.length, '0'));

/**
 * Mundo Ocupasalud: "Un día en la IPS".
 * La página es la sede: se entra por la fachada azul, se toma un turno, se lee el directorio y se
 * sigue al paciente de ejemplo por la maqueta 3D. Después vienen la máquina que pasa los exámenes
 * del papel al dato, el laboratorio del bus con AHDO (piloto), la constancia de participación
 * verificada con git, las citas pendientes y la pantalla que llama al siguiente turno.
 * El juego y el laboratorio se cargan con @defer; su explicación está fuera del bloque diferido y
 * sale en el HTML prerenderizado.
 */
@Component({
  selector: 'app-mundo-ocupasalud',
  imports: [
    NgOptimizedImage,
    RouterLink,
    Sello,
    FachadaOcupasalud,
    RecorridoOcupasalud,
    PapelDatoOcupasalud,
    BusKafkaOcupasalud,
  ],
  templateUrl: './ocupasalud.html',
  styleUrl: './ocupasalud.scss',
})
export class MundoOcupasalud {
  protected readonly p = PROYECTO;
  protected readonly siguiente = SIGUIENTE;
  protected readonly siguienteResumen = SIGUIENTE.resumen.split('. ')[0].replace(/\.$/, '') + '.';
  protected readonly turno = TURNO;
  protected readonly turnoSiguiente = TURNO_SIGUIENTE;
  protected readonly directorio = DIRECTORIO;
  protected readonly quienes = QUIENES_LO_USAN;
  protected readonly evolucion = EVOLUCION;
  protected readonly piezas = PIEZAS_CREADAS;
  protected readonly pendientes = PENDIENTES;
  protected readonly pictos = PICTOGRAMAS;
  protected readonly iconos = ICONOS;
  protected readonly stack = STACK_OCUPASALUD;

  constructor() {
    const mundo = inject(Mundo);
    mundo.actual.set('ocupasalud');
    inject(DestroyRef).onDestroy(() => mundo.actual.set('planta'));

    inject(Title).setTitle('Ocupasalud · Un día en la IPS · Sicer Brito');
    inject(Meta).updateTag({
      name: 'description',
      content:
        'Ocupasalud, el sistema de varias IPS de salud ocupacional desde 2017. Sicer Brito participó con tres integraciones: el informe del radiólogo que llega solo, la IA que lee exámenes en PDF y la encuesta por WhatsApp. Un recorrido 3D por una sede de ejemplo.',
    });
  }
}
