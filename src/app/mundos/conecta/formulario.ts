import { Component, computed, signal } from '@angular/core';
import {
  BLOQUES,
  MARCAS_FORMULARIO,
  RESPUESTAS_EJEMPLO,
  type Bloque,
  type MarcaFormulario,
  type TipoBloque,
} from './contenido';

interface Pregunta {
  id: number;
  bloque: Bloque;
  texto: string;
  respuestas: number;
  retirada: boolean;
  version: number;
}

const inicial = (): Pregunta[] => [
  { id: 1, bloque: BLOQUES[0], texto: BLOQUES[0].pregunta, respuestas: 128, retirada: false, version: 1 },
  { id: 2, bloque: BLOQUES[1], texto: BLOQUES[1].pregunta, respuestas: 128, retirada: false, version: 1 },
];

/**
 * "El formulario es dato": se arma con bloques, sin programar. Una pregunta con
 * respuestas no se edita: se retira, conserva lo respondido y su reemplazo entra al lado.
 */
@Component({
  selector: 'app-conecta-formulario',
  templateUrl: './formulario.html',
  styleUrl: './formulario.scss',
})
export class FormularioConecta {
  protected readonly bloques = BLOQUES;
  protected readonly marcas = MARCAS_FORMULARIO;
  protected readonly respuestasEjemplo = RESPUESTAS_EJEMPLO;

  protected readonly marca = signal<MarcaFormulario>(MARCAS_FORMULARIO[0]);
  protected readonly preguntas = signal<Pregunta[]>(inicial());
  protected readonly anuncio = signal('');

  protected readonly vivas = computed(() => this.preguntas().filter((p) => !p.retirada));
  private readonly tiposVivos = computed(() => new Set(this.vivas().map((p) => p.bloque.tipo)));

  private siguienteId = 3;

  protected yaEsta(tipo: TipoBloque): boolean {
    return this.tiposVivos().has(tipo);
  }

  protected resumen(p: Pregunta): string {
    return RESPUESTAS_EJEMPLO[p.bloque.tipo].map((r) => `${r.etiqueta}, ${r.valor} %`).join('; ');
  }

  /** Las filas dependen de la empresa: consultorios en la IPS, instructores en la escuela. */
  protected texto(p: Pregunta): string {
    return p.bloque.tipo === 'filas' ? this.marca().filas.pregunta : p.texto;
  }

  protected elegirMarca(m: MarcaFormulario): void {
    this.marca.set(m);
  }

  protected agregar(bloque: Bloque): void {
    if (this.yaEsta(bloque.tipo)) return;
    const nueva: Pregunta = {
      id: this.siguienteId++,
      bloque,
      texto: bloque.pregunta,
      respuestas: 0,
      retirada: false,
      version: 1,
    };
    this.preguntas.update((lista) => [...lista, nueva]);
    this.anuncio.set(`Se agregó «${this.texto(nueva)}». El formulario del celular ya la muestra.`);
  }

  /** Sin respuestas no hay nada que cuidar: se puede quitar. */
  protected quitar(p: Pregunta): void {
    if (p.respuestas > 0) return;
    this.preguntas.update((lista) => lista.filter((x) => x.id !== p.id));
    this.anuncio.set(`Se quitó «${this.texto(p)}».`);
  }

  protected retirar(p: Pregunta): void {
    if (p.respuestas === 0) return;
    this.preguntas.update((lista) => lista.map((x) => (x.id === p.id ? { ...x, retirada: true } : x)));
    this.anuncio.set(`«${this.texto(p)}» ya no se pregunta. Sus ${p.respuestas} respuestas se conservan.`);
  }

  protected reemplazar(p: Pregunta): void {
    if (this.yaEsta(p.bloque.tipo)) return;
    this.preguntas.update((lista) => {
      const i = lista.findIndex((x) => x.id === p.id);
      const nueva: Pregunta = {
        id: this.siguienteId++,
        bloque: p.bloque,
        texto: p.texto,
        respuestas: 0,
        retirada: false,
        version: p.version + 1,
      };
      return [...lista.slice(0, i + 1), nueva, ...lista.slice(i + 1)];
    });
    this.anuncio.set(`Entró la versión ${p.version + 1} al lado de la retirada. Empieza con cero respuestas.`);
  }

  protected reiniciar(): void {
    this.preguntas.set(inicial());
    this.siguienteId = 3;
    this.anuncio.set('El formulario volvió a como estaba.');
  }
}
