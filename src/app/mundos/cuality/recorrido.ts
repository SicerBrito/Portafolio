import {
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Movimiento } from '../../core/movimiento';
import { Orientacion } from '../../core/orientacion';
import type { AnclaArbol, ColoresArbol, EscenaArbol, PosicionAncla } from '../../escenas/cuality/arbol';
import { ARBOL, GRUPOS, LLAVES, LLAVES_DEL_ROL, LLAVES_DIRECTAS, MOMENTOS, PASOS, type Permiso } from './contenido';
import { PantallaCuality } from './pantalla';

type Modo = 'estatico' | 'fijado' | 'pasos' | 'reducido';

const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const DEL_ROL: ReadonlySet<Permiso> = new Set(LLAVES_DEL_ROL);
const DEL_EJEMPLO: ReadonlySet<Permiso> = new Set([...LLAVES_DEL_ROL, ...LLAVES_DIRECTAS]);
const NINGUNA: ReadonlySet<Permiso> = new Set();
const RADIO_SVG = { modulo: 74, pagina: 118, boton: 156 } as const;

/** El dibujo plano del sello, para cuando no hay 3D: mismas posiciones que la escena. */
const PLANO = ARBOL.map((n) => {
  const a = (n.angulo * Math.PI) / 180;
  const r = RADIO_SVG[n.tipo];
  const padre = ARBOL.find((x) => x.id === n.padre);
  const ap = padre ? (padre.angulo * Math.PI) / 180 : a;
  const rp = padre ? RADIO_SVG[padre.tipo] : 46;
  return {
    id: n.id,
    nombre: n.nombre,
    tipo: n.tipo,
    encendido: DEL_EJEMPLO.has(n.permiso),
    x: 200 + Math.sin(a) * r,
    y: 200 - Math.cos(a) * r,
    px: 200 + Math.sin(ap) * rp,
    py: 200 - Math.cos(ap) * rp,
  };
});

/**
 * "La llave arma el menú": el sello visto desde arriba se inclina y se vuelve un árbol.
 * Escritorio: la sección se fija y el scroll recorre la escena (pin + scrub); al final, las llaves
 * y la pantalla de ejemplo quedan a la mano. Móvil: la escena queda pegada arriba y cada paso la
 * mueve; las llaves están en el último paso. Movimiento reducido: un cuadro fijo por paso.
 */
@Component({
  selector: 'app-cuality-recorrido',
  imports: [NgTemplateOutlet, PantallaCuality],
  templateUrl: './recorrido.html',
  styleUrl: './recorrido.scss',
})
export class RecorridoCuality {
  private readonly raiz = viewChild.required<ElementRef<HTMLElement>>('raiz');
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly barra = viewChild.required<ElementRef<HTMLElement>>('barra');
  protected readonly orientacion = inject(Orientacion);
  private readonly movimiento = inject(Movimiento);
  protected readonly reducido = this.movimiento.reducido;
  private readonly documento = inject(DOCUMENT);

  protected readonly pasos = PASOS;
  protected readonly grupos = GRUPOS;
  protected readonly llavesCatalogo = LLAVES;
  protected readonly plano = PLANO;
  protected readonly delRol = DEL_ROL;
  protected readonly modo = signal<Modo>('estatico');
  protected readonly activo3d = signal(false);
  protected readonly pasoActivo = signal(0);
  /** Las llaves del usuario de ejemplo. Antes de JavaScript, las del ejemplo completo. */
  protected readonly llaves = signal<ReadonlySet<Permiso>>(DEL_EJEMPLO);
  /** El visitante tomó el llavero: el scroll ya no cambia las llaves. */
  protected readonly manual = signal(false);
  protected readonly registro = signal<readonly string[]>([]);

  private escena: EscenaArbol | null = null;
  private progreso = 0;
  private anclas: { id: AnclaArbol; el: HTMLElement }[] = [];

