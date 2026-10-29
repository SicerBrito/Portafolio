import { Component } from '@angular/core';

/** Líneas que dejó cada autor en git (investigación verificada): unas 9.950 del otro desarrollador, 218 mías. */
const LINEAS_ORIGEN = 9950;
const LINEAS_MIAS = 218;

/** Quién hizo qué, en líneas de git: la barra del otro desarrollador frente a la mía, a escala. */
@Component({
  selector: 'app-backbone-autores',
  template: `
    <div class="shortlog" role="group" aria-label="Líneas aportadas por cada autor hasta el despliegue, según git">
      <div class="autor autor-otro">
        <p>
          <b>Otro desarrollador: lo creó</b>
          <span>3 commits y unas {{ lineasOrigenTexto }} líneas añadidas, el martes 20</span>
        </p>
        <span class="barra-autor" aria-hidden="true"><i style="width: 100%"></i></span>
      </div>
      <div class="autor autor-mio">
        <p>
          <b>Yo: lo recibí, lo audité, lo endurecí y lo desplegué</b>
          <span>1 commit, {{ lineasMias }} líneas añadidas y 63 quitadas en 16 archivos, el jueves 22</span>
        </p>
        <span class="barra-autor" aria-hidden="true"><i [style.width.%]="proporcionMia"></i></span>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .shortlog {
      display: grid;
      gap: 16px;
      max-width: 820px;
    }

    .autor {
      display: grid;
      gap: 6px;
    }
    .autor p {
      display: flex;
      flex-wrap: wrap;
      gap: 2px 12px;
      align-items: baseline;
    }
    .autor b {
      font-weight: 700;
    }
    .autor p span {
      color: var(--ink-2);
      font-size: 0.9375rem;
    }

    .barra-autor {
      display: block;
      height: 16px;
      border-radius: 4px;
      background: var(--line-soft);
      overflow: hidden;
    }
    .barra-autor i {
      display: block;
      height: 100%;
      min-width: 5px;
      border-radius: 4px;
    }

    .autor-otro .barra-autor i {
      background: var(--ink-3);
    }
    .autor-mio .barra-autor i {
      background: var(--backbone-degradado);
    }
  `,
})
export class AutoresBackbone {
  // Escrito a mano y no con toLocaleString: el prerender y el navegador deben dar el mismo texto.
  protected readonly lineasOrigenTexto = '9.950';
  protected readonly lineasMias = LINEAS_MIAS;
  protected readonly proporcionMia = (LINEAS_MIAS / (LINEAS_MIAS + LINEAS_ORIGEN)) * 100;
}
