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
import { Router, RouterLink } from '@angular/router';
import { Movimiento } from '../core/movimiento';
import { Orientacion } from '../core/orientacion';
import { ENLACES, PROYECTOS, type Proyecto, type TipoAutoria } from '../contenido/proyectos';
import { Sello } from '../ui/sello';
import type { Autoria, EscenaEcosistema, NodoMapa, PosicionEtiqueta } from '../escenas/ecosistema';

const AUTORIA_EN_MAPA: Record<TipoAutoria, Autoria> = {
  'desde-cero': 'solida',
  principal: 'solida',
  base: 'base',
  relevo: 'base',
  participacion: 'alambre',
  produccion: 'alambre',
};

/** La pieza firma del inicio: los sistemas como naves de una planta, con su autoría y su estado a la vista. */
@Component({
  selector: 'app-mapa-ecosistema',
  imports: [RouterLink, Sello],
  templateUrl: './mapa-ecosistema.html',
  styleUrl: './mapa-ecosistema.scss',
})
export class MapaEcosistema {
  private readonly escenario = viewChild.required<ElementRef<HTMLElement>>('escenario');
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private readonly movimiento = inject(Movimiento);
  protected readonly orientacion = inject(Orientacion);
  private readonly router = inject(Router);
  private readonly raiz = inject(DOCUMENT).documentElement;

  protected readonly proyectos = PROYECTOS;
  protected readonly activo = signal(false);
  protected readonly pasando = signal<string | null>(null);
  protected readonly proyectoActivo = computed<Proyecto | undefined>(() =>
    PROYECTOS.find((p) => p.id === this.pasando()),
  );

  private escena: EscenaEcosistema | null = null;
  private etiquetas = new Map<string, HTMLElement>();
  private entrando = false;

  constructor() {
    const destruccion = inject(DestroyRef);
    let vivo = true;
    destruccion.onDestroy(() => {
      vivo = false;
      this.escena?.destruir();
    });

    afterNextRender(() => {
      const escenario = this.escenario().nativeElement;
      // three.js pesa: se descarga solo cuando el mapa se acerca a la pantalla.
      const observador = new IntersectionObserver(
        async (entradas) => {
          if (!entradas.some((e) => e.isIntersecting)) return;
          observador.disconnect();
          try {
            const { crearEcosistema } = await import('../escenas/ecosistema');
            if (!vivo) return;
            this.etiquetas = new Map(
              Array.from(escenario.querySelectorAll<HTMLElement>('[data-id]')).map((el) => [el.dataset['id'] ?? '', el]),
            );
            this.escena = crearEcosistema({
              lienzo: this.lienzo().nativeElement,
              nodos: PROYECTOS.map((p) => this.nodo(p)),
              enlaces: ENLACES.map((e) => ({ de: e.de, a: e.a, tipo: e.tipo })),
              colores: () => this.colores(),
              reducido: this.movimiento.reducido(),
              alPosicionar: (pos) => this.posicionar(pos),
              alPasar: (id) => this.pasando.set(id),
              alElegir: (id) => void this.entrar(id),
            });
            this.activo.set(true);
            const tema = matchMedia('(prefers-color-scheme: dark)');
            const refrescar = () => this.escena?.refrescarColores();
            tema.addEventListener('change', refrescar);
            destruccion.onDestroy(() => tema.removeEventListener('change', refrescar));
          } catch {
            // Sin WebGL el mapa queda como lista de enlaces: nada importante depende del 3D.
          }
        },
        { rootMargin: '250px' },
      );
      observador.observe(escenario);
      destruccion.onDestroy(() => observador.disconnect());
    });

    effect(() => {
      const i = this.orientacion.inclinacion();
      this.escena?.inclinar(i.x, i.y);
    });
  }

  protected pasar(id: string | null): void {
    this.pasando.set(id);
    this.escena?.resaltar(id);
  }

  protected async elegir(evento: MouseEvent, id: string): Promise<void> {
    if (!this.escena || evento.metaKey || evento.ctrlKey || evento.shiftKey) return;
    evento.preventDefault();
    await this.entrar(id);
  }

  private async entrar(id: string): Promise<void> {
    if (this.entrando) return;
    this.entrando = true;
    const etiqueta = this.etiquetas.get(id);
    if (etiqueta) {
      const r = etiqueta.getBoundingClientRect();
      this.raiz.style.setProperty('--vt-x', `${r.left + r.width / 2}px`);
      this.raiz.style.setProperty('--vt-y', `${r.top + r.height / 2}px`);
    }
    try {
      await this.escena?.entrar(id);
      await this.router.navigate(['/proyectos', id]);
    } finally {
      this.entrando = false;
    }
  }

  private posicionar(pos: Record<string, PosicionEtiqueta>): void {
    for (const [id, p] of Object.entries(pos)) {
      const el = this.etiquetas.get(id);
      if (!el) continue;
      el.style.visibility = p.visible ? 'visible' : 'hidden';
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  private nodo(p: Proyecto): NodoMapa {
    return { id: p.id, color: p.color, autoria: AUTORIA_EN_MAPA[p.autoria], estado: p.estado, ...p.mapa };
  }

  private colores() {
    const css = getComputedStyle(this.raiz);
    const token = (n: string) => css.getPropertyValue(n).trim();
    return {
      lineaSuave: token('--line-soft'),
      linea: token('--line'),
      tinta: token('--ink'),
      tinta3: token('--ink-3'),
      senal: token('--signal'),
    };
  }
}
