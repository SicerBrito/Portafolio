import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Movimiento } from '../../core/movimiento';
import { CAMBIOS_FICTICIOS, CLIENTE_FICTICIO } from './contenido';
import { ICONOS } from './iconos';

type Origen = 'ocupa' | 'ahdo';

interface Sobre {
  id: number;
  origen: Origen;
  texto: string;
  conflicto: boolean;
  /** Revisión del cliente que trae el sobre. */
  revision: number;
}

/** Cuánto tarda un sobre en cruzar el bus, en ms. En movimiento reducido llega en el acto. */
const CRUCE_MS = 1100;
/** El publicador revisa la bandeja de salida cada tanto: un sobre sale detrás de otro. */
const ENTRE_SALIDAS_MS = 420;

/**
 * "Dos mundos, un bus": AHDO (ids GUID) y Ocupasalud 2.0 (ids enteros) comparten clientes por
 * Kafka. Cada cambio en Ocupasalud 2.0 se guarda en la bandeja de salida en la misma transacción;
 * un publicador la vacía en orden. Con Kafka apagado la aplicación sigue respondiendo y los sobres
 * se apilan; al encenderlo salen solos, en el orden en que entraron. Piloto: no está en producción.
 */
@Component({
  selector: 'app-ocupa-bus-kafka',
  imports: [NgOptimizedImage],
  templateUrl: './bus-kafka.html',
  styleUrl: './bus-kafka.scss',
})
export class BusKafkaOcupasalud {
  private readonly reducido = inject(Movimiento).reducido;

  protected readonly cliente = CLIENTE_FICTICIO;
  protected readonly kafka = ICONOS.kafka;

  protected readonly encendido = signal(true);
  protected readonly bandeja = signal<Sobre[]>([]);
  protected readonly enVuelo = signal<Sobre[]>([]);
  protected readonly revision = signal<Sobre[]>([]);
  protected readonly ultimoOcupa = signal('Sin cambios todavía');
  protected readonly ultimoAhdo = signal('Sin cambios todavía');
  /** Revisión del cliente que tiene cada plataforma: si difieren, una va atrasada. */
  protected readonly revisionOcupa = signal(1);
  protected readonly revisionAhdo = signal(1);
  protected readonly aviso = signal('Kafka está encendido. Edita el cliente en Ocupasalud 2.0 y mira el sobre cruzar.');
  protected readonly duracion = computed(() => (this.reducido() ? 0 : CRUCE_MS));

  private siguienteId = 1;
  private cambio = 0;
  private ultimaRevision = 1;
  private publicando = false;
  private readonly temporizadores = new Set<ReturnType<typeof setTimeout>>();

  /** El flujo de partículas del bus es un bucle: fuera de pantalla se pausa. */
  protected readonly enVista = signal(false);

  constructor() {
    const destruccion = inject(DestroyRef);
    const anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);
    destruccion.onDestroy(() => {
      for (const t of this.temporizadores) clearTimeout(t);
      this.temporizadores.clear();
    });

