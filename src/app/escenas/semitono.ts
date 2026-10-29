/**
 * Retrato en tres tiempos, dibujado en canvas 2D:
 * 1. Entrada: los puntos de un semitono llegan dispersos y arman la silueta.
 * 2. Revelado: la foto aparece nítida en duotono y los puntos se desvanecen.
 * 3. Lupa: donde pasa el puntero, la foto se abre y deja ver el semitono por dentro.
 * Independiente del framework: el anfitrión lo importa con import() solo en el navegador.
 */

export interface ColoresSemitono {
  /** Color de los puntos del semitono. */
  punto: string;
  /** Duotono de la foto: sombras → luces. */
  sombra: string;
  luz: string;
}

export interface OpcionesSemitono {
  lienzo: HTMLCanvasElement;
  imagen: HTMLImageElement; // ya cargada
  colores: () => ColoresSemitono;
  reducido: boolean;
  paso?: number; // separación de la retícula en px CSS; por defecto ≈ ancho/74, mínimo 4
}

export interface EscenaSemitono {
  apuntar(x: number | null, y: number | null): void;
  inclinar(x: number, y: number): void;
  refrescarColores(): void;
  destruir(): void;
}

const DPR_MAX = 2;
const TAU = Math.PI * 2;

const COLUMNAS_OBJETIVO = 74;
const PASO_MIN = 4;
const FACTOR_RADIO = 0.5 * 1.05;
const ALFA_MIN = 0.35;
const EXPONENTE = 1.15;
const SUAVIZADO_CONTRASTE = 0.35;

const DURACION_ENTRADA = 1.3; // s
const DURACION_REVELADO = 0.9; // s
const FRACCION_RETRASO = 0.35;
const DISPERSION_MIN = 0.15;
const DISPERSION_MAX = 0.7;
const SEMILLA = 0x5e1c3e;

const RADIO_LUPA = 86; // px CSS
const K_LUPA = 9; // 1/s
const INCLINACION_FOTO = 6; // px CSS
const K_INCLINAR = 5;
const UMBRAL_REPOSO = 0.002;

