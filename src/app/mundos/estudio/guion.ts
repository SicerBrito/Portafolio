import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { Movimiento } from '../../core/movimiento';
import {
  GUION_EJEMPLO,
  VERSION_PLANTILLA,
  VERSION_PLANTILLA_NUEVA,
  type EscenaGuion,
} from './contenido';
import { huella } from './motor';

type EstadoFragmento = 'cache' | 'cambio' | 'renderizando' | 'nuevo';

const TOTAL_SEG = GUION_EJEMPLO.reduce((s, e) => s + e.duracionSeg, 0);

/** El hash del plan: el contenido de la escena más la versión de la plantilla. */
const hashDe = (e: EscenaGuion, version: string) =>
  huella(
    JSON.stringify({
      tipo: e.tipo,
      texto: e.texto,
      duracionSeg: e.duracionSeg,
      versionPlantilla: version,
    }),
  );

const cacheInicial = (): Record<string, string> =>
  Object.fromEntries(GUION_EJEMPLO.map((e) => [e.id, hashDe(e, VERSION_PLANTILLA)]));

/**
 * "El guion manda" (arquitectura diseñada, sin construir): editar una escena del guion
 * cambia su hash y solo esa escena vuelve a renderizarse. Cambiar la plantilla invalida todas.
 * Datos ficticios; la caché es una simulación del plan en el navegador.
 */
@Component({
  selector: 'app-estudio-guion',
  templateUrl: './guion.html',
  styleUrl: './guion.scss',
})
export class GuionEstudio {
  private readonly movimiento = inject(Movimiento);
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  protected readonly total = TOTAL_SEG;
  protected readonly escenas = signal<EscenaGuion[]>(GUION_EJEMPLO.map((e) => ({ ...e })));
  protected readonly version = signal(VERSION_PLANTILLA);
  private readonly cache = signal<Record<string, string>>(cacheInicial());
  private readonly enCurso = signal<string[]>([]);
  private readonly recien = signal<string[]>([]);
  protected readonly ultimo = signal<{
    escenas: number;
    segundos: number;
    plantilla: boolean;
  } | null>(null);

  protected readonly hashes = computed(() => {
    const v = this.version();
    return Object.fromEntries(this.escenas().map((e) => [e.id, hashDe(e, v)]));
  });

  protected readonly estados = computed<Record<string, EstadoFragmento>>(() => {
    const hashes = this.hashes();
    const cache = this.cache();
    const enCurso = this.enCurso();
    const recien = this.recien();
    return Object.fromEntries(
      this.escenas().map((e) => {
        const estado: EstadoFragmento = enCurso.includes(e.id)
          ? 'renderizando'
          : hashes[e.id] !== cache[e.id]
            ? 'cambio'
            : recien.includes(e.id)
              ? 'nuevo'
              : 'cache';
        return [e.id, estado];
      }),
    );
  });

  protected readonly pendientes = computed(() =>
    this.escenas().filter((e) => this.estados()[e.id] === 'cambio'),
  );
  protected readonly segundosPendientes = computed(() =>
    this.pendientes().reduce((s, e) => s + e.duracionSeg, 0),
  );
  protected readonly plantillaNueva = computed(() => this.version() !== VERSION_PLANTILLA);
  protected readonly ocupado = computed(() => this.enCurso().length > 0);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.temporizador) clearTimeout(this.temporizador);
    });
  }

  protected editar(id: string, evento: Event): void {
    const texto = (evento.target as HTMLInputElement).value;
    this.ultimo.set(null);
    this.escenas.update((lista) => lista.map((e) => (e.id === id ? { ...e, texto } : e)));
  }

  protected cambiarPlantilla(): void {
    this.ultimo.set(null);
    this.version.update((v) =>
      v === VERSION_PLANTILLA ? VERSION_PLANTILLA_NUEVA : VERSION_PLANTILLA,
    );
  }

  protected renderizar(): void {
    const ids = this.pendientes().map((e) => e.id);
    if (!ids.length || this.ocupado()) return;
    const resumen = {
      escenas: ids.length,
      segundos: this.segundosPendientes(),
      plantilla: this.plantillaNueva(),
    };
    this.recien.set([]);
    this.enCurso.set(ids);
    const terminar = () => {
      this.temporizador = null;
      const hashes = this.hashes();
      this.cache.update((c) => ({
        ...c,
        ...Object.fromEntries(ids.map((id) => [id, hashes[id]])),
      }));
      this.enCurso.set([]);
      this.recien.set(ids);
      this.ultimo.set(resumen);
    };
    if (this.movimiento.reducido()) terminar();
    else this.temporizador = setTimeout(terminar, 1500);
  }

  protected restablecer(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.temporizador = null;
    this.escenas.set(GUION_EJEMPLO.map((e) => ({ ...e })));
    this.version.set(VERSION_PLANTILLA);
    this.cache.set(cacheInicial());
    this.enCurso.set([]);
    this.recien.set([]);
    this.ultimo.set(null);
  }
}
