import { Component, DestroyRef, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  siAngular,
  siBootstrap,
  siBunnydotnet,
  siClaude,
  siDotnet,
  siGit,
  siGsap,
  siPostgresql,
  siPrimeng,
  siSwagger,
  siThreedotjs,
  siTypescript,
  siWhatsapp,
} from 'simple-icons';
import { Mundo } from '../core/mundo';
import { Movimiento } from '../core/movimiento';
import { METODO, PERFIL, TRAYECTORIA } from '../contenido/perfil';
import { PROYECTOS } from '../contenido/proyectos';
import type { CoreografiaInicio } from '../escenas/coreografia-inicio';
import { Sello } from '../ui/sello';
import { MapaEcosistema } from './mapa-ecosistema';
import { Retrato } from './retrato';

interface CifraPortada {
  valor: number;
  desde?: number;
  sufijo?: string;
  etiqueta: string;
  fuente: string;
  color: string;
}

/** Las herramientas que de verdad están en los proyectos (y en este sitio: three.js y GSAP). */
const STACK = [
  { nombre: '.NET', icono: siDotnet },
  { nombre: 'Angular', icono: siAngular },
  { nombre: 'TypeScript', icono: siTypescript },
  { nombre: 'PostgreSQL', icono: siPostgresql },
  { nombre: 'WhatsApp Cloud API', icono: siWhatsapp },
  { nombre: 'Claude', icono: siClaude },
  { nombre: 'Bunny Stream', icono: siBunnydotnet },
  { nombre: 'PrimeNG', icono: siPrimeng },
  { nombre: 'Bootstrap', icono: siBootstrap },
  { nombre: 'Swagger', icono: siSwagger },
  { nombre: 'Git', icono: siGit },
  { nombre: 'three.js', icono: siThreedotjs },
  { nombre: 'GSAP', icono: siGsap },
];

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, Sello, MapaEcosistema, Retrato],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio {
  private readonly correo = viewChild.required<ElementRef<HTMLElement>>('correo');

  protected readonly perfil = PERFIL;
  protected readonly proyectos = PROYECTOS;
  protected readonly trayectoria = TRAYECTORIA;
  protected readonly metodo = METODO;
  protected readonly estadoCopia = signal('');

  protected readonly etapas = ['Idea', 'Plan', 'Código', 'Producción', 'Operación'];
  protected readonly stack = STACK.map((h) => ({ nombre: h.nombre, path: h.icono.path }));
  protected readonly nombresStack = STACK.map((h) => h.nombre).join(', ');

  /** Solo cifras de código y repositorio: las de negocio esperan la autorización del empleador. */
  protected readonly cifras: CifraPortada[] = [
    { valor: 91, desde: 21, etiqueta: 'controllers en la API de AHDO desde que entré', fuente: 'git, oct 2026', color: 'var(--morado-4)' },
    { valor: 181, etiqueta: 'pruebas automatizadas en Conecta', fuente: 'repositorio, oct 2026', color: 'var(--morado-5)' },
    { valor: 48, sufijo: ' h', etiqueta: 'de recibir el backbone de IA a tenerlo en producción', fuente: 'despliegue, oct 2026', color: 'var(--ink)' },
    { valor: 7, etiqueta: 'sistemas en los que trabajé, dos de ellos desde cero', fuente: 'este portafolio', color: 'var(--signal-text)' },
  ];

  constructor() {
    inject(Mundo).actual.set('planta');
    const raiz = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const movimiento = inject(Movimiento);
    let coreografia: CoreografiaInicio | null = null;
    let vivo = true;
    inject(DestroyRef).onDestroy(() => {
      vivo = false;
      coreografia?.destruir();
    });

    afterNextRender(async () => {
      try {
        const { crearCoreografia } = await import('../escenas/coreografia-inicio');
        if (!vivo) return;
        coreografia = crearCoreografia({ raiz, reducido: movimiento.reducido() });
      } catch {
        // Sin animación la portada queda completa y quieta.
        document.documentElement.classList.remove('anima');
      }
    });
  }

  protected async copiarCorreo(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.perfil.correo);
      this.estadoCopia.set('Correo copiado.');
    } catch {
      // Sin acceso al portapapeles, se deja el correo seleccionado para copiarlo a mano.
      const rango = document.createRange();
      rango.selectNodeContents(this.correo().nativeElement);
      const seleccion = window.getSelection();
      seleccion?.removeAllRanges();
      seleccion?.addRange(rango);
      this.estadoCopia.set('Correo seleccionado. Cópialo con Ctrl+C.');
    }
  }
}
