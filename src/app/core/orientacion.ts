import { PLATFORM_ID, Service, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface Inclinacion {
  x: number;
  y: number;
}

type EstadoGiroscopio = 'no-disponible' | 'pedir' | 'activo';

interface EventoOrientacionConPermiso {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

const acotar = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * Una sola fuente de inclinación para todo el sitio, en -1..1.
 * En el celular sale del giroscopio; en escritorio, de la posición del mouse.
 */
@Service()
export class Orientacion {
  readonly inclinacion = signal<Inclinacion>({ x: 0, y: 0 });
  readonly giroscopio = signal<EstadoGiroscopio>('no-disponible');

  private pendiente: Inclinacion | null = null;
  private cuadro = 0;

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    if (matchMedia('(pointer: fine)').matches) {
      window.addEventListener(
        'pointermove',
        (e) => {
          if (this.giroscopio() === 'activo') return;
          this.programar({
            x: (e.clientX / window.innerWidth) * 2 - 1,
            y: (e.clientY / window.innerHeight) * 2 - 1,
          });
        },
        { passive: true },
      );
    }

    if ('DeviceOrientationEvent' in window && matchMedia('(pointer: coarse)').matches) {
      const conPermiso = DeviceOrientationEvent as unknown as EventoOrientacionConPermiso;
      if (typeof conPermiso.requestPermission === 'function') {
        // iPhone: el permiso solo se puede pedir desde un toque del usuario.
        this.giroscopio.set('pedir');
      } else {
        this.escuchar();
      }
    }
  }

  async activar(): Promise<void> {
    const conPermiso = DeviceOrientationEvent as unknown as EventoOrientacionConPermiso;
    try {
      const respuesta = await conPermiso.requestPermission?.();
      if (respuesta === 'granted') this.escuchar();
    } catch {
      this.giroscopio.set('no-disponible');
    }
  }

  private escuchar(): void {
    this.giroscopio.set('activo');
    window.addEventListener(
      'deviceorientation',
      (e) => {
        if (e.gamma === null || e.beta === null) return;
        // El celular en la mano suele ir inclinado unos 45° hacia el usuario.
        this.programar({ x: acotar(e.gamma / 30), y: acotar((e.beta - 45) / 30) });
      },
      { passive: true },
    );
  }

  // Un solo cambio por cuadro, aunque el sensor o el mouse disparen más seguido.
  private programar(valor: Inclinacion): void {
    this.pendiente = valor;
    if (this.cuadro) return;
    this.cuadro = requestAnimationFrame(() => {
      this.cuadro = 0;
      if (this.pendiente) this.inclinacion.set(this.pendiente);
    });
  }
}
