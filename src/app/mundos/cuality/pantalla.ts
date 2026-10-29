import { Component, computed, input } from '@angular/core';
import { ARBOL, type NodoArbol, type Permiso } from './contenido';

interface Entrada {
  nodo: NodoArbol;
  hijos: NodoArbol[];
}

/**
 * La pantalla de ejemplo que arma el menú con las llaves del usuario, como lo hace la base:
 * el backend devuelve solo los nodos con permiso (si falta el módulo, la página sube al primer
 * nivel) y los botones aparecen con una directiva que pregunta por su permiso.
 */
@Component({
  selector: 'app-cuality-pantalla',
  template: `
    <div class="pantalla">
      <div class="cabeza">
        <span class="marca"><i></i>Cuality</span>
        <span class="usuario">Usuario de ejemplo</span>
      </div>
      <div class="cuerpo">
        <nav class="menu" aria-label="Menú de ejemplo">
          @for (e of menu(); track e.nodo.id) {
            <div class="grupo">
              <span class="item" [class.modulo]="e.nodo.tipo === 'modulo'">{{ e.nodo.nombre }}</span>
              @for (h of e.hijos; track h.id) {
                <span class="item hijo" [class.activo]="h.id === vista()?.id">{{ h.nombre }}</span>
              }
            </div>
          } @empty {
            <span class="nada">Sin pantallas</span>
          }
        </nav>
        <div class="contenido">
          @if (vista(); as v) {
            <p class="titulo">{{ v.nombre }}</p>
            <div class="botones">
              @for (b of botones(); track b.id) {
                <span class="boton">{{ b.nombre }}</span>
              } @empty {
                <span class="solo-ver">Solo lectura: no tiene llaves para sus botones</span>
              }
            </div>
            <span class="filas" aria-hidden="true"><i></i><i></i><i></i></span>
          } @else {
            <p class="vacio">Con estas llaves no se ve ninguna página.</p>
          }
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      font-family: var(--cuality-fuente);
    }
    .pantalla {
      overflow: hidden;
      border-radius: 10px;
      background: var(--bg);
      color: var(--cuality-tinta);
      box-shadow: 0 18px 40px -20px rgba(0, 0, 0, 0.55);
    }
    .cabeza {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 12px;
      background: var(--cuality-azul);
      color: #ffffff;
      font-size: 0.8125rem;
    }
    .marca {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
    }
    .marca i {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #ffffff;
    }
    .usuario {
      font-size: 0.75rem;
    }
    .cuerpo {
      display: grid;
      grid-template-columns: minmax(104px, 0.8fr) minmax(0, 1.4fr);
      min-height: 170px;
    }
    .menu {
      display: grid;
      align-content: start;
      gap: 6px;
      padding: 10px 8px;
      background: #ffffff;
      border-right: 1px solid var(--line);
    }
    .grupo {
      display: grid;
      gap: 2px;
    }
    .item {
      padding: 3px 8px;
      font-size: 0.75rem;
      color: var(--ink-2);
      border-left: 3px solid transparent;
      animation: aparecer 260ms var(--ease-out) both;
    }
    .item.modulo {
      font-weight: 600;
      color: var(--ink);
    }
    .item.hijo {
      padding-left: 14px;
    }
    .item.activo {
      color: var(--cuality-azul);
      font-weight: 600;
      border-left-color: var(--cuality-azul);
      background: var(--cuality-claro);
    }
    .nada,
    .vacio,
    .solo-ver {
      font-size: 0.75rem;
      color: var(--ink-3);
    }
    .contenido {
      display: grid;
      align-content: start;
      gap: 10px;
      padding: 12px;
    }
    .titulo {
      font-weight: 600;
      font-size: 0.9375rem;
      color: var(--ink);
    }
    .botones {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .boton {
      padding: 4px 10px;
      border-radius: 6px;
      background: var(--cuality-azul);
      color: #ffffff;
      font-size: 0.75rem;
      font-weight: 600;
      animation: aparecer 260ms var(--ease-out) both;
    }
    .filas {
      display: grid;
      gap: 6px;
    }
    .filas i {
      height: 10px;
      border-radius: 3px;
      background: var(--line-soft);
    }
    @keyframes aparecer {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
    }
  `,
})
export class PantallaCuality {
  readonly llaves = input.required<ReadonlySet<Permiso>>();

  /** Lo que devuelve el menú: módulos con permiso y sus páginas; una página huérfana sube de nivel. */
  protected readonly menu = computed<Entrada[]>(() => {
    const ll = this.llaves();
    const visibles = ARBOL.filter((n) => n.tipo !== 'boton' && ll.has(n.permiso));
    const ids = new Set(visibles.map((n) => n.id));
    const raiz = visibles.filter((n) => !n.padre || !ids.has(n.padre));
    return raiz.map((nodo) => ({
      nodo,
      hijos: nodo.tipo === 'modulo' ? visibles.filter((h) => h.padre === nodo.id) : [],
    }));
  });

  /** La página que se muestra: la primera visible, en el orden del menú. */
  protected readonly vista = computed<NodoArbol | null>(() => {
    for (const e of this.menu()) {
      if (e.nodo.tipo === 'pagina') return e.nodo;
      const hija = e.hijos.find((h) => ARBOL.some((b) => b.padre === h.id));
      if (hija) return hija;
    }
    for (const e of this.menu()) if (e.hijos[0]) return e.hijos[0];
    return null;
  });

  protected readonly botones = computed(() => {
    const v = this.vista();
    const ll = this.llaves();
    return v ? ARBOL.filter((b) => b.padre === v.id && ll.has(b.permiso)) : [];
  });
}