function aleatorioConSemilla(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function limitar(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Convierte cualquier color CSS a [r, g, b] pintándolo en un lienzo de 1 px. */
function aRgb(color: string, ctx: CanvasRenderingContext2D): [number, number, number] {
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

export function crearSemitono(op: OpcionesSemitono): EscenaSemitono {
  const { lienzo, imagen, reducido } = op;
  const auxiliar = document.createElement('canvas');
  const foto = document.createElement('canvas');
  const ctxLienzo = lienzo.getContext('2d');
  const ctxAuxiliar = auxiliar.getContext('2d', { willReadFrequently: true });
  const ctxFoto = foto.getContext('2d', { willReadFrequently: true });

  if (!ctxLienzo || !ctxAuxiliar || !ctxFoto) {
    const nada = (): void => undefined;
    return { apuntar: nada, inclinar: nada, refrescarColores: nada, destruir: nada };
  }
  const ctx: CanvasRenderingContext2D = ctxLienzo;
  const actx: CanvasRenderingContext2D = ctxAuxiliar;
  const fctx: CanvasRenderingContext2D = ctxFoto;

  let colores = op.colores();

  let dpr = 1;
  let ancho = 0;
  let alto = 0;
  let x0 = 0;
  let y0 = 0;
  let dw = 0;
  let dh = 0;
  let radioMax = 0;

  let n = 0;
  let bx = new Float32Array(0);
  let by = new Float32Array(0);
  let radio = new Float32Array(0);
  let ox = new Float32Array(0);
  let oy = new Float32Array(0);
  let retraso = new Float32Array(0);

  // Con movimiento reducido no hay entrada ni revelado: la foto aparece de una vez.
  let tEntrada = reducido ? DURACION_ENTRADA : 0;
  let tRevelado = reducido ? DURACION_REVELADO : 0;

  let punteroX = 0;
  let punteroY = 0;
  let objLupa = 0;
  let lupa = 0;

  let inclX = 0;
  let inclY = 0;
  let objInclX = 0;
  let objInclY = 0;

  let rafId = 0;
  let ultimoT = 0;
  let animando = !reducido;
  let sucio = false;
  let destruido = false;
  let enVista = false;
  let pestanaVisible = document.visibilityState !== 'hidden';

  function asegurarCapacidad(cap: number): void {
    if (bx.length >= cap) return;
    bx = new Float32Array(cap);
    by = new Float32Array(cap);
    radio = new Float32Array(cap);
    ox = new Float32Array(cap);
    oy = new Float32Array(cap);
    retraso = new Float32Array(cap);
  }

  /** Prepara la foto en duotono a la resolución del lienzo, con niveles estirados y un enfoque suave. */
  function prepararFoto(): void {
    const w = Math.max(1, Math.round(dw * dpr));
    const h = Math.max(1, Math.round(dh * dpr));
    foto.width = w;
    foto.height = h;
    fctx.imageSmoothingEnabled = true;
    fctx.imageSmoothingQuality = 'high';
    fctx.clearRect(0, 0, w, h);
    fctx.drawImage(imagen, 0, 0, w, h);
    let datos: ImageData;
    try {
      datos = fctx.getImageData(0, 0, w, h);
    } catch {
      return;
    }
    const px = datos.data;
    const total = w * h;
    const lum = new Float32Array(total);
    const histo = new Uint32Array(256);
    let opacos = 0;
    for (let i = 0; i < total; i++) {
      const k = i * 4;
      const l = (0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2]) / 255;
      lum[i] = l;
      if (px[k + 3] > 128) {
        histo[Math.min(255, Math.floor(l * 256))]++;
        opacos++;
      }
    }
    // Niveles: percentiles 1–99 % de la parte opaca (la persona, no el fondo recortado).
    let acumulado = 0;
    let bajo = 0;
    let altoL = 1;
    let bajoListo = false;
    for (let b = 0; b < 256; b++) {
      acumulado += histo[b];
      if (!bajoListo && acumulado > opacos * 0.01) {
        bajo = b / 256;
        bajoListo = true;
      }
      if (acumulado >= opacos * 0.99) {
        altoL = (b + 1) / 256;
        break;
      }
    }
    const rango = Math.max(0.15, altoL - bajo);
    const [sr, sg, sb] = aRgb(colores.sombra, actx);
    const [lr, lg, lb] = aRgb(colores.luz, actx);
    // Enfoque suave (máscara de desenfoque 3×3) sobre la luminancia: la foto original es chica.
    const CANTIDAD = 0.55;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        let l = lum[i];
        if (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
          const promedio =
            (lum[i - 1] + lum[i + 1] + lum[i - w] + lum[i + w] + lum[i - w - 1] + lum[i - w + 1] + lum[i + w - 1] + lum[i + w + 1]) / 8;
          l = l + (l - promedio) * CANTIDAD;
        }
        const t = Math.pow(limitar((l - bajo) / rango, 0, 1), 0.92);
        const k = i * 4;
        px[k] = sr + (lr - sr) * t;
        px[k + 1] = sg + (lg - sg) * t;
        px[k + 2] = sb + (lb - sb) * t;
      }
    }
    fctx.putImageData(datos, 0, 0);
  }

  /** Reconstruye la retícula del semitono (solo al redimensionar o cambiar colores). */
  function muestrear(): void {
    n = 0;
    const iw = imagen.naturalWidth || imagen.width;
    const ih = imagen.naturalHeight || imagen.height;
    if (iw <= 0 || ih <= 0 || ancho <= 0 || alto <= 0) return;

    const escala = Math.min(ancho / iw, alto / ih);
    dw = iw * escala;
    dh = ih * escala;
    x0 = (ancho - dw) / 2;
    y0 = (alto - dh) / 2;

    const paso = op.paso !== undefined && op.paso > 0 ? Math.max(2, op.paso) : Math.max(PASO_MIN, dw / COLUMNAS_OBJETIVO);
    radioMax = paso * FACTOR_RADIO;

    const gw = Math.max(2, Math.ceil((dw / paso) * 2));
    const gh = Math.max(2, Math.ceil((dh / paso) * 2));
    auxiliar.width = gw;
    auxiliar.height = gh;
    actx.imageSmoothingEnabled = true;
    actx.imageSmoothingQuality = 'high';
    actx.clearRect(0, 0, gw, gh);
    actx.drawImage(imagen, 0, 0, gw, gh);
    let datos: Uint8ClampedArray;
    try {
      datos = actx.getImageData(0, 0, gw, gh).data;
    } catch {
      return;
    }

    const col = paso * Math.SQRT2;
    const fila = paso * Math.SQRT1_2;
    const nFilas = Math.floor(dh / fila) + 1;
    const nCols = Math.floor(dw / col) + 1;
    const ys = (dh - (nFilas - 1) * fila) / 2;
    const xs = (dw - (nCols - 1) * col) / 2;
    asegurarCapacidad(nFilas * nCols);

    const azar = aleatorioConSemilla(SEMILLA);
    const lado = Math.max(dw, dh);
    const retrasoMax = DURACION_ENTRADA * FRACCION_RETRASO;
    let minimo = 1;
    let maximo = 0;

    for (let j = 0; j < nFilas; j++) {
      const y = ys + j * fila;
      const desfase = j % 2 === 0 ? -col / 4 : col / 4;
      const gy = (y / dh) * gh;
      const iy0 = limitar(Math.round(gy - 1), 0, gh - 1);
      const iy1 = Math.min(iy0 + 1, gh - 1);
      for (let c = 0; c < nCols; c++) {
        const x = xs + c * col + desfase;
        const gx = (x / dw) * gw;
        const ix0 = limitar(Math.round(gx - 1), 0, gw - 1);
        const ix1 = Math.min(ix0 + 1, gw - 1);
        let sumaA = 0;
        let sumaL = 0;
        let cuenta = 0;
        for (let iy = iy0; iy <= iy1; iy++) {
          for (let ix = ix0; ix <= ix1; ix++) {
            const k = (iy * gw + ix) * 4;
            const a = datos[k + 3] / 255;
            const l = (0.2126 * datos[k] + 0.7152 * datos[k + 1] + 0.0722 * datos[k + 2]) / 255;
            sumaA += a;
            sumaL += l * a;
            cuenta++;
          }
        }
        if (sumaA / cuenta < ALFA_MIN) continue;
        // Puntos claros sobre fondo oscuro: el tamaño sale de la luz de la foto.
        const luz = sumaL / sumaA;
        const i = n++;
        bx[i] = x0 + x;
        by[i] = y0 + y;
        radio[i] = luz;
        if (luz < minimo) minimo = luz;
        if (luz > maximo) maximo = luz;
        const angulo = azar() * TAU;
        const distancia = lado * (DISPERSION_MIN + (DISPERSION_MAX - DISPERSION_MIN) * azar());
        ox[i] = Math.cos(angulo) * distancia;
        oy[i] = Math.sin(angulo) * distancia;
        retraso[i] = azar() * retrasoMax;
      }
    }
    const rango = Math.max(0.2, maximo - minimo);
    for (let i = 0; i < n; i++) {
      let t = limitar((radio[i] - minimo) / rango, 0, 1);
      t += (t * t * (3 - 2 * t) - t) * SUAVIZADO_CONTRASTE;
      // Un mínimo de punto para que pelo y ropa no desaparezcan del todo.
      radio[i] = radioMax * (0.18 + 0.82 * Math.pow(t, EXPONENTE));
    }
    prepararFoto();
  }

  function maquetar(w: number, h: number): void {
    dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
    ancho = w;
    alto = h;
    lienzo.width = Math.max(1, Math.round(w * dpr));
    lienzo.height = Math.max(1, Math.round(h * dpr));
    muestrear();
  }

  /** Avanza `dt` segundos y pinta. Devuelve si queda animación pendiente. */
  function fotograma(dt: number): boolean {
    if (tEntrada < DURACION_ENTRADA) tEntrada = Math.min(DURACION_ENTRADA, tEntrada + dt);
    else if (tRevelado < DURACION_REVELADO) tRevelado = Math.min(DURACION_REVELADO, tRevelado + dt);
    const enEntrada = tEntrada < DURACION_ENTRADA;
    const p = tRevelado / DURACION_REVELADO;
    const revelado = p * p * (3 - 2 * p);

    const aLupa = reducido ? 1 : 1 - Math.exp(-K_LUPA * dt);
    lupa += (objLupa - lupa) * aLupa;
    if (Math.abs(objLupa - lupa) < 0.001) lupa = objLupa;

    if (!reducido) {
      const ai = 1 - Math.exp(-K_INCLINAR * dt);
      inclX += (objInclX - inclX) * ai;
      inclY += (objInclY - inclY) * ai;
      if (Math.abs(objInclX - inclX) < 1e-3) inclX = objInclX;
      if (Math.abs(objInclY - inclY) < 1e-3) inclY = objInclY;
    }
    const pendiente = Math.abs(objLupa - lupa) + Math.abs(objInclX - inclX) + Math.abs(objInclY - inclY);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    if (n === 0) return enEntrada || revelado < 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const desX = inclX * INCLINACION_FOTO;
    const desY = inclY * INCLINACION_FOTO;

    // La foto nítida, con la lupa abierta donde está el puntero.
    if (revelado > 0) {
      ctx.globalAlpha = revelado;
      ctx.drawImage(foto, x0 + desX, y0 + desY, dw, dh);
      ctx.globalAlpha = 1;
      if (lupa > 0.01) {
        const g = ctx.createRadialGradient(punteroX, punteroY, RADIO_LUPA * 0.55, punteroX, punteroY, RADIO_LUPA);
        g.addColorStop(0, `rgba(0,0,0,${lupa})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = g;
        ctx.fillRect(punteroX - RADIO_LUPA, punteroY - RADIO_LUPA, RADIO_LUPA * 2, RADIO_LUPA * 2);
        ctx.globalCompositeOperation = 'source-over';
      }
    }

    // Los puntos: todos durante la entrada; después, solo dentro de la lupa.
    const visiblesFuera = 1 - revelado;
    if (visiblesFuera <= 0.001 && lupa <= 0.01) return enEntrada || revelado < 1 || pendiente > UMBRAL_REPOSO;

    const durPunto = DURACION_ENTRADA * (1 - FRACCION_RETRASO);
    const r2 = RADIO_LUPA * RADIO_LUPA;
    ctx.fillStyle = colores.punto;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = bx[i];
      const y = by[i];
      let factor = visiblesFuera;
      if (lupa > 0.01) {
        const vx = x - punteroX;
        const vy = y - punteroY;
        const d2 = vx * vx + vy * vy;
        if (d2 < r2) {
          const f = 1 - Math.sqrt(d2) / RADIO_LUPA;
          const dentro = Math.min(1, f * 1.8) * lupa;
          if (dentro > factor) factor = dentro;
        }
      }
      if (factor <= 0.02) continue;
      let e = 1;
      if (enEntrada) {
        const pr = limitar((tEntrada - retraso[i]) / durPunto, 0, 1);
        const q = 1 - pr;
        e = 1 - q * q * q * q;
      }
      const rr = radio[i] * e * factor;
      if (rr < 0.3) continue;
      const q = 1 - e;
      const px = x + ox[i] * q + desX * (0.5 + radio[i] / (radioMax || 1));
      const py = y + oy[i] * q + desY * (0.5 + radio[i] / (radioMax || 1));
      ctx.moveTo(px + rr, py);
      ctx.arc(px, py, rr, 0, TAU);
    }
    ctx.fill();
    return enEntrada || revelado < 1 || pendiente > UMBRAL_REPOSO;
  }

  function cuadro(t: number): void {
    rafId = 0;
    if (destruido) return;
    const dt = ultimoT === 0 ? 1 / 60 : Math.min(Math.max((t - ultimoT) / 1000, 0), 0.05);
    ultimoT = t;
    sucio = false;
    animando = fotograma(dt);
    if (animando && !reducido) solicitar();
    else ultimoT = 0;
  }

  function solicitar(): void {
    if (destruido || rafId !== 0) return;
    if (!enVista || !pestanaVisible) {
      sucio = true;
      return;
    }
    rafId = requestAnimationFrame(cuadro);
  }

  function detener(): void {
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
      rafId = 0;
      sucio = true;
    }
    ultimoT = 0;
  }

  function pintarAhora(): void {
    animando = fotograma(0);
    if (animando && !reducido) solicitar();
  }

  function reanudar(): void {
    if (enVista && pestanaVisible && (animando || sucio)) solicitar();
  }

  const contenedor = lienzo.parentElement ?? lienzo;
  const ro = new ResizeObserver((entradas) => {
    const entrada = entradas[entradas.length - 1];
    if (!entrada || destruido) return;
    const w = entrada.contentRect.width;
    const h = entrada.contentRect.height;
    if (w < 1 || h < 1) return;
    if (w === ancho && h === alto && Math.min(window.devicePixelRatio || 1, DPR_MAX) === dpr) return;
    maquetar(w, h);
    pintarAhora();
  });
  ro.observe(contenedor);

  const io = new IntersectionObserver((entradas) => {
    const entrada = entradas[entradas.length - 1];
    if (!entrada || destruido) return;
    enVista = entrada.isIntersecting;
    if (enVista) reanudar();
    else detener();
  });
  io.observe(lienzo);

  const alCambiarVisibilidad = (): void => {
    pestanaVisible = document.visibilityState !== 'hidden';
    if (pestanaVisible) reanudar();
    else detener();
  };
  document.addEventListener('visibilitychange', alCambiarVisibilidad);

  return {
    apuntar(x: number | null, y: number | null): void {
      if (destruido) return;
      const dentro =
        x !== null &&
        y !== null &&
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        x > x0 - RADIO_LUPA &&
        x < x0 + dw + RADIO_LUPA &&
        y > y0 - RADIO_LUPA &&
        y < y0 + dh + RADIO_LUPA;
      if (dentro) {
        punteroX = x;
        punteroY = y;
      }
      const objetivo = dentro ? 1 : 0;
      if (objetivo === objLupa && !dentro) return;
      objLupa = objetivo;
      animando = true;
      if (reducido) {
        lupa = objLupa;
        pintarAhora();
      } else {
        solicitar();
      }
    },

    inclinar(x: number, y: number): void {
      if (destruido || reducido) return;
      const cx = Number.isFinite(x) ? limitar(x, -1, 1) : 0;
      const cy = Number.isFinite(y) ? limitar(y, -1, 1) : 0;
      if (Math.abs(cx - objInclX) < 1e-4 && Math.abs(cy - objInclY) < 1e-4) return;
      objInclX = cx;
      objInclY = cy;
      animando = true;
      solicitar();
    },

    refrescarColores(): void {
      if (destruido) return;
      colores = op.colores();
      prepararFoto();
      if (rafId === 0) pintarAhora();
    },

    destruir(): void {
      if (destruido) return;
      destruido = true;
      detener();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      auxiliar.width = 0;
      auxiliar.height = 0;
      foto.width = 0;
      foto.height = 0;
      n = 0;
      bx = by = radio = ox = oy = retraso = new Float32Array(0);
    },
  };
}
