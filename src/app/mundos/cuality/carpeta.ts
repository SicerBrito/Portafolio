import { Component, computed, signal } from '@angular/core';

type Caso = 'equipo' | 'servidor' | 'arreglo';

interface Linea {
  nivel: number;
  texto: string;
  tipo: 'carpeta' | 'archivo' | 'falta' | 'nota';
}

const CASOS: Record<Caso, { titulo: string; lineas: Linea[]; resultado: string; bien: boolean }> = {
  equipo: {
    titulo: 'En el equipo de desarrollo',
    lineas: [
      { nivel: 0, texto: 'API/', tipo: 'carpeta' },
      { nivel: 1, texto: 'wwwroot/', tipo: 'carpeta' },
      { nivel: 2, texto: 'fotos de usuario', tipo: 'archivo' },
    ],
    resultado: 'La foto se guarda. La carpeta del proyecto web existe, así que nada falla.',
    bien: true,
  },
  servidor: {
    titulo: 'En el servidor',
    lineas: [
      { nivel: 0, texto: 'sitio publicado/', tipo: 'carpeta' },
      { nivel: 1, texto: 'wwwroot/ no existe', tipo: 'falta' },
    ],
    resultado: 'DirectoryNotFoundException: la carga de la foto falla.',
    bien: false,
  },
  arreglo: {
    titulo: 'Con el arreglo',
    lineas: [
      { nivel: 0, texto: 'sitio publicado/', tipo: 'carpeta' },
      { nivel: 1, texto: 'carpeta propia/ se crea si falta', tipo: 'carpeta' },
      { nivel: 2, texto: 'fotos de usuario', tipo: 'archivo' },
      { nivel: 1, texto: 'se sirve como contenido estático', tipo: 'nota' },
    ],
    resultado: 'La foto se guarda en una carpeta propia, junto a la aplicación, sin depender del proyecto web.',
    bien: true,
  },
};

/** "El error que solo aparecía en el servidor", con un selector de tres casos. */
@Component({
  selector: 'app-cuality-carpeta',
  template: `
    <fieldset class="selector">
      <legend class="solo-lectores">Dónde se guarda la foto</legend>
      @for (c of casos; track c.id) {
        <label [class.activo]="caso() === c.id">
          <input type="radio" name="carpeta-cuality" [value]="c.id" [checked]="caso() === c.id" (change)="caso.set(c.id)" />
          {{ c.titulo }}
        </label>
      }
    </fieldset>
    <div class="arbol" [class.mal]="!actual().bien">
      <ul>
        @for (l of actual().lineas; track l.texto) {
          <li [style.--nivel]="l.nivel" [attr.data-tipo]="l.tipo">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              @switch (l.tipo) {
                @case ('carpeta') {
                  <path d="M3 6h7l2 2h9v11H3z" />
                }
                @case ('archivo') {
                  <path d="M6 3h9l4 4v14H6zm3 12 3-4 2 3 1.5-2 2.5 3z" />
                }
                @case ('falta') {
                  <path d="M3 6h7l2 2h9v11H3zm6.5 4.5L12 13l2.5-2.5 1 1L13 14l2.5 2.5-1 1L12 15l-2.5 2.5-1-1L11 14l-2.5-2.5z" />
                }
                @default {
                  <path d="M4 12h12l-4-4 1.4-1.4L20 13l-6.6 6.4L12 18l4-4H4z" />
                }
              }
            </svg>
            <span>{{ l.texto }}</span>
          </li>
        }
      </ul>
      <p class="resultado" aria-live="polite">{{ actual().resultado }}</p>
    </div>
  `,
  styles: `
    :host {
      display: grid;
      gap: 14px;
      font-family: var(--cuality-fuente);
    }
    .selector {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 0;
      padding: 0;
      border: 0;
    }
    label {
      position: relative;
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 8px 14px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--surface);
      color: var(--ink-2);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
    }
    label.activo {
      background: var(--cuality-azul);
      border-color: var(--cuality-azul);
      color: #ffffff;
    }
    label:has(input:focus-visible) {
      outline: 2px solid var(--focus);
      outline-offset: 3px;
    }
    input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .arbol {
      padding: 16px 18px;
      border-radius: 14px;
      background: var(--cuality-noche);
      color: var(--cuality-noche-texto);
      border-left: 4px solid var(--cuality-azul-noche);
    }
    .arbol.mal {
      border-left-color: var(--cuality-gris-noche);
      border-left-style: dashed;
    }
    ul {
      display: grid;
      gap: 6px;
      margin: 0 0 12px;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-left: calc(var(--nivel) * 22px);
      font-family: var(--font-mono);
      font-size: 0.8125rem;
    }
    svg {
      width: 18px;
      height: 18px;
      flex: none;
      fill: var(--cuality-azul-noche);
    }
    li[data-tipo='falta'] svg {
      fill: var(--cuality-gris-noche);
    }
    li[data-tipo='falta'] span {
      text-decoration: line-through;
      color: var(--cuality-gris-noche);
    }
    li[data-tipo='nota'] span {
      color: var(--cuality-gris-noche);
    }
    .resultado {
      font-size: 0.875rem;
      line-height: 1.55;
      color: var(--cuality-noche-texto);
    }
  `,
})
export class CarpetaCuality {
  protected readonly casos = (Object.keys(CASOS) as Caso[]).map((id) => ({ id, titulo: CASOS[id].titulo }));
  protected readonly caso = signal<Caso>('servidor');
  protected readonly actual = computed(() => CASOS[this.caso()]);
}