  constructor() {
    const destruccion = inject(DestroyRef);
    let vivo = true;
    let deshacerScroll: (() => void) | null = null;
    destruccion.onDestroy(() => {
      vivo = false;
      deshacerScroll?.();
      this.escena?.destruir();
      this.escena = null;
    });

    afterNextRender(() => {
      const raiz = this.raiz().nativeElement;
      this.anclas = Array.from(raiz.querySelectorAll<HTMLElement>('[data-ancla]')).map((el) => ({
        id: (el.dataset['ancla'] ?? '') as AnclaArbol,
        el,
      }));
      const reducido = this.movimiento.reducido();

      if (reducido) {
        this.fijarModo('reducido');
        this.irAPaso(0);
      } else {
        void this.montarScroll(() => vivo).then((deshacer) => {
          if (vivo) deshacerScroll = deshacer;
          else deshacer?.();
        });
      }

      // three.js pesa: se descarga solo cuando el sello se acerca a la pantalla.
      const observador = new IntersectionObserver(
        async (entradas) => {
          if (!entradas.some((e) => e.isIntersecting)) return;
          observador.disconnect();
          try {
            const { crearArbol } = await import('../../escenas/cuality/arbol');
            if (!vivo) return;
            this.escena = crearArbol({
              lienzo: this.lienzo().nativeElement,
              reducido,
              logo: '/marcas/cuality/logo-cuality.webp',
              colores: () => this.colores(),
              alPosicionar: (pos) => this.posicionar(pos),
            });
            this.escena.llaves(this.llaves(), DEL_ROL);
            this.escena.progreso(this.progreso);
            this.activo3d.set(true);
            void this.documento.fonts?.ready.then(() => {
              if (vivo) this.escena?.redibujarTextos();
            });
          } catch {
            // Sin WebGL quedan el dibujo del sello, los pasos y el llavero: nada depende del 3D.
          }
        },
        { rootMargin: '400px' },
      );
      observador.observe(raiz);
      destruccion.onDestroy(() => observador.disconnect());
    });

    effect(() => {
      const i = this.orientacion.inclinacion();
      if (this.reducido()) return;
      this.escena?.inclinar(i.x, i.y);
    });
  }

  protected irAPaso(i: number): void {
    const n = limitar(i, 0, PASOS.length - 1);
    this.pasoActivo.set(n);
    this.aplicar(PASOS[n].momento);
  }

  protected activarGiroscopio(): void {
    void this.orientacion.activar();
  }

  /** El visitante cambia una llave: la caché del ejemplo se vuelve a llenar y la política se forja otra vez. */
  protected alternar(codigo: Permiso): void {
    this.manual.set(true);
    const nuevas = new Set(this.llaves());
    const entra = !nuevas.has(codigo);
    if (entra) nuevas.add(codigo);
    else nuevas.delete(codigo);
    this.llaves.set(nuevas);
    this.escena?.llaves(nuevas, DEL_ROL);
    this.escena?.forjar(entra ? codigo : undefined);
    // Los detalles de vigencia e invalidación de la caché real no se cuentan aquí: el ejemplo solo
    // muestra la idea (la llave entra o sale, la política se crea al vuelo, el menú cambia).
    const linea = entra
      ? `${codigo} entra al llavero. La política ${codigo} se crea al vuelo y el menú suma lo que esa llave abre.`
      : `${codigo} sale del llavero y lo que pedía esa llave deja de llegar al menú.`;
    this.registro.update((r) => [linea, ...r].slice(0, 3));
  }

  protected restablecer(): void {
    this.llaves.set(DEL_EJEMPLO);
    this.escena?.llaves(DEL_EJEMPLO, DEL_ROL);
    this.escena?.forjar();
    this.registro.set(['Vuelven las llaves del usuario de ejemplo: cuatro de su rol y una directa.']);
  }

  /** La clase va directo al elemento: el pin mide el diseño en el acto, antes del ciclo de Angular. */
  private fijarModo(modo: Modo): void {
    const raiz = this.raiz().nativeElement;
    raiz.classList.toggle('vivo', modo !== 'estatico');
    raiz.classList.toggle('fijado', modo === 'fijado');
    raiz.classList.toggle('pasos-movil', modo === 'pasos');
    raiz.classList.toggle('reducido', modo === 'reducido');
    this.modo.set(modo);
  }

