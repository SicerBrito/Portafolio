import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Movimiento } from '../../core/movimiento';
import { EMPRESAS, ETIQUETA_AUTORIA_MODULO, MODULOS, type EmpresaId, type ModuloMapa } from './datos';
import { ICONOS } from './iconos';
import { cargarGsap, reordenar } from './animacion';

interface Linea {
  clave: string;
  d: string;
  modulo: string;
  empresa: EmpresaId;
  piloto: boolean;
  color: string;
}

const LOGOS: Partial<Record<EmpresaId, { src: string; ancho: number; alto: number }>> = {
  ahdo: { src: '/marcas/ahdo/logo-ahdo-color.webp', ancho: 1200, alto: 213 },
  ocupasalud: { src: '/marcas/ahdo/logo-ocupasalud.webp', ancho: 493, alto: 143 },
  autoaprender: { src: '/marcas/ahdo/logo-autoaprender.webp', ancho: 522, alto: 245 },
  cuality: { src: '/marcas/ahdo/logo-cuality.webp', ancho: 225, alto: 225 },
};

/** Orden pensado para que las líneas se crucen lo menos posible. */
const ORDEN = ['certificados', 'cursos', 'qr', 'tarifarios', 'psicometria', 'recepcion', 'sincronizacion', 'facturacion', 'anexos', 'practica', 'masivo'];
const MODULOS_ORDENADOS = [...MODULOS].sort((a, b) => ORDEN.indexOf(a.id) - ORDEN.indexOf(b.id));

/**
 * La red de módulos y empresas: qué parte de AHDO usa cada empresa del grupo.
 * Se carga diferida; mientras tanto (y en el servidor) AhdoMapa muestra la misma lista en texto.
 */
@Component({
  selector: 'app-ahdo-red',
  imports: [NgOptimizedImage],
  templateUrl: './red.html',
  styleUrl: './red.scss',
})
export class AhdoRed {
  private readonly red = viewChild.required<ElementRef<HTMLElement>>('red');
  private readonly trazos = viewChild.required<ElementRef<SVGElement>>('trazos');
  private readonly movimiento = inject(Movimiento);

  protected readonly modulos = MODULOS_ORDENADOS;
  protected readonly empresas = EMPRESAS;
  protected readonly logos = LOGOS;
  protected readonly iconoEmpresa = ICONOS.empresa;
  protected readonly etiquetaAutoria = ETIQUETA_AUTORIA_MODULO;

  protected readonly empresaSel = signal<EmpresaId | null>(null);
  protected readonly moduloSel = signal<string | null>(null);
  protected readonly lineas = signal<Linea[]>([]);
  protected readonly caja = signal({ ancho: 1, alto: 1 });

  protected readonly modulosVivos = computed(() => {
    const m = this.moduloSel();
    if (m) return new Set([m]);
    const e = this.empresaSel();
    return e ? new Set(MODULOS.filter((x) => x.empresas.includes(e)).map((x) => x.id)) : null;
  });
  protected readonly empresasVivas = computed(() => {
    const m = this.moduloSel();
    if (m) return new Set(MODULOS.find((x) => x.id === m)?.empresas ?? []);
    const e = this.empresaSel();
    return e ? new Set([e]) : null;
  });
  protected readonly resumen = computed(() => {
    const e = this.empresaSel();
    if (!e) return '';
    const nombre = EMPRESAS.find((x) => x.id === e)?.nombre ?? '';
    const n = MODULOS.filter((x) => x.empresas.includes(e)).length;
    return `${nombre}: ${n} ${n === 1 ? 'módulo' : 'módulos'} resaltados.`;
  });

  constructor() {
    const destruccion = inject(DestroyRef);
    let vivo = true;
    destruccion.onDestroy(() => (vivo = false));

    afterNextRender(() => {
      const red = this.red().nativeElement;
      const medir = () => this.medir();
      const observador = new ResizeObserver(medir);
      observador.observe(red);
      destruccion.onDestroy(() => observador.disconnect());
      document.fonts?.ready.then(() => vivo && medir());
      if (!this.movimiento.reducido()) void this.dibujarConScroll(() => vivo, destruccion);
    });
  }

