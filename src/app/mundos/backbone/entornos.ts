import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Movimiento } from '../../core/movimiento';
import { Orientacion } from '../../core/orientacion';
import type {
  AnclaInterruptor,
  ColoresInterruptor,
  EscenaInterruptor,
  PosicionAnclaInterruptor,
} from '../../escenas/backbone/interruptor';

/** Intentos por ventana en producción: el límite real del inicio de sesión del panel. */
export const LIMITE_INTENTOS = 10;
/** La espera de la demostración. En el panel, la ventana es de cinco minutos. */
const ESPERA_DEMO = 30;
const UMBRAL_GIRO = 0.5;

export interface EstadoIntentos {
  intentos: number;
  bloqueado: boolean;
}

/** Un intento más: en desarrollo no hay límite; en producción, al décimo se congela. Pura, para probarla. */
export function intentar(estado: EstadoIntentos, produccion: boolean): EstadoIntentos {
  if (estado.bloqueado) return estado;
  const intentos = estado.intentos + 1;
  return { intentos, bloqueado: produccion && intentos >= LIMITE_INTENTOS };
}

/** Posición de la palanca después de arrastrar `dx` px sobre un escenario de `ancho` px. */
export function palancaArrastrada(inicio: number, dx: number, ancho: number): number {
  return Math.min(1, Math.max(0, inicio + dx / Math.max(ancho * 0.4, 120)));
}

/**
 * "De desarrollo a producción": la palanca decide qué siembra el backbone al arrancar.
 * Se acciona arrastrando la escena, tocándola, con el interruptor (teclado y lectores de pantalla)
 * o, si el visitante lo activa, girando el celular. Debajo, el inicio de sesión de juguete.
 */
@Component({
  selector: 'app-backbone-entornos',
  templateUrl: './entornos.html',
  styleUrl: './entornos.scss',
})
export class EntornosBackbone {
  private readonly escenario = viewChild.required<ElementRef<HTMLElement>>('escenario');
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly botonEntrar = viewChild<ElementRef<HTMLButtonElement>>('refEntrar');
  private readonly botonReiniciar = viewChild<ElementRef<HTMLButtonElement>>('refReiniciar');
  protected readonly orientacion = inject(Orientacion);
  private readonly movimiento = inject(Movimiento);
  private readonly documento = inject(DOCUMENT);
  private readonly inyector = inject(Injector);

  protected readonly produccion = signal(false);
  protected readonly activo3d = signal(false);
  protected readonly arrastrando = signal(false);
  protected readonly giroActivo = signal(false);
  protected readonly limite = LIMITE_INTENTOS;
  protected readonly ranuras = Array.from({ length: LIMITE_INTENTOS }, (_, i) => i);

  protected readonly intentos = signal(0);
  protected readonly bloqueado = signal(false);
  protected readonly espera = signal(0);
  protected readonly puntos = signal(9);
  protected readonly sacudida = signal(0);
  protected readonly mensaje = signal('');

  private escena: EscenaInterruptor | null = null;
  /** `izquierda`: la etiqueta arranca en el punto en vez de centrarse (las llaves viven en el borde). */
  private anclas: { id: AnclaInterruptor; el: HTMLElement; izquierda: boolean }[] = [];
  private reloj: ReturnType<typeof setInterval> | null = null;
  private arrastre: { id: number; x: number; inicio: number; movido: boolean } | null = null;
  private posicionArrastre = 0;