  private async montarScroll(vivo: () => boolean): Promise<(() => void) | null> {
    try {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
      if (!vivo()) return null;
      gsap.registerPlugin(ScrollTrigger);
      const raiz = this.raiz().nativeElement;
      const cabecera = () =>
        parseFloat(getComputedStyle(this.documento.documentElement).getPropertyValue('--cabecera')) || 64;
      const mm = gsap.matchMedia();

      mm.add('(min-width: 960px)', () => {
        this.fijarModo('fijado');
        const proxy = { p: this.progreso };
        this.aplicar(proxy.p);
        gsap.to(proxy, {
          p: 1,
          ease: 'none',
          onUpdate: () => this.aplicar(proxy.p),
          scrollTrigger: {
            trigger: raiz,
            start: () => `top top+=${cabecera()}`,
            end: '+=440%',
            pin: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        return () => this.fijarModo('estatico');
      });

      mm.add('(max-width: 959.98px)', () => {
        this.fijarModo('pasos');
        const proxy = { p: this.progreso };
        this.aplicar(proxy.p);
        // Un solo disparador para toda la lista: el paso activo es el último que cruzó la línea
        // de lectura, debajo de la escena pegada. Así también acierta si el scroll salta.
        const lista = Array.from(raiz.querySelectorAll<HTMLElement>('.paso'));
        let actual = -1;
        const elegir = () => {
          const linea = window.innerHeight * 0.66;
          let i = 0;
          for (let k = 0; k < lista.length; k++) if (lista[k].getBoundingClientRect().top <= linea) i = k;
          if (i === actual) return;
          actual = i;
          this.pasoActivo.set(i);
          gsap.to(proxy, {
            p: PASOS[i].momento,
            duration: 1.6,
            ease: 'power2.inOut',
            overwrite: true,
            onUpdate: () => this.aplicar(proxy.p),
          });
        };
        ScrollTrigger.create({
          trigger: raiz.querySelector('.pasos') ?? raiz,
          start: 'top bottom',
          end: 'bottom top',
          onUpdate: elegir,
          onRefresh: elegir,
        });
        return () => {
          gsap.killTweensOf(proxy);
          this.fijarModo('estatico');
        };
      });

      void this.documento.fonts?.ready.then(() => {
        if (vivo()) ScrollTrigger.refresh();
      });
      return () => mm.revert();
    } catch {
      return null;
    }
  }

  /** Un cuadro del recorrido: escena, llaves del guion, barra y paso activo. */
  private aplicar(p: number): void {
    this.progreso = p;
    this.escena?.progreso(p);
    const raiz = this.raiz().nativeElement;
    raiz.classList.toggle('con-llaves', p >= MOMENTOS.llavero - 0.02);
    raiz.classList.toggle('con-menu', p >= MOMENTOS.arbol);
    this.barra().nativeElement.style.transform = `scaleX(${p.toFixed(4)})`;

    // Mientras el visitante no toque el llavero, el guion decide las llaves.
    if (!this.manual()) {
      const deseadas = p >= MOMENTOS.llavero - 0.04 ? DEL_EJEMPLO : NINGUNA;
      if (deseadas !== this.llaves()) {
        this.llaves.set(deseadas);
        this.escena?.llaves(deseadas, DEL_ROL);
      }
    }

    if (this.modo() === 'fijado') {
      let i = PASOS.length - 1;
      while (i > 0 && p < PASOS[i].desde) i--;
      if (i !== this.pasoActivo()) this.pasoActivo.set(i);
    }
  }

  private posicionar(pos: Readonly<Record<AnclaArbol, PosicionAncla>>): void {
    for (let i = 0; i < this.anclas.length; i++) {
      const { id, el } = this.anclas[i];
      const p = pos[id];
      if (!p) continue;
      el.classList.toggle('visible', p.visible);
      // Una etiqueta oculta no se mueve: así no se arma un texto de transform por cuadro para nada.
      if (!p.visible) continue;
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  private colores(): ColoresArbol {
    const css = getComputedStyle(this.documento.documentElement);
    const t = (n: string, respaldo: string) => css.getPropertyValue(n).trim() || respaldo;
    return {
      azul: t('--cuality-azul', '#0060a3'),
      azulLogo: t('--cuality-azul-logo', '#0066a8'),
      azulNoche: t('--cuality-azul-noche', '#8fc4ee'),
      gris: t('--cuality-gris', '#5a5a5a'),
      grisNoche: t('--cuality-gris-noche', '#a9b4c2'),
      noche: t('--cuality-noche', '#1f2430'),
      noche2: t('--cuality-noche-2', '#283041'),
      blanco: t('--cuality-noche-texto', '#f3f5f7'),
    };
  }
}
