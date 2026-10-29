/**
 * El certificado camaleón: una hoja en 3D que gira y cambia de marca, flotando dentro de la
 * red de nodos del logo de AHDO. La red toma el color de cada marca al girar.
 * Independiente de Angular: el anfitrión lo carga con import() solo en el navegador.
 */
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  WebGLRenderer,
} from 'three';
import type { MarcaCertificado } from '../../mundos/ahdo/datos';
import { ALTO_LOGICO, ANCHO_LOGICO, dibujarCertificado, type RecursosCertificado } from './dibujo-certificado';

export interface OpcionesCertificado {
  lienzo: HTMLCanvasElement;
  marcas: MarcaCertificado[];
  recursos: RecursosCertificado;
  inicial: number;
  reducido: boolean;
}

export interface EscenaCertificado {
  /** Gira la hoja y la redibuja con la marca indicada. */
  mostrar(indice: number): void;
  /** -1..1, del mouse o del giroscopio. */
  inclinar(x: number, y: number): void;
  /** 0..1 mientras la entrada sale de la pantalla con el scroll. */
  alejar(p: number): void;
  /** El visitante cambió prefers-reduced-motion con la página abierta: la hoja se detiene o retoma. */
  reducir(activo: boolean): void;
  destruir(): void;
}

const GRADO = Math.PI / 180;
const FOV = 30;
const RELACION = ANCHO_LOGICO / ALTO_LOGICO;
const GROSOR = 0.014;
const DURACION_GIRO = 0.95;
const NODOS_RED = 46;
const DISTANCIA_ENLACE = 0.95;
const ENLACES_MAX = 3;
const LILA = new Color('#aaaaff');
const MORADO = new Color('#8b5ffc');

