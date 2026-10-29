import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { Movimiento } from '../../core/movimiento';
import { CAMPOS_EXAMEN, REINTENTOS_MIN } from './contenido';
import { ICONOS } from './iconos';
import { PICTOGRAMAS } from './pictogramas';
import {
  MINUTOS_POR_SEGUNDO,
  avanzar,
  cortarCable,
  crearSimulacion,
  duracion,
  encolar,
  etiquetaEspera,
  horaDelDia,
  ocupada,
  reconectar,
  type Evento,
  type Simulacion,
  type Trabajo,
} from './simulador';

const ESTADO_TEXTO: Record<Trabajo['estado'], string> = {
  cola: 'En cola',
  leyendo: 'La IA lo lee',
  enviando: 'Va a la hoja',
  espera: 'Reintento programado',
  listo: 'En la hoja',
  agotado: 'Sin más reintentos',
};

/**
 * "Del papel al dato": un examen en PDF cae en la banda, la IA lo lee y sus campos viajan por
 * el cable a la hoja de seguimiento. Si el visitante corta el cable, el envío falla y el trabajo
 * se reintenta solo a los 30 min, a las 2 h y a las 6 h, con un reloj simulado.
 * La lógica vive en simulador.ts (funciones puras); aquí solo se dibuja y se maneja el tiempo.
 */
@Component({
  selector: 'app-ocupa-papel-dato',
  templateUrl: './papel-dato.html',
  styleUrl: './papel-dato.scss',
})
export class PapelDatoOcupasalud {
  protected readonly reducido = inject(Movimiento).reducido;
  private readonly anfitrion = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly campos = CAMPOS_EXAMEN;
  protected readonly esperas = REINTENTOS_MIN.map(etiquetaEspera);
  protected readonly claude = ICONOS.claude;
  protected readonly sheets = ICONOS.sheets;
  protected readonly hangfire = ICONOS.hangfire;
  protected readonly pdf = PICTOGRAMAS.pdf;
  protected readonly estadoTexto = ESTADO_TEXTO;
  protected readonly etiquetaEspera = etiquetaEspera;

  protected readonly sim = signal<Simulacion>(crearSimulacion());
  protected readonly dias = signal(7);
  protected readonly aviso = signal('');
  /** Cuántos exámenes trae el lote en curso: decide si se anuncia cada uno o solo el final. */
  private lote = 0;
  private falloAvisado = false;

  protected readonly hora = computed(() => horaDelDia(this.sim().reloj));
  protected readonly cortado = computed(() => this.sim().cableCortado);
  protected readonly enCurso = computed(() =>
    this.sim().trabajos.find((t) => t.estado === 'leyendo' || t.estado === 'enviando'),
  );
  protected readonly corte = computed(() => {
    const s = this.sim();
    return s.cableCortado && s.vuelveEn !== null ? duracion(s.vuelveEn - s.reloj) : null;
  });
  protected readonly fase = computed(() => this.enCurso()?.estado ?? 'quieto');
  protected readonly enCola = computed(() => this.sim().trabajos.filter((t) => t.estado === 'cola').length);
  protected readonly pila = computed(() => Array.from({ length: Math.min(this.enCola(), 6) }, (_, i) => i));
  protected readonly filas = computed(() => this.sim().filas.slice(-5));
  protected readonly totalFilas = computed(() => this.sim().filas.length);
  protected readonly panel = computed(() =>
    [...this.sim().trabajos].sort((a, b) => b.id - a.id).slice(0, 6),
  );
  /** Cuántos exámenes encola el histórico: dos por día, con un tope para que se vea. */
  protected readonly porEncolar = computed(() => Math.min(this.dias() * 2, 24));

  private cuadro = 0;
  private ultimo = 0;
  private vivo = true;
  /** Un solo callback para todos los cuadros: no se crea una función nueva en cada uno. */
  private readonly alCuadro = (t: number): void => this.tic(t);
  /** El reloj simulado solo corre con la máquina en pantalla; fuera de ella se pausa. */
  private enVista = false;
  private arrancoSola = false;

  constructor() {
    const destruccion = inject(DestroyRef);
    destruccion.onDestroy(() => {
      this.vivo = false;
      this.detener();
    });

    afterNextRender(() => {
      const observador = new IntersectionObserver(
        (entradas) => {
          const e = entradas[entradas.length - 1];
          if (!e) return;
          this.enVista = e.isIntersecting;
          if (!this.enVista) {
            this.detener();
            return;
          }
          // La primera vez que se ve bien llegan dos exámenes y la máquina arranca sola. Con
          // movimiento reducido no: espera a que el visitante la ponga a andar.
          if (!this.arrancoSola && e.intersectionRatio >= 0.35) {
            this.arrancoSola = true;
            if (!this.reducido() && this.sim().trabajos.length === 0) {
              this.cambiar(encolar(this.sim(), 2));
              return;
            }
          }
          this.arrancar();
        },
        { threshold: [0, 0.35] },
      );
      observador.observe(this.anfitrion.nativeElement);
      destruccion.onDestroy(() => observador.disconnect());
    });
  }