    afterNextRender(() => {
      const observador = new IntersectionObserver((entradas) => {
        const e = entradas[entradas.length - 1];
        if (e) this.enVista.set(e.isIntersecting);
      });
      observador.observe(anfitrion.nativeElement);
      destruccion.onDestroy(() => observador.disconnect());
    });
  }

  /** Un cambio en Ocupasalud 2.0: se guarda junto con su sobre en la bandeja de salida. */
  protected editarEnOcupasalud(): void {
    const texto = CAMBIOS_FICTICIOS[this.cambio++ % CAMBIOS_FICTICIOS.length];
    const revision = ++this.ultimaRevision;
    this.revisionOcupa.set(revision);
    this.ultimoOcupa.set(texto);
    const sobre: Sobre = { id: this.siguienteId++, origen: 'ocupa', texto, conflicto: false, revision };
    this.bandeja.update((b) => [...b, sobre]);
    this.aviso.set(
      this.encendido()
        ? `Ocupasalud 2.0 guardó el cambio y dejó el sobre ${sobre.id} en la bandeja de salida.`
        : `Kafka está apagado, pero Ocupasalud 2.0 guardó el cambio. El sobre ${sobre.id} espera en la bandeja de salida.`,
    );
    this.publicar();
  }

  /** Un cambio que llega de AHDO: Ocupasalud 2.0 lo aplica sin devolverlo (sin eco). */
  protected cambiarEnAhdo(): void {
    if (!this.encendido()) return;
    const texto = CAMBIOS_FICTICIOS[this.cambio++ % CAMBIOS_FICTICIOS.length];
    const revision = ++this.ultimaRevision;
    this.revisionAhdo.set(revision);
    this.ultimoAhdo.set(texto);
    this.cruzar({ id: this.siguienteId++, origen: 'ahdo', texto, conflicto: false, revision });
    this.aviso.set('AHDO publicó un cambio. Va hacia Ocupasalud 2.0.');
  }

  /** Llega de AHDO un documento que ya está ligado a otro cliente: va a revisión, no se pisa nada. */
  protected documentoRepetido(): void {
    if (!this.encendido()) return;
    this.cruzar({
      id: this.siguienteId++,
      origen: 'ahdo',
      texto: 'Documento ya ligado a otro cliente',
      conflicto: true,
      revision: this.revisionAhdo(),
    });
    this.aviso.set('Llega de AHDO un documento repetido.');
  }

  protected alternarKafka(): void {
    const encender = !this.encendido();
    this.encendido.set(encender);
    if (encender) {
      const n = this.bandeja().length;
      this.aviso.set(
        n
          ? `Kafka volvió. Salen ${n} ${n === 1 ? 'sobre' : 'sobres'} de la bandeja, uno detrás de otro.`
          : 'Kafka volvió. La bandeja de salida estaba vacía.',
      );
      this.publicar();
    } else {
      this.aviso.set('Kafka apagado. Ocupasalud 2.0 sigue respondiendo: los cambios esperan en la bandeja de salida.');
    }
  }

  // ---- el publicador

  /** Saca los sobres de la bandeja uno por uno, en orden, mientras Kafka esté encendido. */
  private publicar(): void {
    if (this.publicando || !this.encendido()) return;
    const [primero] = this.bandeja();
    if (!primero) return;
    this.publicando = true;
    this.despues(this.reducido() ? 0 : ENTRE_SALIDAS_MS, () => {
      this.publicando = false;
      if (!this.encendido()) return;
      const [sobre, ...resto] = this.bandeja();
      if (!sobre) return;
      this.bandeja.set(resto);
      this.cruzar(sobre);
      this.publicar();
    });
  }

  private cruzar(sobre: Sobre): void {
    this.enVuelo.update((v) => [...v, sobre]);
    this.despues(this.duracion(), () => this.entregar(sobre));
  }

  private entregar(sobre: Sobre): void {
    this.enVuelo.update((v) => v.filter((s) => s.id !== sobre.id));
    if (sobre.conflicto) {
      this.revision.update((r) => [...r, sobre].slice(-4));
      this.aviso.set(
        `El sobre ${sobre.id} trae un documento ya ligado a otro cliente. Queda en revisión; ningún cliente se pisa.`,
      );
    } else if (sobre.origen === 'ocupa') {
      this.revisionAhdo.set(sobre.revision);
      this.ultimoAhdo.set(sobre.texto);
      this.aviso.set(`AHDO aplicó el sobre ${sobre.id}: ${sobre.texto.toLowerCase()}.`);
    } else {
      this.revisionOcupa.set(sobre.revision);
      this.ultimoOcupa.set(sobre.texto);
      this.aviso.set(
        `Ocupasalud 2.0 aplicó el cambio de AHDO y no lo devuelve: el consumidor no genera eco en la bandeja.`,
      );
    }
  }

  private despues(ms: number, f: () => void): void {
    const t = setTimeout(() => {
      this.temporizadores.delete(t);
      f();
    }, ms);
    this.temporizadores.add(t);
  }
}