export function crearCertificado(op: OpcionesCertificado): EscenaCertificado {
  const { lienzo, marcas, recursos } = op;
  let reducido = op.reducido;
  const padre: Element = lienzo.parentElement ?? lienzo;

  const renderer = new WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const escena = new Scene();
  const camara = new PerspectiveCamera(FOV, 1, 0.1, 50);

  const desechables: Array<{ dispose(): void }> = [];
  const registrar = <T extends { dispose(): void }>(d: T): T => {
    desechables.push(d);
    return d;
  };

  // ---- las dos caras de la hoja, cada una con su propio lienzo 2D
  const anchoTextura = Math.min(renderer.capabilities.maxTextureSize, window.innerWidth < 700 ? 1280 : 2048);
  const altoTextura = Math.round(anchoTextura / RELACION);
  const caras = [crearCara(), crearCara()];

  function crearCara(): { lienzo: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null; textura: CanvasTexture } {
    const l = document.createElement('canvas');
    l.width = anchoTextura;
    l.height = altoTextura;
    const textura = registrar(new CanvasTexture(l));
    textura.colorSpace = SRGBColorSpace;
    textura.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return { lienzo: l, ctx: l.getContext('2d'), textura };
  }

  function pintar(cara: number, indice: number): void {
    const c = caras[cara];
    const marca = marcas[indice];
    if (!c.ctx || !marca) return;
    dibujarCertificado(c.ctx, anchoTextura, altoTextura, marca, recursos);
    c.textura.needsUpdate = true;
  }

  const borde = registrar(new MeshBasicMaterial({ color: 0xe9e6f5 }));
  const frente = registrar(new MeshBasicMaterial({ map: caras[0].textura }));
  const dorso = registrar(new MeshBasicMaterial({ map: caras[1].textura }));
  // Orden de caras de BoxGeometry: +x, -x, +y, -y, +z (frente), -z (dorso).
  const hoja = new Mesh(registrar(new BoxGeometry(RELACION, 1, GROSOR)), [borde, borde, borde, borde, frente, dorso]);
  const soporte = new Group();
  soporte.add(hoja);
  escena.add(soporte);

  // ---- halo lila detrás de la hoja
  const halo = new Mesh(
    registrar(new PlaneGeometry(4.2, 3.2)),
    registrar(
      new MeshBasicMaterial({
        map: registrar(texturaHalo()),
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        opacity: 0.55,
      }),
    ),
  );
  halo.position.z = -0.9;
  // Primero el halo: así no tiñe de morado las burbujas que quedan detrás.
  halo.renderOrder = -1;
  escena.add(halo);

  // ---- la red de nodos del logo
  const red = new Group();
  escena.add(red);
  const azar = mulberry32(20240519);
  const puntos: number[] = [];
  const radios: number[] = [];
  while (puntos.length / 3 < NODOS_RED) {
    const x = (azar() * 2 - 1) * 2.7;
    const y = (azar() * 2 - 1) * 1.75;
    const z = (azar() * 2 - 1) * 1.1 - 0.25;
    // Nada delante de la hoja ni atravesándola: la red queda detrás o a los lados.
    if (Math.abs(x) < RELACION / 2 + 0.15 && Math.abs(y) < 0.66 && z > -0.4) continue;
    puntos.push(x, y, z);
    radios.push(azar() < 0.18 ? 0.09 + azar() * 0.08 : 0.018 + azar() * 0.03);
  }
  const segmentos: number[] = [];
  const conteo = new Array<number>(NODOS_RED).fill(0);
  for (let i = 0; i < NODOS_RED; i++) {
    for (let j = i + 1; j < NODOS_RED; j++) {
      if (conteo[i] >= ENLACES_MAX || conteo[j] >= ENLACES_MAX) continue;
      const dx = puntos[i * 3] - puntos[j * 3];
      const dy = puntos[i * 3 + 1] - puntos[j * 3 + 1];
      const dz = puntos[i * 3 + 2] - puntos[j * 3 + 2];
      if (Math.hypot(dx, dy, dz) > DISTANCIA_ENLACE) continue;
      segmentos.push(puntos[i * 3], puntos[i * 3 + 1], puntos[i * 3 + 2], puntos[j * 3], puntos[j * 3 + 1], puntos[j * 3 + 2]);
      conteo[i]++;
      conteo[j]++;
    }
  }
  const geoLineas = registrar(new BufferGeometry());
  geoLineas.setAttribute('position', new Float32BufferAttribute(segmentos, 3));
  const matLineas = registrar(new LineBasicMaterial({ color: LILA, transparent: true, opacity: 0.32, depthWrite: false }));
  red.add(new LineSegments(geoLineas, matLineas));

  const matNodos = registrar(new MeshBasicMaterial({ color: MORADO }));
  const matBurbujas = registrar(new MeshBasicMaterial({ color: LILA, transparent: true, opacity: 0.78, depthWrite: false }));
  const geoEsfera = registrar(new SphereGeometry(1, 20, 14));
  let pequenos = 0;
  for (const r of radios) if (r < 0.09) pequenos++;
  const nodos = registrar(new InstancedMesh(geoEsfera, matNodos, Math.max(1, pequenos)));
  const burbujas = registrar(new InstancedMesh(geoEsfera, matBurbujas, Math.max(1, NODOS_RED - pequenos)));
  nodos.count = pequenos;
  burbujas.count = NODOS_RED - pequenos;
  red.add(nodos, burbujas);
  const indiceBurbuja: number[] = [];
  {
    const m = new Matrix4();
    let a = 0;
    let b = 0;
    for (let i = 0; i < NODOS_RED; i++) {
      const r = radios[i];
      m.makeScale(r, r, r).setPosition(puntos[i * 3], puntos[i * 3 + 1], puntos[i * 3 + 2]);
      if (r < 0.09) nodos.setMatrixAt(a++, m);
      else {
        indiceBurbuja.push(i);
        burbujas.setMatrixAt(b++, m);
      }
    }
  }

  // ---- estado (cero asignaciones por cuadro)
  const colorLinea = new Color().copy(LILA);
  const colorLineaObjetivo = new Color().copy(LILA);
  const colorBurbuja = new Color().copy(LILA);
  const colorBurbujaObjetivo = new Color().copy(LILA);
  const matriz = new Matrix4();

  let actual = Math.max(0, Math.min(marcas.length - 1, op.inicial));
  let caraVisible = 0;
  let vuelta = 0;
  let giroDesde = 0;
  let giroInicio = -1;
  let pendiente: number | null = null;
  let pulso = 0;

  let tiempo = 0;
  let incX = 0;
  let incY = 0;
  let incXObjetivo = 0;
  let incYObjetivo = 0;
  let lejania = 0;
  let lejaniaObjetivo = 0;

  let anchoCss = 0;
  let altoCss = 0;
  let idBucle = 0;
  let idDibujo = 0;
  let ultimo = 0;
  let enVista = false;
  let pestanaVisible = document.visibilityState !== 'hidden';
  let destruido = false;

  pintar(0, actual);
  tintar(actual, true);

  function tintar(indice: number, inmediato: boolean): void {
    const marca = marcas[indice];
    if (!marca) return;
    // La red se tiñe del color de la marca; los nodos pequeños siguen en el morado de AHDO.
    colorLineaObjetivo.set(marca.colores.primario);
    colorBurbujaObjetivo.set(marca.colores.primario);
    if (inmediato) {
      colorLinea.copy(colorLineaObjetivo);
      colorBurbuja.copy(colorBurbujaObjetivo);
    }
  }

  function encuadrar(): void {
    const tanV = Math.tan((FOV * GRADO) / 2);
    const aspecto = camara.aspect;
    // La hoja ocupa cerca del 70 % del escenario, con aire para girar e inclinarse.
    const dV = 0.5 / (tanV * 0.62);
    const dH = RELACION / 2 / (tanV * aspecto * 0.74);
    camara.position.set(0, 0, Math.max(dV, dH));
    camara.lookAt(0, 0, 0);
    camara.updateProjectionMatrix();
  }

  function facil(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function actualizar(dt: number, ahora: number): void {
    if (!reducido) tiempo += dt;
    const k = reducido ? 1 : 1 - Math.exp(-dt * 4);
    incX += (incXObjetivo - incX) * k;
    incY += (incYObjetivo - incY) * k;
    lejania += (lejaniaObjetivo - lejania) * (reducido ? 1 : 1 - Math.exp(-dt * 8));

    // Giro de la hoja.
    if (giroInicio >= 0) {
      const t = Math.min((ahora - giroInicio) / (DURACION_GIRO * 1000), 1);
      hoja.rotation.y = giroDesde + (vuelta * Math.PI - giroDesde) * facil(t);
      if (t >= 1) {
        giroInicio = -1;
        hoja.rotation.y = vuelta * Math.PI;
        if (pendiente !== null) {
          const siguiente = pendiente;
          pendiente = null;
          mostrar(siguiente);
        }
      }
    }

    const vaiven = reducido ? 0 : Math.sin(tiempo * 0.6) * 0.05;
    soporte.position.y = (reducido ? 0 : Math.sin(tiempo * 1.1) * 0.03) + lejania * 0.35;
    soporte.position.z = -lejania * 0.9;
    soporte.rotation.x = -0.06 + incY * 0.16 - lejania * 0.55;
    soporte.rotation.y = incX * 0.26 + vaiven;

    red.rotation.y = tiempo * 0.05 + incX * 0.12;
    red.rotation.x = incY * 0.08;
    red.scale.setScalar(1 + lejania * 0.35);
    halo.material.opacity = 0.55 * (1 - lejania * 0.6);

    const kc = reducido ? 1 : 1 - Math.exp(-dt * 3);
    colorLinea.lerp(colorLineaObjetivo, kc);
    colorBurbuja.lerp(colorBurbujaObjetivo, kc);
    matLineas.color.copy(colorLinea);
    matBurbujas.color.copy(colorBurbuja);

    // Las burbujas laten al cambiar de marca.
    if (pulso > 0 || reducido) {
      pulso = reducido ? 0 : Math.max(0, pulso - dt * 1.6);
      const s = 1 + 0.45 * pulso * pulso;
      for (let b = 0; b < indiceBurbuja.length; b++) {
        const i = indiceBurbuja[b];
        const r = radios[i] * s;
        matriz.makeScale(r, r, r).setPosition(puntos[i * 3], puntos[i * 3 + 1], puntos[i * 3 + 2]);
        burbujas.setMatrixAt(b, matriz);
      }
      burbujas.instanceMatrix.needsUpdate = true;
    }
  }

  function dibujar(): void {
    if (anchoCss < 1 || altoCss < 1) return;
    renderer.render(escena, camara);
  }

  function mostrar(indice: number): void {
    if (destruido || indice < 0 || indice >= marcas.length) return;
    if (giroInicio >= 0) {
      pendiente = indice === actual ? null : indice;
      return;
    }
    if (indice === actual) return;
    actual = indice;
    tintar(indice, reducido);
    if (reducido) {
      // Sin giro: la cara visible se redibuja y listo.
      pintar(caraVisible, indice);
      solicitarDibujo();
      return;
    }
    const oculta = 1 - caraVisible;
    pintar(oculta, indice);
    caraVisible = oculta;
    giroDesde = hoja.rotation.y;
    vuelta++;
    giroInicio = performance.now();
    pulso = 1;
    evaluarBucle();
  }

  // ---- bucle

  function debeCorrer(): boolean {
    return !reducido && !destruido && enVista && pestanaVisible;
  }

  function cuadro(ahora: number): void {
    idBucle = 0;
    if (destruido) return;
    const dt = Math.min(Math.max((ahora - ultimo) / 1000, 0), 0.05);
    ultimo = ahora;
    actualizar(dt, ahora);
    dibujar();
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

  function solicitarDibujo(): void {
    if (destruido || idBucle || idDibujo) return;
    idDibujo = requestAnimationFrame(() => {
      idDibujo = 0;
      if (destruido) return;
      actualizar(0, performance.now());
      dibujar();
    });
  }

  function redimensionar(ancho: number, alto: number): void {
    if (ancho < 1 || alto < 1) return;
    anchoCss = ancho;
    altoCss = alto;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    encuadrar();
    solicitarDibujo();
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
    if (enVista) solicitarDibujo();
  });
  observadorVista.observe(lienzo);

  redimensionar(padre.clientWidth, padre.clientHeight);
  actualizar(0, performance.now());
  dibujar();

  return {
    mostrar,

    inclinar(x: number, y: number): void {
      // Con movimiento reducido la escena no sigue al mouse ni al giroscopio: queda quieta.
      if (destruido || reducido) return;
      incXObjetivo = limitar(Number.isFinite(x) ? x : 0, -1, 1);
      incYObjetivo = limitar(Number.isFinite(y) ? y : 0, -1, 1);
    },

    alejar(p: number): void {
      if (destruido) return;
      lejaniaObjetivo = limitar(Number.isFinite(p) ? p : 0, 0, 1);
      if (reducido) solicitarDibujo();
    },

    reducir(activo: boolean): void {
      if (destruido || activo === reducido) return;
      reducido = activo;
      if (activo) {
        // El giro en curso termina de golpe y la hoja queda de frente, quieta.
        incXObjetivo = 0;
        incYObjetivo = 0;
        pulso = 0;
        if (giroInicio >= 0) {
          giroInicio = -1;
          hoja.rotation.y = vuelta * Math.PI;
        }
        if (pendiente !== null) {
          const siguiente = pendiente;
          pendiente = null;
          mostrar(siguiente);
        }
      }
      evaluarBucle();
      solicitarDibujo();
    },

    destruir(): void {
      if (destruido) return;
      destruido = true;
      if (idBucle) cancelAnimationFrame(idBucle);
      if (idDibujo) cancelAnimationFrame(idDibujo);
      idBucle = 0;
      idDibujo = 0;
      observadorTamano.disconnect();
      observadorVista.disconnect();
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      for (const d of desechables) d.dispose();
      desechables.length = 0;
      escena.clear();
      renderer.dispose();
      // Suelta el contexto WebGL ya, sin esperar al recolector: el navegador limita cuántos hay vivos.
      renderer.forceContextLoss();
      for (const c of caras) {
        c.lienzo.width = 0;
        c.lienzo.height = 0;
      }
    },
  };
}

// ---------------------------------------------------------------- utilidades

function limitar(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Azar con semilla: la red sale igual en cada visita. */
function mulberry32(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function texturaHalo(): CanvasTexture {
  const l = document.createElement('canvas');
  l.width = 256;
  l.height = 256;
  const ctx = l.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(139, 95, 252, 0.9)');
    g.addColorStop(0.45, 'rgba(0, 127, 184, 0.28)');
    g.addColorStop(1, 'rgba(20, 13, 38, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  const t = new CanvasTexture(l);
  t.colorSpace = SRGBColorSpace;
  return t;
}
