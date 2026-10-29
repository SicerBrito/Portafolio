/**
 * Juego "La válvula" (canvas 2D). Cuenta la falla silenciosa con números de juguete:
 * cada punto es una persona distinta y la "ventana" de unos segundos hace de las 24 horas.
 *
 * - Sin tope ('sin-control'): todo pasa la válvula y el panel lo cuenta como enviado. Al
 *   pasar el escalón de Meta, lo que sobra se desvanece sin error.
 * - Con tope propio ('conecta'): la válvula lleva su propio tope, por debajo del escalón.
 *   Lo que sobra hace fila y sale cuando hay cupo.
 *
 * Independiente de Angular. Cero asignaciones por cuadro: todo vive en arreglos fijos.
 */

export type ModoValvula = 'sin-control' | 'conecta';

export interface ConteoValvula {
  enviados: number;
  llegaron: number;
  enFila: number;
  perdidos: number;
  /** 0..1: cupo usado de la ventana que manda en el modo actual. */
  uso: number;
}

export interface ColoresValvula {
  oro1: string;
  oro3: string;
  oroTexto: string;
  tinta: string;
  tintaSuave: string;
  linea: string;
  superficie: string;
  textoSuave: string;
  exito: string;
}

export interface OpcionesValvula {
  lienzo: HTMLCanvasElement;
  reducido: boolean;
  colores: () => ColoresValvula;
  alContar: (c: Readonly<ConteoValvula>) => void;
}

export interface JuegoValvula {
  /** Personas por segundo que se sueltan. */
  flujo(porSegundo: number): void;
  modo(m: ModoValvula): void;
  reiniciar(): void;
  /** Movimiento reducido: avanza la simulación de golpe y dibuja el cuadro final. */
  simular(segundos: number): void;
  refrescarColores(): void;
  destruir(): void;
}

/** Posiciones en fracción del ancho (el HTML ubica sus etiquetas con los mismos números). */
export const POSICIONES = { emisor: 0.07, valvula: 0.4, escalon: 0.64, celular: 0.91 } as const;

const VENTANA = 8;
const CUPO_CONECTA = 10;
const CUPO_META = 16;
const MAX = 260;
const VELOCIDAD = 0.24;
const FILA_POR_HILERA = 9;

/** Los trazos punteados, creados una vez: setLineDash([…]) en cada cuadro asignaba arreglos. */
const GUION_CONDUCTO = [6, 8];
const GUION_SIN_TOPE = [5, 7];
const SIN_GUION: number[] = [];

const LIBRE = 0;
const HACIA_VALVULA = 1;
const EN_FILA = 2;
const PASANDO = 3;
const PERDIENDOSE = 4;
const LLEGANDO = 5;

