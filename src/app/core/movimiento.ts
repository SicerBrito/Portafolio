import { PLATFORM_ID, Service, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/** Refleja prefers-reduced-motion. En el servidor se asume reducido: nada se anima sin navegador. */
@Service()
export class Movimiento {
  readonly reducido = signal(true);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const consulta = matchMedia('(prefers-reduced-motion: reduce)');
    this.reducido.set(consulta.matches);
    consulta.addEventListener('change', (e) => this.reducido.set(e.matches));
  }
}
