import { Component, DOCUMENT, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Cabecera } from './ui/cabecera';
import { Pie } from './ui/pie';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Cabecera, Pie],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const raiz = inject(DOCUMENT).documentElement;
    // El cambio de ventana se abre desde donde el visitante hizo clic.
    window.addEventListener(
      'pointerdown',
      (e) => {
        raiz.style.setProperty('--vt-x', `${e.clientX}px`);
        raiz.style.setProperty('--vt-y', `${e.clientY}px`);
      },
      { capture: true, passive: true },
    );
  }
}