  constructor() {
    const destruccion = inject(DestroyRef);
    let vivo = true;
    destruccion.onDestroy(() => {
      vivo = false;
      this.pararReloj();
      this.escena?.destruir();
      this.escena = null;
    });

    afterNextRender(() => {
      const escenario = this.escenario().nativeElement;
      this.anclas = Array.from(escenario.querySelectorAll<HTMLElement>('[data-ancla]')).map((el) => ({
        id: (el.dataset['ancla'] ?? '') as AnclaInterruptor,
        el,
        izquierda: el.dataset['alinear'] === 'izquierda',
      }));
      const observador = new IntersectionObserver(
        async (entradas) => {
          if (!entradas.some((e) => e.isIntersecting)) return;
          observador.disconnect();
          try {
            const { crearInterruptor } = await import('../../escenas/backbone/interruptor');
            if (!vivo) return;
            this.escena = crearInterruptor({
              lienzo: this.lienzo().nativeElement,
              reducido: this.movimiento.reducido(),
              colores: () => this.colores(),
              alPosicionar: (pos) => this.posicionar(pos),
            });
            this.escena.posicion(this.produccion() ? 1 : 0, true);
            this.activo3d.set(true);
          } catch {
            // Sin WebGL queda la ilustración, que también cambia con el interruptor.
          }
        },
        { rootMargin: '300px' },
      );
      observador.observe(escenario);
      destruccion.onDestroy(() => observador.disconnect());
    });

    // La palanca sigue al estado (salvo mientras el dedo la arrastra).
    effect(() => {
      const prod = this.produccion();
      if (untracked(this.arrastrando)) return;
      this.escena?.posicion(prod ? 1 : 0);
    });

    // El giro del celular: solo si el visitante lo pidió, y vale también con movimiento reducido
    // (es una forma de accionar, no una animación). Sin él, el mouse mueve un poco la cámara.
    effect(() => {
      const i = this.orientacion.inclinacion();
      if (this.giroActivo() && this.orientacion.giroscopio() === 'activo') {
        if (i.x > UMBRAL_GIRO && !untracked(this.produccion)) this.cambiar(true);
        else if (i.x < -UMBRAL_GIRO && untracked(this.produccion)) this.cambiar(false);
        return;
      }
      if (this.movimiento.reducido()) return;
      this.escena?.inclinar(i.x * 0.6, i.y * 0.6);
    });
  }

  protected alternar(): void {
    this.cambiar(!this.produccion());
  }

  protected cambiar(prod: boolean): void {
    if (prod === this.produccion()) return;
    this.produccion.set(prod);
    this.reiniciar();
  }

  protected async activarGiro(): Promise<void> {
    if (this.giroActivo()) {
      this.giroActivo.set(false);
      return;
    }
    if (this.orientacion.giroscopio() === 'pedir') await this.orientacion.activar();
    this.giroActivo.set(this.orientacion.giroscopio() === 'activo');
  }

  // ---- arrastre de la palanca

  protected alPresionar(e: PointerEvent): void {
    if (e.button !== 0 || this.arrastre) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    this.arrastre = { id: e.pointerId, x: e.clientX, inicio: this.produccion() ? 1 : 0, movido: false };
    this.posicionArrastre = this.arrastre.inicio;
  }

  protected alMover(e: PointerEvent): void {
    const a = this.arrastre;
    if (!a || a.id !== e.pointerId) return;
    const dx = e.clientX - a.x;
    if (!a.movido && Math.abs(dx) < 6) return;
    if (!a.movido) {
      a.movido = true;
      this.arrastrando.set(true);
    }
    this.posicionArrastre = palancaArrastrada(a.inicio, dx, this.escenario().nativeElement.clientWidth);
    this.escena?.posicion(this.posicionArrastre, true);
  }

  protected alSoltar(e: PointerEvent): void {
    const a = this.arrastre;
    if (!a || a.id !== e.pointerId) return;
    this.arrastre = null;
    if (!a.movido) {
      // Un toque sin arrastre voltea la palanca.
      this.alternar();
      return;
    }
    this.arrastrando.set(false);
    const prod = this.posicionArrastre >= 0.5;
    // Suelta: la palanca termina el viaje con su resorte, aunque el estado no cambie.
    this.escena?.posicion(prod ? 1 : 0);
    this.cambiar(prod);
  }

  protected alCancelar(e: PointerEvent): void {
    if (!this.arrastre || this.arrastre.id !== e.pointerId) return;
    this.arrastre = null;
    this.arrastrando.set(false);
    this.escena?.posicion(this.produccion() ? 1 : 0);
  }

  // ---- el inicio de sesión de juguete