  protected procesarUno(): void {
    if (!ocupada(this.sim())) this.lote = 1;
    this.cambiar(encolar(this.sim(), 1));
  }

  protected alternarCable(): void {
    if (this.cortado()) {
      this.cambiar(reconectar(this.sim()));
      this.aviso.set('Reconectaste el cable. El próximo reintento lo recupera sin que nadie lo vuelva a enviar.');
    } else {
      this.cambiar(cortarCable(this.sim()));
      this.aviso.set('Cortaste el cable: los envíos a la hoja van a fallar. Si nadie lo reconecta, vuelve solo en 6 horas.');
    }
  }

  protected cambiarDias(evento: Event): void {
    const valor = Number((evento.target as HTMLInputElement).value);
    this.dias.set(Number.isFinite(valor) ? valor : 7);
  }

  protected encolarHistorico(): void {
    const n = this.porEncolar();
    this.lote += n;
    this.falloAvisado = false;
    this.cambiar(encolar(this.sim(), n));
    this.aviso.set(`Encolaste ${n} exámenes del histórico. Se procesan uno por uno, en orden.`);
  }

  protected reiniciar(): void {
    this.lote = 0;
    this.cambiar(crearSimulacion());
    this.aviso.set('La máquina quedó vacía.');
  }

  protected textoTrabajo(t: Trabajo): string {
    if (t.estado === 'espera') {
      const faltan = t.proximo - this.sim().reloj;
      return `Reintento ${t.fallos} en ${duracion(faltan)}`;
    }
    if (t.estado === 'listo' && t.fallos > 0) return `En la hoja, al reintento ${t.fallos}`;
    if (t.estado === 'leyendo' && t.fallos > 0) return `Reintento ${t.fallos}: la IA lo lee`;
    if (t.estado === 'enviando' && t.fallos > 0) return `Reintento ${t.fallos}: va a la hoja`;
    return ESTADO_TEXTO[t.estado];
  }

  // ---- el tiempo

  private cambiar(s: Simulacion): void {
    this.sim.set(s);
    this.arrancar();
  }

  private arrancar(): void {
    if (this.cuadro || !this.vivo || !this.enVista || !ocupada(this.sim())) return;
    this.ultimo = performance.now();
    this.cuadro = requestAnimationFrame(this.alCuadro);
  }

  private detener(): void {
    if (this.cuadro) cancelAnimationFrame(this.cuadro);
    this.cuadro = 0;
  }

  private tic(ahora: number): void {
    this.cuadro = 0;
    if (!this.vivo || !this.enVista) return;
    // Pestaña oculta o cuadro muy lento: no más de un cuarto de segundo de golpe.
    const dt = Math.min(Math.max((ahora - this.ultimo) / 1000, 0), 0.25);
    this.ultimo = ahora;
    const { s, eventos } = avanzar(this.sim(), dt * MINUTOS_POR_SEGUNDO);
    this.sim.set(s);
    this.anunciar(eventos);
    if (ocupada(s)) this.cuadro = requestAnimationFrame(this.alCuadro);
  }

  /**
   * Con un lote grande (el histórico encola hasta decenas), anunciar cada examen vuelve
   * ilegible el lector de pantalla: se avisa el primer fallo del lote y el final, nada más.
   */
  private anunciar(eventos: Evento[]): void {
    const enLote = this.lote > 1;
    for (const e of eventos) {
      switch (e.tipo) {
        case 'fallo':
          if (enLote) {
            if (!this.falloAvisado) {
              this.falloAvisado = true;
              this.aviso.set('Los envíos a la hoja están fallando. Cada examen reintenta solo, sin que nadie lo reenvíe.');
            }
            break;
          }
          this.aviso.set(
            `El envío del examen ${e.id} falló. Reintento ${e.intento} de ${REINTENTOS_MIN.length} en ${etiquetaEspera(e.espera)}.`,
          );
          break;
        case 'reintento':
          if (!enLote) this.aviso.set(`Se cumplió la espera: el examen ${e.id} vuelve a la cola.`);
          break;
        case 'agotado':
          this.aviso.set(
            `El examen ${e.id} agotó sus reintentos. El reproceso por rango de fechas lo vuelve a encolar.`,
          );
          break;
        case 'vuelve':
          this.aviso.set('La conexión volvió sola.');
          break;
        case 'fila':
          if (!enLote) this.aviso.set(`El examen ${e.id} llegó a la hoja.`);
          break;
      }
    }
    if (enLote && !ocupada(this.sim())) {
      this.aviso.set(`La cola quedó vacía: los ${this.lote} exámenes del lote pasaron por la máquina.`);
      this.lote = 0;
    }
  }
}
