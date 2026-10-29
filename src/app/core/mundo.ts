import { DOCUMENT, Service, effect, inject, signal } from '@angular/core';

export type MundoId =
  | 'planta'
  | 'ahdo'
  | 'conecta'
  | 'estudio'
  | 'ocupasalud'
  | 'prevent'
  | 'cuality'
  | 'backbone';

/** El mundo activo decide la paleta de todo el sitio a través de <html data-mundo>. */
@Service()
export class Mundo {
  private readonly documento = inject(DOCUMENT);
  readonly actual = signal<MundoId>('planta');

  constructor() {
    effect(() => {
      this.documento.documentElement.setAttribute('data-mundo', this.actual());
    });
  }
}
