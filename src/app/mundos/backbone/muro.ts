import { Component, signal } from '@angular/core';

export interface DestinoSkill {
  id: string;
  nombre: string;
  pasa: boolean;
  resultado: string;
}

/** Destinos de juguete, sin direcciones reales: lo que importa es dónde termina la conexión. */
export const DESTINOS: DestinoSkill[] = [
  {
    id: 'empresa',
    nombre: 'El sistema de la empresa',
    pasa: true,
    resultado: 'Conecta. El dato vuelve al agente y la respuesta sigue.',
  },
  {
    id: 'interna',
    nombre: 'Una dirección de la red de metadatos de la nube',
    pasa: false,
    resultado: 'Rechazada al abrir la conexión.',
  },
  {
    id: 'redireccion',
    nombre: 'Una dirección pública que redirige a la red de metadatos',
    pasa: false,
    resultado: 'Rechazada: el salto de la redirección también se revisa al abrir la conexión.',
  },
  {
    id: 'disfraz',
    nombre: 'Un dominio de nombre inocente que apunta a la red de metadatos',
    pasa: false,
    resultado: 'Rechazado: cuenta a dónde lleva el nombre, no cómo se escribe.',
  },
];

/**
 * El muro del socket: el visitante elige a dónde quiere llamar una skill y ve dónde termina.
 * Cada lanzamiento crea un elemento nuevo (track por número), así la animación CSS arranca de cero.
 */
@Component({
  selector: 'app-backbone-muro',
  template: `
    <div class="muro" [class.choca]="ultimo()?.pasa === false" [class.pasa]="ultimo()?.pasa === true">
      <div class="opciones" role="group" aria-label="A dónde llama la skill">
        @for (d of destinos; track d.id) {
          <button type="button" [attr.aria-pressed]="ultimo()?.id === d.id" (click)="lanzar(d)">
            <i [class.rojo]="!d.pasa" aria-hidden="true"></i>{{ d.nombre }}
          </button>
        }
      </div>

      <svg viewBox="0 0 600 200" aria-hidden="true">
        <g class="skill">
          <rect x="20" y="70" width="46" height="60" rx="6" />
          <rect class="renglon" x="28" y="82" width="18" height="18" rx="3" />
          <rect class="renglon" x="28" y="108" width="30" height="4" />
          <rect class="renglon" x="28" y="116" width="22" height="4" />
        </g>
        <text x="43" y="152">La skill</text>
        <g class="pared">
          @for (y of [0, 40, 80, 120, 160]; track y) {
            <rect x="318" [attr.y]="y + 4" width="22" height="32" rx="3" />
          }
        </g>
        <g class="destino-bien">
          <rect x="500" y="34" width="56" height="50" rx="6" />
          <text x="528" y="104">Sistema</text>
        </g>
        <g class="destino-mal">
          <rect x="500" y="124" width="56" height="50" rx="6" />
          <!-- Corrido a la izquierda: en el celular la letra crece y si no se cortaría contra el borde. -->
          <text x="522" y="194">Red interna</text>
        </g>
        @for (v of viajes(); track v.n) {
          <g [class]="v.pasa ? 'viaje viaje-pasa' : 'viaje viaje-choca'">
            <circle class="paquete" cx="70" cy="100" r="8" />
            @if (!v.pasa) {
              <circle class="estallido" cx="316" cy="132" r="18" />
            }
          </g>
        }
      </svg>

      <p class="resultado" aria-live="polite">
        @if (ultimo(); as d) {
          <b>{{ d.nombre }}:</b> {{ d.resultado }}
          @if (!d.pasa) {
            El agente recibe el error como texto y la conversación no se cae.
          }
        } @else {
          Elige un destino para la llamada de la skill.
        }
      </p>
      <p class="nota">Simulación: aquí no se hace ninguna llamada real.</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
      font-family: var(--backbone-fuente);
    }
    .muro {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 14px;
      padding: 18px;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: var(--surface);
    }
    .opciones {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 8px;
    }
    @media (min-width: 640px) {
      .opciones {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    button {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 48px;
      padding: 8px 12px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--bg);
      color: var(--ink);
      font: 500 0.9375rem/1.35 var(--backbone-fuente);
      text-align: left;
      cursor: pointer;
    }
    button:hover,
    button[aria-pressed='true'] {
      border-color: var(--signal);
    }
    button i {
      flex: none;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--backbone-exito);
    }
    button i.rojo {
      background: var(--backbone-peligro);
    }
    svg {
      display: block;
      width: 100%;
      height: auto;
    }
    text {
      font: 500 14px var(--backbone-fuente);
      fill: var(--ink-3);
      text-anchor: middle;
    }
    .skill rect {
      fill: var(--ink);
    }
    .skill .renglon {
      fill: var(--backbone-indigo);
    }
    .pared rect {
      fill: var(--surface-2);
      stroke: var(--line);
      transition: fill 300ms, stroke 300ms;
    }
    .choca .pared rect {
      stroke: var(--backbone-peligro);
      fill: var(--backbone-peligro-suave);
    }
    .pasa .pared rect {
      stroke: var(--backbone-exito);
    }
    .destino-bien rect {
      fill: var(--surface-2);
      stroke: var(--backbone-exito);
      stroke-width: 2;
    }
    .destino-mal rect {
      fill: var(--backbone-peligro-suave);
      stroke: var(--backbone-peligro);
      stroke-width: 2;
      stroke-dasharray: 5 4;
    }
    .paquete {
      fill: var(--signal);
    }
    .viaje-pasa .paquete {
      animation: pasar 1100ms var(--ease-in-out) forwards;
    }
    .viaje-choca .paquete {
      animation: chocar 900ms var(--ease-in-out) forwards;
    }
    .estallido {
      fill: none;
      stroke: var(--backbone-peligro);
      stroke-width: 3;
      opacity: 0;
      transform-box: fill-box;
      transform-origin: center;
      animation: estallar 600ms 560ms var(--ease-out) forwards;
    }
    @keyframes pasar {
      to {
        transform: translate(458px, -41px);
        fill: var(--backbone-exito);
      }
    }
    @keyframes chocar {
      62% {
        transform: translate(238px, 32px) scale(1);
        opacity: 1;
      }
      100% {
        transform: translate(238px, 32px) scale(0.2);
        opacity: 0;
      }
    }
    @keyframes estallar {
      from {
        opacity: 1;
        transform: scale(0.3);
      }
      to {
        opacity: 0.85;
        transform: scale(1.4);
      }
    }
    .resultado {
      min-height: 3em;
      color: var(--ink-2);
    }
    .resultado b {
      color: var(--ink);
      font-weight: 600;
    }
    .nota {
      color: var(--ink-3);
      font-size: 0.875rem;
    }
    @media (max-width: 640px) {
      text {
        font-size: 26px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .viaje-pasa .paquete,
      .viaje-choca .paquete,
      .estallido {
        animation-duration: 1ms;
        animation-delay: 0ms;
      }
    }
  `,
})
export class MuroBackbone {
  protected readonly destinos = DESTINOS;
  protected readonly viajes = signal<{ n: number; pasa: boolean }[]>([]);
  protected readonly ultimo = signal<DestinoSkill | null>(null);
  private n = 0;

  protected lanzar(d: DestinoSkill): void {
    this.ultimo.set(d);
    // Solo vive el último viaje: el anterior se borra y el nuevo arranca su animación.
    this.viajes.set([{ n: ++this.n, pasa: d.pasa }]);
  }
}
