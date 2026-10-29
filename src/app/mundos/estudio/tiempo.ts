import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Movimiento } from '../../core/movimiento';
import { Orientacion } from '../../core/orientacion';
import { EscenaMotor } from './escena-motor';
import { ULTIMO_FOTOGRAMA, estadoEscena, segundos, tresCifras } from './motor';

type Modo = 'estatico' | 'fijado' | 'movil' | 'reducido';

/** Fotograma que se ve sin JavaScript y en el HTML prerenderizado: todo en pantalla, barra al 80 %. */
const FOTOGRAMA_INICIAL = 150;

/**
 * "Arrastra el tiempo": la escena real del motor, movida fotograma a fotograma.
 * El scroll elige el fotograma y la escena se calcula, sin animación ni reloj, igual que en el motor.
 * Escritorio: la sección se fija y el scroll recorre los 300 fotogramas.
 * Móvil: la escena queda pegada arriba y el scroll la recorre debajo.
 * Movimiento reducido o pantalla baja: el deslizador y los botones mandan.
 */
@Component({
  selector: 'app-estudio-tiempo',
  imports: [EscenaMotor],
  templateUrl: './tiempo.html',
  styleUrl: './tiempo.scss',
})
export class TiempoEstudio {
  private readonly pista = viewChild.required<ElementRef<HTMLElement>>('pista');
  protected readonly orientacion = inject(Orientacion);
  private readonly movimiento = inject(Movimiento);
  private readonly documento = inject(DOCUMENT);

  protected readonly ultimo = ULTIMO_FOTOGRAMA;
  /** La línea de tiempo en miniatura: diez fotogramas repartidos en los 10 segundos. */
  protected readonly miniaturas = Array.from({ length: 10 }, (_, i) =>
    Math.round((i * ULTIMO_FOTOGRAMA) / 9),
  );
  protected readonly fotograma = signal(FOTOGRAMA_INICIAL);
  protected readonly separadas = signal(false);
  protected readonly siguiendo = signal(false);
  protected readonly punteroFino = signal(false);
  protected readonly modo = signal<Modo>('estatico');
  protected readonly salto = signal<number | null>(null);

  protected readonly e = computed(() => estadoEscena(this.fotograma(), this.separadas()));
  protected readonly cifras = computed(() => tresCifras(this.fotograma()));
  protected readonly tiempo = computed(() => segundos(this.fotograma()));
  protected readonly valorTexto = computed(
    () => `Fotograma ${this.fotograma()} de ${ULTIMO_FOTOGRAMA}, ${this.tiempo()} segundos`,
  );
  /** Barra y número coinciden si salen del mismo valor; con curvas separadas, no. */
  protected readonly desfase = computed(() =>
    Math.round(this.e().valorBarra - this.e().anchoBarra),
  );
  /** Con movimiento reducido no se ofrece: seguir la inclinación sería otra forma de scrub. */
  protected readonly puedeInclinar = computed(
    () =>
      this.modo() !== 'reducido' &&
      (this.punteroFino() || this.orientacion.giroscopio() !== 'no-disponible'),
  );
  protected readonly textoInclinar = computed(() =>
    this.orientacion.giroscopio() === 'no-disponible'
      ? 'Mover con el mouse'
      : 'Inclinar el celular',
  );

  constructor() {
    const destruccion = inject(DestroyRef);
    let vivo = true;
    let deshacer: (() => void) | null = null;
    destruccion.onDestroy(() => {
      vivo = false;
      deshacer?.();
    });

    afterNextRender(() => {
      this.punteroFino.set(matchMedia('(pointer: fine)').matches);
      if (this.movimiento.reducido()) {
        this.fijarModo('reducido');
        return;
      }
      void this.montarScroll(() => vivo).then((d) => {
        if (vivo) deshacer = d;
        else d?.();
      });
    });

    // La inclinación (giroscopio o mouse) recorre los fotogramas mientras el interruptor esté prendido.
    effect(() => {
      if (!this.siguiendo()) return;
      const x = this.orientacion.inclinacion().x;
      this.fotograma.set(Math.round(((x + 1) / 2) * ULTIMO_FOTOGRAMA));
    });
  }