  protected intentar(): void {
    if (this.bloqueado()) return;
    const siguiente = intentar({ intentos: this.intentos(), bloqueado: false }, this.produccion());
    this.intentos.set(siguiente.intentos);
    this.puntos.set(6 + Math.floor(Math.random() * (LIMITE_INTENTOS - 5)));
    this.sacudida.update((n) => n + 1);
    if (siguiente.bloqueado) {
      // El botón con el foco se deshabilita: el foco pasa al aviso en vez de perderse.
      const conFoco = this.documento.activeElement === this.botonEntrar()?.nativeElement;
      this.bloqueado.set(true);
      if (conFoco) this.enfocarDespues(this.botonReiniciar);
      this.mensaje.set(
        `Intento ${siguiente.intentos}: clave incorrecta. Llegaste al límite y el acceso se congela por un rato.`,
      );
      this.iniciarEspera();
    } else if (this.produccion()) {
      const quedan = LIMITE_INTENTOS - siguiente.intentos;
      this.mensaje.set(
        `Intento ${siguiente.intentos}: clave incorrecta. ${quedan === 1 ? 'Queda 1 intento' : `Quedan ${quedan} intentos`}.`,
      );
    } else {
      this.mensaje.set(`Intento ${siguiente.intentos}: clave incorrecta. Puedes seguir: no hay límite.`);
    }
  }

  protected reiniciar(): void {
    // El aviso desaparece: si el foco estaba en él, vuelve al botón de probar.
    const conFoco = this.documento.activeElement === this.botonReiniciar()?.nativeElement;
    if (conFoco) this.enfocarDespues(this.botonEntrar);
    this.pararReloj();
    this.intentos.set(0);
    this.bloqueado.set(false);
    this.espera.set(0);
    this.mensaje.set('');
  }

  private iniciarEspera(): void {
    this.pararReloj();
    this.espera.set(ESPERA_DEMO);
    this.reloj = setInterval(() => {
      const quedan = this.espera() - 1;
      if (quedan <= 0) {
        this.reiniciar();
        this.mensaje.set('La espera terminó: el contador volvió a cero.');
      } else {
        this.espera.set(quedan);
      }
    }, 1000);
  }

  private pararReloj(): void {
    if (this.reloj) clearInterval(this.reloj);
    this.reloj = null;
  }

  /** Enfoca el botón cuando ya esté en el DOM (aparece o se habilita en el siguiente render). */
  private enfocarDespues(boton: () => ElementRef<HTMLButtonElement> | undefined): void {
    afterNextRender(() => boton()?.nativeElement.focus(), { injector: this.inyector });
  }

  // ---- escena

  private posicionar(pos: Readonly<Record<AnclaInterruptor, PosicionAnclaInterruptor>>): void {
    for (let i = 0; i < this.anclas.length; i++) {
      const { id, el, izquierda } = this.anclas[i];
      const a = pos[id];
      if (!a) continue;
      el.classList.toggle('visible', a.visible);
      // La oculta no se mueve: así no se arma un texto nuevo por cuadro para nada.
      if (!a.visible) continue;
      el.style.transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px) translate(${izquierda ? '-24px' : '-50%'}, -100%)`;
    }
  }

  private colores(): ColoresInterruptor {
    const css = getComputedStyle(this.documento.documentElement);
    const t = (n: string, respaldo: string) => css.getPropertyValue(n).trim() || respaldo;
    return {
      fondo: t('--bg', '#0b0f1a'),
      linea: t('--line', '#38425f'),
      lineaSuave: t('--line-soft', '#252d44'),
      tinta: t('--ink', '#e8ecf6'),
      tinta3: t('--ink-3', '#9aa5bf'),
      senal: t('--signal', '#8b93ff'),
      indigo: t('--backbone-indigo', '#4f46e5'),
      violeta: t('--backbone-violeta', '#7c3aed'),
      exito: t('--backbone-exito', '#4ade9c'),
      aviso: t('--backbone-aviso', '#fbbf24'),
      ahdo: t('--backbone-ahdo', '#8b5ffc'),
      ocupasalud: t('--backbone-ocupasalud', '#0077bd'),
      superficie2: t('--surface-2', '#1a2136'),
    };
  }
}