  protected nombreEmpresa(id: EmpresaId): string {
    return EMPRESAS.find((e) => e.id === id)?.nombre ?? id;
  }

  protected colorEmpresa(id: EmpresaId): string {
    return EMPRESAS.find((e) => e.id === id)?.color ?? 'var(--ink-3)';
  }

  protected alternarEmpresa(id: EmpresaId): void {
    this.moduloSel.set(null);
    this.empresaSel.update((actual) => (actual === id ? null : id));
  }

  protected alternarModulo(m: ModuloMapa): void {
    this.moduloSel.update((actual) => (actual === m.id ? null : m.id));
  }

  protected lineaViva(l: Linea): boolean {
    const m = this.moduloSel();
    if (m) return l.modulo === m;
    const e = this.empresaSel();
    return e ? l.empresa === e : false;
  }

  /** Une el borde derecho de cada módulo con el borde izquierdo de cada empresa a la que sirve. */
  private medir(): void {
    const red = this.red().nativeElement;
    const base = red.getBoundingClientRect();
    if (base.width < 1) return;
    const filas = new Map<string, DOMRect>();
    red.querySelectorAll<HTMLElement>('[data-modulo]').forEach((el) => filas.set(el.dataset['modulo'] ?? '', el.getBoundingClientRect()));
    const nodos = new Map<string, DOMRect>();
    red.querySelectorAll<HTMLElement>('[data-empresa]').forEach((el) => nodos.set(el.dataset['empresa'] ?? '', el.getBoundingClientRect()));
    const lineas: Linea[] = [];
    for (const m of MODULOS) {
      const a = filas.get(m.id);
      if (!a || a.width < 1) continue;
      for (const e of m.empresas) {
        const b = nodos.get(e);
        if (!b || b.width < 1) continue;
        const x1 = a.right - base.left + 8;
        const y1 = a.top + a.height / 2 - base.top;
        const x2 = b.left - base.left - 8;
        const y2 = b.top + b.height / 2 - base.top;
        if (x2 - x1 < 24) continue;
        const k = (x2 - x1) * 0.55;
        lineas.push({
          clave: `${m.id}-${e}`,
          d: `M${x1.toFixed(1)} ${y1.toFixed(1)}C${(x1 + k).toFixed(1)} ${y1.toFixed(1)} ${(x2 - k).toFixed(1)} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
          modulo: m.id,
          empresa: e,
          piloto: !!m.piloto,
          color: this.colorEmpresa(e),
        });
      }
    }
    this.caja.set({ ancho: base.width, alto: base.height });
    this.lineas.set(lineas);
  }

  /** Las líneas se dibujan con el scroll, como las conexiones del logo. */
  private async dibujarConScroll(vivo: () => boolean, destruccion: DestroyRef): Promise<void> {
    const { gsap, ScrollTrigger } = await cargarGsap();
    if (!vivo()) return;
    const red = this.red().nativeElement;
    const trazos = this.trazos().nativeElement;
    // Dentro de matchMedia: si el visitante activa el movimiento reducido, las líneas quedan dibujadas y quietas.
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const st = ScrollTrigger.create({
        trigger: red,
        start: 'top 80%',
        end: 'center 45%',
        onUpdate: (s) => trazos.style.setProperty('--trazo', s.progress.toFixed(3)),
        onLeave: () => trazos.style.setProperty('--trazo', '1'),
      });
      // Si la página ya viene más abajo, las líneas aparecen como corresponde al punto actual.
      trazos.style.setProperty('--trazo', st.progress.toFixed(3));
      return () => trazos.style.removeProperty('--trazo');
    });
    reordenar(ScrollTrigger);
    destruccion.onDestroy(() => mm.revert());
  }
}