  protected mover(evento: Event): void {
    this.siguiendo.set(false);
    this.fotograma.set(Number((evento.target as HTMLInputElement).value));
  }

  protected irA(f: number): void {
    this.siguiendo.set(false);
    this.fotograma.set(f);
  }

  protected paso(delta: number): void {
    this.siguiendo.set(false);
    this.fotograma.update((f) => Math.min(ULTIMO_FOTOGRAMA, Math.max(0, f + delta)));
  }

  /** Un salto sin transición: el fotograma aparece calculado, no animado hacia él. */
  protected saltar(): void {
    this.siguiendo.set(false);
    let f = Math.floor(Math.random() * (ULTIMO_FOTOGRAMA + 1));
    if (f === this.fotograma()) f = (f + 97) % (ULTIMO_FOTOGRAMA + 1);
    this.fotograma.set(f);
    this.salto.set(f);
  }

  protected async alternarInclinacion(): Promise<void> {
    if (!this.siguiendo() && this.orientacion.giroscopio() === 'pedir')
      await this.orientacion.activar();
    this.siguiendo.update((v) => !v);
  }

  /** La clase va directo al elemento: el pin mide el diseño en el acto, antes del ciclo de Angular. */
  private fijarModo(modo: Modo): void {
    const pista = this.pista().nativeElement;
    pista.classList.toggle('fijado', modo === 'fijado');
    pista.classList.toggle('movil', modo === 'movil');
    this.modo.set(modo);
  }

  private async montarScroll(vivo: () => boolean): Promise<(() => void) | null> {
    try {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (!vivo()) return null;
      gsap.registerPlugin(ScrollTrigger);
      const pista = this.pista().nativeElement;
      const cabecera = () =>
        parseFloat(
          getComputedStyle(this.documento.documentElement).getPropertyValue('--cabecera'),
        ) || 64;
      // El scroll manda directo (sin suavizado): la misma posición da siempre el mismo fotograma.
      const alScroll = (p: number) => {
        if (this.siguiendo()) return;
        const f = Math.round(p * ULTIMO_FOTOGRAMA);
        if (f !== this.fotograma()) this.fotograma.set(f);
      };
      const mm = gsap.matchMedia();

      // 640 px de alto como mínimo: con el error a la vista, fórmulas y controles miden unos
      // 480 px y tienen que caber en la sección fijada (alto de la ventana menos 128 px).
      mm.add('(min-width: 960px) and (min-height: 640px)', () => {
        this.fijarModo('fijado');
        ScrollTrigger.create({
          trigger: pista,
          start: () => `top top+=${cabecera()}`,
          end: '+=260%',
          pin: true,
          anticipatePin: 1,
          // Esta sección va antes que la tira 3D: se recalcula primero para que su espacio cuente.
          refreshPriority: 2,
          invalidateOnRefresh: true,
          onUpdate: (self) => alScroll(self.progress),
        });
        return () => this.fijarModo('estatico');
      });

      // 600 px de alto como mínimo: la escena pegada (pantalla, deslizador, fórmulas y
      // controles) mide unos 510 px a 375 de ancho y tiene que caber entera bajo la cabecera.
      mm.add('(max-width: 959.98px) and (min-height: 600px)', () => {
        this.fijarModo('movil');
        ScrollTrigger.create({
          trigger: pista,
          start: () => `top top+=${cabecera() + 8}`,
          end: 'bottom bottom',
          refreshPriority: 2,
          invalidateOnRefresh: true,
          onUpdate: (self) => alScroll(self.progress),
        });
        return () => this.fijarModo('estatico');
      });

      void this.documento.fonts?.ready.then(() => {
        if (vivo()) ScrollTrigger.refresh();
      });
      return () => mm.revert();
    } catch {
      return null;
    }
  }
}
