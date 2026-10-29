import { Component, signal } from '@angular/core';

/**
 * "Vestir la plataforma de dorado": la misma pantalla con lo que traía la interfaz antes del tema
 * (los colores por defecto de Bootstrap 5.3: azul #0D6EFD, texto #212529 y la letra del sistema;
 * el styles.css previo solo importaba ng-select y bootstrap-icons) y con el tema de Prevent que
 * escribí (dorado de marca, degradado y Poppins). Es una maqueta: los datos son ficticios.
 */
@Component({
  selector: 'app-prevent-tema',
  template: `
    <div class="tema" [attr.data-tema]="dorado() ? 'prevent' : 'heredado'">
      <button
        type="button"
        class="interruptor"
        role="switch"
        [attr.aria-checked]="dorado()"
        (click)="dorado.set(!dorado())"
      >
        <span class="pista" aria-hidden="true"><i></i></span>
        <span>Tema de Prevent</span>
      </button>
      <p class="estado" aria-live="polite">{{ dorado() ? 'La maqueta con el tema que escribí.' : 'La misma maqueta con los colores por defecto de Bootstrap, los que traía la interfaz.' }}</p>

      <div class="pantalla" aria-label="Maqueta de la pantalla de solicitudes, con datos ficticios" role="img">
        <div class="cabeza">
          <span class="marca"><i></i>{{ dorado() ? 'PreventGroup' : 'Plataforma' }}</span>
          <span class="usuario"></span>
        </div>
        <div class="cuerpo">
          <div class="menu">
            <span class="item activo">Solicitudes</span>
            <span class="item">Matrículas</span>
            <span class="item">Empresas</span>
          </div>
          <div class="contenido">
            <span class="titulo">Solicitud de ejemplo</span>
            <span class="dato">2 cursos · 4 inscritos</span>
            <span class="progreso"><i></i></span>
            <span class="boton">Cargar estudiantes</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .tema {
      display: grid;
      gap: 12px;
    }
    .interruptor {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      justify-self: start;
      min-height: 44px;
      padding: 6px 14px 6px 8px;
      border: 1px solid var(--line);
      background: var(--surface);
      color: var(--ink);
      font: 600 0.875rem var(--prevent-fuente);
      cursor: pointer;
    }
    .pista {
      position: relative;
      width: 40px;
      height: 22px;
      border-radius: 11px;
      background: #0d6efd;
      transition: background-color 240ms var(--ease-out);
    }
    .pista i {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #ffffff;
      transition: transform 240ms var(--ease-out);
    }
    .estado {
      font: 400 0.875rem var(--prevent-fuente);
      color: var(--ink-2);
    }
    [data-tema='prevent'] .pista {
      background: var(--prevent-degradado);
    }
    [data-tema='prevent'] .pista i {
      transform: translateX(18px);
      background: #0f0b07;
    }

    /* La maqueta: colores literales a propósito, son los de cada tema. */
    .pantalla {
      --acento: #0d6efd;
      --acento-2: #0d6efd;
      --texto: #212529;
      --texto-2: #6c757d;
      --barra: #f8f9fa;
      --barra-texto: #212529;
      --fondo: #ffffff;
      --letra: system-ui, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
      border-radius: 6px;
      background: var(--fondo);
      color: var(--texto);
      font-family: var(--letra);
      box-shadow: var(--prevent-sombra);
      transition: background-color 300ms var(--ease-out);
    }
    [data-tema='prevent'] .pantalla {
      --acento: #c09230;
      --acento-2: #855623;
      --texto: #212121;
      --texto-2: #5c5c5c;
      --barra: linear-gradient(90deg, #f1df14, #ffef42 30%, #e9b036 62%, #818329);
      --barra-texto: #1d150d;
      --fondo: #f5f7ff;
      --letra: 'Poppins', system-ui, sans-serif;
    }
    .cabeza {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      background: var(--barra);
      color: var(--barra-texto);
      font-weight: 600;
      font-size: 0.9375rem;
    }
    .marca {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .marca i {
      width: 14px;
      height: 14px;
      border-radius: 3px;
      background: currentColor;
      opacity: 0.85;
    }
    [data-tema='prevent'] .marca i {
      border-radius: 50% 50% 4px 4px;
      background: #855623;
    }
    .usuario {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.35;
    }
    .cuerpo {
      display: grid;
      grid-template-columns: 120px minmax(0, 1fr);
      min-height: 150px;
    }
    .menu {
      display: grid;
      align-content: start;
      gap: 2px;
      padding: 10px 6px;
      border-right: 1px solid #dde2eb;
      background: #ffffff;
    }
    .item {
      padding: 6px 10px;
      font-size: 0.8125rem;
      color: var(--texto-2);
      border-left: 3px solid transparent;
    }
    .item.activo {
      color: var(--texto);
      font-weight: 600;
      border-left-color: var(--acento);
    }
    .contenido {
      display: grid;
      align-content: start;
      gap: 8px;
      padding: 14px;
    }
    .titulo {
      font-weight: 600;
      font-size: 1rem;
    }
    .dato {
      font-size: 0.8125rem;
      color: var(--texto-2);
    }
    .progreso {
      height: 6px;
      border-radius: 3px;
      background: #dde2eb;
      overflow: hidden;
    }
    .progreso i {
      display: block;
      width: 62%;
      height: 100%;
      background: var(--acento-2);
    }
    .boton {
      justify-self: start;
      padding: 7px 14px;
      border-radius: 4px;
      background: var(--acento);
      color: #ffffff;
      font-size: 0.8125rem;
      font-weight: 600;
    }
    [data-tema='prevent'] .boton {
      color: #1d150d;
    }
    @media (max-width: 420px) {
      .cuerpo {
        grid-template-columns: 96px minmax(0, 1fr);
      }
    }
  `,
})
export class TemaPrevent {
  protected readonly dorado = signal(true);
}
