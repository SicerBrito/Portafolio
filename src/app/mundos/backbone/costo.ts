import { Component, computed, signal } from '@angular/core';

interface ModeloCosto {
  id: string;
  nombre: string;
  /** Lo que mostraba el tablero viejo frente al costo real (1 = igual). Proporción aproximada. */
  antes: number;
  nota: string;
}

const MODELOS: ModeloCosto[] = [
  {
    id: 'haiku',
    nombre: 'Claude Haiku 4.5',
    antes: 1,
    nota: 'Con el modelo por defecto, el número cuadraba: el tablero calculaba todo con esta tarifa.',
  },
  {
    id: 'sonnet',
    nombre: 'Claude Sonnet 5.5',
    antes: 0.5,
    nota: 'Con este modelo, el tablero viejo mostraba más o menos la mitad del costo real, porque seguía usando la tarifa de Haiku 4.5. Nada fallaba y el número parecía razonable.',
  },
];

/** El costo que mentía a la mitad: el visitante cambia de modelo y compara las dos barras. */
@Component({
  selector: 'app-backbone-costo',
  template: `
    <div class="costo">
      <fieldset>
        <legend>Modelo que responde</legend>
        <div class="modelos">
          @for (m of modelos; track m.id) {
            <label [class.elegido]="m.id === modelo().id">
              <input type="radio" name="bb-modelo" [value]="m.id" [checked]="m.id === modelo().id" (change)="elegir(m)" />
              {{ m.nombre }}
            </label>
          }
        </div>
      </fieldset>

      <div class="barras">
        <div class="fila">
          <span class="nombre">Lo que mostraba el tablero antes</span>
          <span class="pista"><i class="antes" [style.width.%]="antesPct()"></i></span>
          <span class="valor">{{ antesTexto() }}</span>
        </div>
        <div class="fila">
          <span class="nombre">Lo que muestra ahora, con la tarifa de su modelo</span>
          <span class="pista"><i class="ahora" style="width: 100%"></i></span>
          <span class="valor">el costo real</span>
        </div>
      </div>

      <p class="nota" aria-live="polite">{{ modelo().nota }}</p>
      <p class="aparte">
        Proporciones aproximadas, sin tarifas ni cifras de uso. Al mismo arreglo se sumó un aviso en la configuración:
        con Sonnet 5.5 hay que subir el máximo de tokens, porque el razonamiento del modelo se comía el tope y la
        respuesta salía cortada sin decir nada.
      </p>
    </div>
  `,
  styles: `
    :host {
      display: block;
      font-family: var(--backbone-fuente);
    }
    /* Columna explícita: sin ella, la columna automática crece al min-content de los hijos. */
    .costo {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 16px;
      padding: 18px;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: var(--surface);
    }
    fieldset {
      margin: 0;
      padding: 0;
      border: 0;
      min-width: 0;
    }
    legend {
      margin-bottom: 8px;
      color: var(--ink-3);
      font-size: 0.875rem;
    }
    .modelos {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    label {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 6px 14px;
      border: 1px solid var(--line);
      border-radius: 10px;
      color: var(--ink);
      font-weight: 500;
      cursor: pointer;
    }
    label.elegido {
      border-color: var(--signal);
      background: var(--backbone-marca-suave);
    }
    label:has(input:focus-visible) {
      outline: 2px solid var(--focus);
      outline-offset: 3px;
    }
    input {
      accent-color: var(--signal);
      width: 18px;
      height: 18px;
      margin: 0;
    }
    .barras {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 12px;
    }
    .fila {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 4px 12px;
      align-items: center;
    }
    .nombre {
      color: var(--ink-2);
      font-size: 0.9375rem;
    }
    .valor {
      color: var(--ink);
      font-family: var(--backbone-mono);
      font-size: 0.875rem;
    }
    .pista {
      grid-column: 1 / -1;
      grid-row: 2;
      height: 14px;
      border-radius: 4px;
      background: var(--line-soft);
      overflow: hidden;
    }
    .pista i {
      display: block;
      height: 100%;
      border-radius: 4px;
      transition: width 600ms var(--ease-out);
    }
    .antes {
      background: var(--backbone-aviso);
    }
    .ahora {
      background: var(--backbone-degradado);
    }
    .nota {
      color: var(--ink);
    }
    .aparte {
      color: var(--ink-3);
      font-size: 0.875rem;
    }
    @media (prefers-reduced-motion: reduce) {
      .pista i {
        transition: none;
      }
    }
  `,
})
export class CostoBackbone {
  protected readonly modelos = MODELOS;
  protected readonly modelo = signal<ModeloCosto>(MODELOS[0]);
  protected readonly antesPct = computed(() => this.modelo().antes * 100);
  protected readonly antesTexto = computed(() => (this.modelo().antes === 1 ? 'igual' : 'la mitad, más o menos'));

  protected elegir(m: ModeloCosto): void {
    this.modelo.set(m);
  }
}