export function crearValvula(op: OpcionesValvula): JuegoValvula {
  const { lienzo, reducido } = op;
  const padre: Element = lienzo.parentElement ?? lienzo;
  const ctx = lienzo.getContext('2d');

  const estado = new Uint8Array(MAX);
  const x = new Float32Array(MAX);
  const y = new Float32Array(MAX);
  const vida = new Float32Array(MAX);
  const fila = new Int16Array(MAX);
  let filaInicio = 0;
  let filaLargo = 0;

  const marcasConecta = new Float64Array(CUPO_CONECTA).fill(-1e9);
  const marcasMeta = new Float64Array(CUPO_META).fill(-1e9);
  let iConecta = 0;
  let iMeta = 0;

  const conteo: ConteoValvula = { enviados: 0, llegaron: 0, enFila: 0, perdidos: 0, uso: 0 };
  let modo: ModoValvula = 'sin-control';
  let porSegundo = 1;
  let acumulado = 0;
  let semilla = 7;
  let reloj = 0;
  let paleta = op.colores();

  let ancho = 1;
  let alto = 1;
  let destruido = false;
  let enVista = false;
  let pestanaVisible = document.visibilityState !== 'hidden';
  let idBucle = 0;
  let ultimo = 0;
  let ultimoAviso = 0;

  // Pseudoaleatorio propio: la simulación es la misma cada vez y no asigna memoria.
  const azar = () => {
    semilla = (semilla * 16807) % 2147483647;
    return (semilla - 1) / 2147483646;
  };

  const uso = (marcas: Float64Array) => {
    let n = 0;
    for (let i = 0; i < marcas.length; i++) if (marcas[i] > reloj - VENTANA) n++;
    return n;
  };

  function registrarConecta(): void {
    marcasConecta[iConecta] = reloj;
    iConecta = (iConecta + 1) % CUPO_CONECTA;
  }

  function registrarMeta(): void {
    marcasMeta[iMeta] = reloj;
    iMeta = (iMeta + 1) % CUPO_META;
  }

  function soltar(): void {
    for (let i = 0; i < MAX; i++) {
      if (estado[i] !== LIBRE) continue;
      estado[i] = HACIA_VALVULA;
      x[i] = POSICIONES.emisor + 0.03;
      y[i] = (azar() - 0.5) * 0.16;
      vida[i] = 1;
      return;
    }
  }

  function salirDeFila(): void {
    while (filaLargo > 0 && uso(marcasConecta) < CUPO_CONECTA) {
      const i = fila[filaInicio];
      filaInicio = (filaInicio + 1) % MAX;
      filaLargo--;
      registrarConecta();
      conteo.enviados++;
      estado[i] = PASANDO;
      x[i] = POSICIONES.valvula + 0.02;
    }
  }

  function vaciarFilaSinControl(): void {
    while (filaLargo > 0) {
      const i = fila[filaInicio];
      filaInicio = (filaInicio + 1) % MAX;
      filaLargo--;
      conteo.enviados++;
      estado[i] = PASANDO;
      x[i] = POSICIONES.valvula + 0.02;
    }
  }

  function paso(dt: number): void {
    reloj += dt;
    acumulado += porSegundo * dt;
    while (acumulado >= 1) {
      acumulado -= 1;
      soltar();
    }

    if (modo === 'conecta') salirDeFila();

    const avance = VELOCIDAD * dt;
    for (let i = 0; i < MAX; i++) {
      const e = estado[i];
      if (e === LIBRE || e === EN_FILA) continue;
      if (e === LLEGANDO) {
        vida[i] -= dt * 3;
        if (vida[i] <= 0) estado[i] = LIBRE;
        continue;
      }
      if (e === PERDIENDOSE) {
        x[i] += avance * 0.6;
        vida[i] -= dt * 0.9;
        if (vida[i] <= 0) estado[i] = LIBRE;
        continue;
      }
      const antes = x[i];
      x[i] += avance;
      y[i] *= 1 - Math.min(1, dt * 0.8);

      if (e === HACIA_VALVULA && x[i] >= POSICIONES.valvula) {
        if (modo === 'conecta') {
          if (uso(marcasConecta) < CUPO_CONECTA) {
            registrarConecta();
            conteo.enviados++;
            estado[i] = PASANDO;
          } else {
            fila[(filaInicio + filaLargo) % MAX] = i;
            filaLargo++;
            estado[i] = EN_FILA;
          }
        } else {
          conteo.enviados++;
          estado[i] = PASANDO;
        }
      } else if (e === PASANDO && antes < POSICIONES.escalon && x[i] >= POSICIONES.escalon) {
        if (uso(marcasMeta) < CUPO_META) {
          registrarMeta();
        } else {
          // Meta lo acepta sin error y nunca lo entrega: nadie se entera.
          estado[i] = PERDIENDOSE;
          conteo.perdidos++;
        }
      } else if (e === PASANDO && x[i] >= POSICIONES.celular) {
        x[i] = POSICIONES.celular;
        estado[i] = LLEGANDO;
        vida[i] = 1;
        conteo.llegaron++;
      }
    }

    conteo.enFila = filaLargo;
    conteo.uso = modo === 'conecta' ? uso(marcasConecta) / CUPO_CONECTA : uso(marcasMeta) / CUPO_META;
  }

  // ---- dibujo

  function dibujar(): void {
    if (!ctx) return;
    const w = ancho;
    const h = alto;
    const medio = h * 0.56;
    const escalaY = h * 0.36;
    ctx.clearRect(0, 0, w, h);

    // El conducto.
    ctx.strokeStyle = paleta.linea;
    ctx.lineWidth = 2;
    ctx.setLineDash(GUION_CONDUCTO);
    ctx.beginPath();
    ctx.moveTo(w * POSICIONES.emisor, medio);
    ctx.lineTo(w * POSICIONES.celular, medio);
    ctx.stroke();
    ctx.setLineDash(SIN_GUION);

    // El sistema que suelta el lote.
    const ex = w * POSICIONES.emisor;
    ctx.fillStyle = paleta.tinta;
    caja(ctx, ex - 22, medio - 30, 44, 60, 8);
    ctx.fill();
    ctx.fillStyle = paleta.oro1;
    for (let i = 0; i < 3; i++) ctx.fillRect(ex - 12, medio - 16 + i * 12, 24 - i * 6, 4);

    // La válvula de Conecta: viva en modo Conecta, abierta y punteada sin control.
    const vx = w * POSICIONES.valvula;
    const radio = Math.min(h * 0.2, 46);
    ctx.lineWidth = 6;
    ctx.strokeStyle = modo === 'conecta' ? paleta.tinta : paleta.linea;
    if (modo !== 'conecta') ctx.setLineDash(GUION_SIN_TOPE);
    ctx.beginPath();
    ctx.arc(vx, medio, radio, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash(SIN_GUION);
    if (modo === 'conecta') {
      ctx.strokeStyle = paleta.oro1;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(vx, medio, radio + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * conteo.uso);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    // El escalón de Meta.
    const mx = w * POSICIONES.escalon;
    ctx.strokeStyle = paleta.tintaSuave;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(mx - 26, medio + escalaY * 0.75);
    ctx.lineTo(mx, medio + escalaY * 0.75);
    ctx.lineTo(mx, medio - escalaY * 0.75);
    ctx.lineTo(mx + 26, medio - escalaY * 0.75);
    ctx.stroke();
    if (modo === 'sin-control') {
      ctx.fillStyle = paleta.oro3;
      const usoMeta = Math.min(1, uso(marcasMeta) / CUPO_META);
      ctx.fillRect(mx + 6, medio + escalaY * 0.7 - escalaY * 1.4 * usoMeta, 5, escalaY * 1.4 * usoMeta);
    }

    // El celular.
    const cx = w * POSICIONES.celular;
    ctx.fillStyle = paleta.tinta;
    caja(ctx, cx - 18, medio - 34, 36, 68, 8);
    ctx.fill();
    ctx.fillStyle = paleta.superficie;
    caja(ctx, cx - 13, medio - 28, 26, 54, 4);
    ctx.fill();

    // Las personas.
    for (let i = 0; i < MAX; i++) {
      const e = estado[i];
      if (e === LIBRE || e === EN_FILA) continue;
      const px = x[i] * w;
      const py = medio + y[i] * escalaY;
      if (e === PERDIENDOSE) {
        ctx.globalAlpha = Math.max(0, vida[i]) * 0.8;
        ctx.fillStyle = paleta.linea;
        punto(ctx, px, py, 5);
        ctx.globalAlpha = 1;
        continue;
      }
      if (e === LLEGANDO) {
        ctx.globalAlpha = Math.max(0, vida[i]);
        ctx.strokeStyle = paleta.exito;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 5 + (1 - vida[i]) * 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.fillStyle = paleta.oro1;
      punto(ctx, px, py, 5);
      ctx.strokeStyle = paleta.oro3;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // La fila, en hileras antes de la válvula.
    for (let k = 0; k < filaLargo; k++) {
      const hilera = Math.floor(k / FILA_POR_HILERA);
      const enHilera = k % FILA_POR_HILERA;
      const px = vx - radio - 12 - enHilera * 12;
      const py = medio + (hilera % 2 === 0 ? 1 : -1) * Math.ceil(hilera / 2) * 12;
      if (px < w * POSICIONES.emisor + 30) continue;
      ctx.fillStyle = paleta.superficie;
      punto(ctx, px, py, 4.5);
      ctx.strokeStyle = paleta.oroTexto;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // ---- bucle

  function avisar(ahora: number, forzar: boolean): void {
    if (!forzar && ahora - ultimoAviso < 160) return;
    ultimoAviso = ahora;
    op.alContar(conteo);
  }

  function debeCorrer(): boolean {
    return !reducido && !destruido && enVista && pestanaVisible;
  }

  function cuadro(ahora: number): void {
    idBucle = 0;
    if (destruido) return;
    const dt = Math.min(Math.max((ahora - ultimo) / 1000, 0), 0.05);
    ultimo = ahora;
    paso(dt);
    dibujar();
    avisar(ahora, false);
    if (debeCorrer()) idBucle = requestAnimationFrame(cuadro);
  }

  function evaluarBucle(): void {
    if (debeCorrer()) {
      if (!idBucle) {
        ultimo = performance.now();
        idBucle = requestAnimationFrame(cuadro);
      }
    } else if (idBucle) {
      cancelAnimationFrame(idBucle);
      idBucle = 0;
    }
  }

  function redimensionar(w: number, h: number): void {
    if (w < 1 || h < 1 || !ctx) return;
    ancho = w;
    alto = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    lienzo.width = Math.round(w * dpr);
    lienzo.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dibujar();
  }

  const alCambiarVisibilidad = (): void => {
    pestanaVisible = document.visibilityState !== 'hidden';
    evaluarBucle();
  };
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  const observadorTamano = new ResizeObserver((entradas) => {
    const ultima = entradas[entradas.length - 1];
    if (ultima) redimensionar(ultima.contentRect.width, ultima.contentRect.height);
  });
  observadorTamano.observe(padre);

  const observadorVista = new IntersectionObserver((entradas) => {
    const ultima = entradas[entradas.length - 1];
    if (!ultima) return;
    enVista = ultima.isIntersecting;
    evaluarBucle();
  });
  observadorVista.observe(lienzo);

  redimensionar(padre.clientWidth, padre.clientHeight);
  op.alContar(conteo);

  return {
    flujo(n: number): void {
      porSegundo = Math.max(0, Math.min(10, Number.isFinite(n) ? n : 0));
    },

    modo(m: ModoValvula): void {
      if (m === modo) return;
      modo = m;
      if (m === 'sin-control') vaciarFilaSinControl();
      conteo.enFila = filaLargo;
      dibujar();
      op.alContar(conteo);
    },

    reiniciar(): void {
      estado.fill(LIBRE);
      filaInicio = 0;
      filaLargo = 0;
      marcasConecta.fill(-1e9);
      marcasMeta.fill(-1e9);
      conteo.enviados = 0;
      conteo.llegaron = 0;
      conteo.enFila = 0;
      conteo.perdidos = 0;
      conteo.uso = 0;
      acumulado = 0;
      semilla = 7;
      dibujar();
      op.alContar(conteo);
    },

    simular(segundos: number): void {
      if (destruido) return;
      const pasos = Math.round(Math.max(0, segundos) * 30);
      for (let i = 0; i < pasos; i++) paso(1 / 30);
      dibujar();
      op.alContar(conteo);
    },

    refrescarColores(): void {
      paleta = op.colores();
      dibujar();
    },

    destruir(): void {
      if (destruido) return;
      destruido = true;
      if (idBucle) cancelAnimationFrame(idBucle);
      idBucle = 0;
      observadorTamano.disconnect();
      observadorVista.disconnect();
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    },
  };
}

function caja(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function punto(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
