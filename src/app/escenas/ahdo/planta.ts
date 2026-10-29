/**
 * "La vida de un pago": la maqueta de planta de AHDO, con sus módulos como naves y los
 * conductos por donde viaja cada operación. El scroll decide el paso: la escena recibe un
 * progreso continuo (0..pasos-1) y la cámara, los resaltes y los paquetes lo siguen.
 * Independiente de Angular: el anfitrión lo carga con import() solo en el navegador.
 */
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  EdgesGeometry,
  Float32BufferAttribute,
  HemisphereLight,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';
import type { NodoPlanta, NodoPlantaId, PasoPago, TipoNodo } from '../../mundos/ahdo/datos';

export interface ColoresPlanta {
  lineaSuave: string;
  linea: string;
  reposo: string;
  tinta3: string;
  senal: string;
  morado: string;
  azul: string;
  verde: string;
}

export interface PosicionEtiqueta {
  x: number;
  y: number;
  visible: boolean;
}

export interface OpcionesPlanta {
  lienzo: HTMLCanvasElement;
  nodos: NodoPlanta[];
  conductos: Array<[NodoPlantaId, NodoPlantaId]>;
  pasos: PasoPago[];
  colores: () => ColoresPlanta;
  reducido: boolean;
  /** Px CSS relativos al lienzo. El objeto se reutiliza entre cuadros: léelo en el momento. */
  alPosicionar: (pos: Record<string, PosicionEtiqueta>) => void;
}

export interface EscenaPlanta {
  /** Progreso continuo entre pasos: 2.5 es la mitad entre el tercero y el cuarto. */
  progreso(p: number): void;
  /** Fracción del ancho que tapa el texto a la izquierda; la maqueta se corre a la derecha. */
  reservar(fraccion: number): void;
  inclinar(x: number, y: number): void;
  refrescarColores(): void;
  /** El visitante cambió prefers-reduced-motion con la página abierta: la escena se detiene o retoma. */
  reducir(activo: boolean): void;
  destruir(): void;
}

const GRADO = Math.PI / 180;
const FOV = 30;
const VISTA = new Vector3(0, 0.62, 0.785).normalize();
const VELOCIDAD = 3.2;
const CICLO = 1.9;
const POOL = 10;
const RADIO_PAQUETE = 0.13;
const ALTURA_PAQUETE = 0.16;
const ANCHO_CONDUCTO = 0.07;

interface Nave {
  nodo: NodoPlanta;
  relleno: MeshLambertMaterial;
  arista: LineBasicMaterial;
  activo: Color;
  peso: number;
  etiqueta: PosicionEtiqueta;
  ancla: Vector3;
}

interface Conducto {
  clave: string;
  material: MeshBasicMaterial;
  peso: number;
  /** Puntos (x, z) del codo en ángulo recto, de `de` hacia `a`. */
  puntos: number[];
}

interface Ruta {
  /** x, z por punto. */
  xz: Float32Array;
  acumulado: Float32Array;
  total: number;
}

interface Encuadre {
  x: number;
  z: number;
  distancia: number;
}

export function crearPlanta(op: OpcionesPlanta): EscenaPlanta {
  const { lienzo, pasos } = op;
  let reducido = op.reducido;
  const padre: Element = lienzo.parentElement ?? lienzo;
  const leerColor = crearLectorColor(lienzo);

  const renderer = new WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const escena = new Scene();
  const camara = new PerspectiveCamera(FOV, 1, 0.1, 200);

  const desechables: Array<{ dispose(): void }> = [];
  const registrar = <T extends { dispose(): void }>(d: T): T => {
    desechables.push(d);
    return d;
  };

  escena.add(new HemisphereLight(0xffffff, new Color().setRGB(0.35, 0.32, 0.45), Math.PI * 0.75));
  const luz = new DirectionalLight(0xffffff, Math.PI * 0.45);
  luz.position.set(3, 8, 6);
  escena.add(luz);

  // ---- piso
  const reticula: number[] = [];
  for (let i = -9; i <= 9; i++) reticula.push(-9, 0, i, 9, 0, i, i, 0, -9, i, 0, 9);
  const geoReticula = registrar(new BufferGeometry());
  geoReticula.setAttribute('position', new Float32BufferAttribute(reticula, 3));
  const matReticula = registrar(new LineBasicMaterial({ transparent: true }));
  escena.add(new LineSegments(geoReticula, matReticula));

  // ---- naves
  const porId = new Map<NodoPlantaId, Nave>();
  const naves: Nave[] = [];
  const posiciones: Record<string, PosicionEtiqueta> = {};
  const colorReposo = new Color();
  const colorTinta3 = new Color();
  const colorAristaActiva = new Color(1, 1, 1);
  const colorSenal = new Color();
  const colorExito = new Color();
  const colorLinea = new Color();
  const porTipo: Record<TipoNodo, Color> = { cliente: new Color(), sistema: new Color(), externo: new Color() };

  for (const nodo of op.nodos) {
    const geo = registrar(
      nodo.cilindro
        ? new CylinderGeometry(nodo.ancho / 2, nodo.ancho / 2, nodo.alto, 40)
        : new BoxGeometry(nodo.ancho, nodo.alto, nodo.fondo),
    );
    const relleno = registrar(
      new MeshLambertMaterial({ polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    );
    const malla = new Mesh(geo, relleno);
    malla.position.set(nodo.x, nodo.alto / 2, nodo.z);
    const arista = registrar(new LineBasicMaterial({ transparent: true }));
    malla.add(new LineSegments(registrar(new EdgesGeometry(geo, 25)), arista));
    escena.add(malla);
    const nave: Nave = {
      nodo,
      relleno,
      arista,
      activo: porTipo[nodo.tipo],
      peso: 0,
      etiqueta: { x: 0, y: 0, visible: false },
      ancla: new Vector3(nodo.x, nodo.alto + 0.25, nodo.z),
    };
    naves.push(nave);
    porId.set(nodo.id, nave);
    posiciones[nodo.id] = nave.etiqueta;
  }

  // ---- conductos en ángulo recto sobre el piso
  const conductos: Conducto[] = [];
  const porClave = new Map<string, Conducto>();
  const cajaConducto = registrar(new BoxGeometry(1, 1, 1));
  for (const [de, a] of op.conductos) {
    const A = porId.get(de)?.nodo;
    const B = porId.get(a)?.nodo;
    if (!A || !B) continue;
    const puntos = [A.x, A.z];
    if (A.x !== B.x && A.z !== B.z) puntos.push(B.x, A.z);
    puntos.push(B.x, B.z);
    const material = registrar(new MeshBasicMaterial());
    for (let i = 0; i < puntos.length - 2; i += 2) {
      const px = puntos[i];
      const pz = puntos[i + 1];
      const qx = puntos[i + 2];
      const qz = puntos[i + 3];
      const largo = Math.abs(qx - px) + Math.abs(qz - pz);
      if (largo < 1e-3) continue;
      const enX = Math.abs(qx - px) > Math.abs(qz - pz);
      const tramo = new Mesh(cajaConducto, material);
      tramo.scale.set(enX ? largo + ANCHO_CONDUCTO : ANCHO_CONDUCTO, 0.03, enX ? ANCHO_CONDUCTO : largo + ANCHO_CONDUCTO);
      tramo.position.set((px + qx) / 2, 0.02, (pz + qz) / 2);
      escena.add(tramo);
    }
    const c: Conducto = { clave: `${de}>${a}`, material, peso: 0, puntos };
    conductos.push(c);
    porClave.set(c.clave, c);
  }

  /** Conducto entre dos nodos en cualquier sentido, y si hay que recorrerlo al revés. */
  function buscarConducto(de: NodoPlantaId, a: NodoPlantaId): { c: Conducto; reves: boolean } | null {
    const directo = porClave.get(`${de}>${a}`);
    if (directo) return { c: directo, reves: false };
    const inverso = porClave.get(`${a}>${de}`);
    return inverso ? { c: inverso, reves: true } : null;
  }

  // ---- pasos: nodos, conductos y rutas precalculadas
  // Arreglos y no Set: el bucle de cada cuadro los recorre por índice, sin crear iteradores.
  const nodosPaso: Nave[][] = [];
  const conductosPaso: Conducto[][] = [];
  const rutasPaso: Array<Array<{ ruta: Ruta; exito: boolean }>> = [];
  for (const paso of pasos) {
    const navesPaso: Nave[] = [];
    for (const id of new Set(paso.nodos)) {
      const nave = porId.get(id);
      if (nave) navesPaso.push(nave);
    }
    nodosPaso.push(navesPaso);
    const usados = new Set<Conducto>();
    const rutas: Array<{ ruta: Ruta; exito: boolean }> = [];
    for (const flujo of paso.flujos) {
      const xz: number[] = [];
      for (let i = 0; i < flujo.ruta.length - 1; i++) {
        const hallado = buscarConducto(flujo.ruta[i], flujo.ruta[i + 1]);
        if (!hallado) continue;
        usados.add(hallado.c);
        const p = hallado.c.puntos;
        const orden: number[] = [];
        for (let k = 0; k < p.length; k += 2) orden.push(k);
        if (hallado.reves) orden.reverse();
        for (let k = xz.length ? 1 : 0; k < orden.length; k++) xz.push(p[orden[k]], p[orden[k] + 1]);
      }
      if (xz.length >= 4) rutas.push({ ruta: crearRuta(xz), exito: flujo.tono === 'exito' });
    }
    conductosPaso.push(Array.from(usados));
    rutasPaso.push(rutas);
  }

  // ---- paquetes: burbujas como las del logo, en un pool fijo
  const matPaquete = registrar(new MeshBasicMaterial({ color: 0xffffff }));
  const paquetes = registrar(new InstancedMesh(registrar(new SphereGeometry(RADIO_PAQUETE, 16, 12)), matPaquete, POOL));
  paquetes.instanceMatrix.setUsage(DynamicDrawUsage);
  paquetes.frustumCulled = false;
  escena.add(paquetes);
  const pRuta: Array<Ruta | null> = new Array<Ruta | null>(POOL).fill(null);
  const pS = new Float32Array(POOL);
  const pExito = new Uint8Array(POOL);
  const pRebote = new Uint8Array(POOL);

  // ---- anillo del aviso repetido
  const matAnillo = registrar(new MeshBasicMaterial({ transparent: true, side: DoubleSide, depthWrite: false }));
  const anillo = new Mesh(registrar(new RingGeometry(1.25, 1.38, 48)), matAnillo);
  anillo.rotation.x = -Math.PI / 2;
  const api = porId.get('api')?.nodo;
  anillo.position.set(api?.x ?? 0, 0.05, api?.z ?? 0);
  anillo.visible = false;
  escena.add(anillo);
  let anilloT = 1;

  // ---- estado (cero asignaciones por cuadro)
  const encuadres: Encuadre[] = pasos.map(() => ({ x: 0, z: 0, distancia: 12 }));
  const foco = new Vector3();
  const proyectado = new Vector3();
  const derecha = new Vector3();
  const matriz = new Matrix4();
  const colorTmp = new Color();

  let pObjetivo = 0;
  let pActual = 0;
  let dominante = -1;
  let reloj = 0;
  let incX = 0;
  let incY = 0;
  let incXObjetivo = 0;
  let incYObjetivo = 0;
  let reserva = 0;
  let anchoCss = 0;
  let altoCss = 0;
  let distanciaVista = 12;

  let idBucle = 0;
  let idDibujo = 0;
  let ultimo = 0;
  let enVista = false;
  let pestanaVisible = document.visibilityState !== 'hidden';
  let destruido = false;

  // ---- encuadre por paso

  function calcularEncuadres(): void {
    const tanMedio = Math.tan((FOV * GRADO) / 2);
    const aspecto = Math.max(camara.aspect * (1 - reserva), 0.35);
    pasos.forEach((paso, j) => {
      let cx = 0;
      let cz = 0;
      let n = 0;
      for (const id of paso.nodos) {
        const nodo = porId.get(id)?.nodo;
        if (!nodo) continue;
        cx += nodo.x;
        cz += nodo.z;
        n++;
      }
      cx /= Math.max(n, 1);
      cz /= Math.max(n, 1);
      let radio = 0;
      for (const id of paso.nodos) {
        const nodo = porId.get(id)?.nodo;
        if (!nodo) continue;
        radio = Math.max(radio, Math.hypot(nodo.x - cx, nodo.z - cz) + Math.max(nodo.ancho, nodo.fondo) / 2);
      }
      radio += 2.2;
      const d = Math.max(radio / (tanMedio * Math.min(aspecto, 1.6)), (radio / tanMedio) * 0.62);
      encuadres[j].x = cx;
      encuadres[j].z = cz;
      encuadres[j].distancia = limitar(d, 9, 24);
    });
  }

  function suave(t: number): number {
    return t * t * (3 - 2 * t);
  }

  function posicionarCamara(): void {
    const ultimoPaso = pasos.length - 1;
    const p = limitar(pActual, 0, ultimoPaso);
    const i = Math.min(Math.floor(p), Math.max(ultimoPaso - 1, 0));
    const s = suave(limitar(p - i, 0, 1));
    const a = encuadres[i];
    const b = encuadres[Math.min(i + 1, ultimoPaso)];
    foco.set(a.x + (b.x - a.x) * s, 0, a.z + (b.z - a.z) * s);
    distanciaVista = a.distancia + (b.distancia - a.distancia) * s;

    camara.position.copy(foco).addScaledVector(VISTA, distanciaVista);
    camara.position.x += incX * 0.9;
    camara.position.y -= incY * 0.5;
    camara.lookAt(foco);
    camara.updateMatrixWorld();

    // Corre la vista para que la maqueta quede en la parte libre del lienzo.
    if (reserva > 0) {
      const anchoVista = 2 * distanciaVista * Math.tan((FOV * GRADO) / 2) * camara.aspect;
      derecha.setFromMatrixColumn(camara.matrixWorld, 0);
      camara.position.addScaledVector(derecha, -(reserva / 2) * anchoVista);
      camara.updateMatrixWorld();
    }
  }

  // ---- colores

  function aplicar(destino: Color, valor: string): number {
    const c = leerColor(valor);
    destino.setRGB(c.r, c.g, c.b, SRGBColorSpace);
    return c.a;
  }

  function aplicarColores(): void {
    const c = op.colores();
    matReticula.opacity = aplicar(matReticula.color, c.lineaSuave) * 0.55;
    aplicar(colorLinea, c.linea);
    aplicar(colorReposo, c.reposo);
    aplicar(colorTinta3, c.tinta3);
    aplicar(colorSenal, c.senal);
    aplicar(colorExito, c.verde);
    aplicar(porTipo.cliente, c.senal);
    aplicar(porTipo.sistema, c.morado);
    aplicar(porTipo.externo, c.azul);
    matAnillo.color.copy(colorSenal);
  }

  // ---- animación

  function pesoDe(j: number): number {
    return Math.max(0, 1 - Math.abs(pActual - j));
  }

  function actualizarPesos(): void {
    for (let n = 0; n < naves.length; n++) naves[n].peso = 0;
    for (let n = 0; n < conductos.length; n++) conductos[n].peso = 0;
    for (let j = 0; j < pasos.length; j++) {
      const w = pesoDe(j);
      if (w <= 0) continue;
      const navesPaso = nodosPaso[j];
      for (let n = 0; n < navesPaso.length; n++) navesPaso[n].peso = Math.min(1, navesPaso[n].peso + w);
      const conductosDelPaso = conductosPaso[j];
      for (let n = 0; n < conductosDelPaso.length; n++) {
        conductosDelPaso[n].peso = Math.min(1, conductosDelPaso[n].peso + w);
      }
    }
    for (let n = 0; n < naves.length; n++) {
      const nave = naves[n];
      const h = nave.peso;
      nave.relleno.color.copy(colorReposo).lerp(nave.activo, h);
      nave.arista.color.copy(colorTinta3).lerp(colorAristaActiva, h * 0.8);
      nave.arista.opacity = 0.55 + 0.45 * h;
    }
    for (let n = 0; n < conductos.length; n++) {
      const c = conductos[n];
      c.material.color.copy(colorLinea).lerp(colorSenal, c.peso);
    }
  }

  function lanzar(ruta: Ruta, exito: boolean, retraso: number, rebote: boolean): void {
    for (let k = 0; k < POOL; k++) {
      if (pRuta[k]) continue;
      pRuta[k] = ruta;
      pS[k] = -retraso * VELOCIDAD;
      pExito[k] = exito ? 1 : 0;
      pRebote[k] = rebote ? 1 : 0;
      return;
    }
  }

  function vaciarPaquetes(): void {
    for (let k = 0; k < POOL; k++) pRuta[k] = null;
  }

  function sembrar(): void {
    const paso = pasos[dominante];
    const rutas = rutasPaso[dominante];
    if (!paso || !rutas || rutas.length === 0) return;
    if (paso.doble) {
      lanzar(rutas[0].ruta, rutas[0].exito, 0, false);
      lanzar(rutas[0].ruta, rutas[0].exito, 0.45, true);
    } else {
      rutas.forEach((r, i) => lanzar(r.ruta, r.exito, i * 0.25, false));
    }
  }

  /** Movimiento reducido: un cuadro fijo con los paquetes a mitad de camino. */
  function sembrarFijo(): void {
    vaciarPaquetes();
    const paso = pasos[dominante];
    const rutas = rutasPaso[dominante];
    if (!paso || !rutas) return;
    rutas.forEach((r, i) => lanzar(r.ruta, r.exito, 0, false));
    for (let k = 0; k < POOL; k++) {
      const ruta = pRuta[k];
      if (ruta) pS[k] = ruta.total * 0.55;
    }
    if (paso.doble && rutas[0]) {
      lanzar(rutas[0].ruta, rutas[0].exito, 0, true);
      for (let k = 0; k < POOL; k++) if (pRebote[k] && pRuta[k]) pS[k] = rutas[0].ruta.total * 0.9;
    }
    anillo.visible = !!paso.doble;
    anillo.scale.setScalar(1.15);
    matAnillo.opacity = 0.6;
  }

  function actualizarPaquetes(dt: number): void {
    let visibles = 0;
    for (let k = 0; k < POOL; k++) {
      const ruta = pRuta[k];
      if (!ruta) continue;
      if (!reducido) pS[k] += dt * VELOCIDAD;
      if (pS[k] >= ruta.total) {
        if (pRebote[k]) anilloT = 0;
        pRuta[k] = null;
        continue;
      }
      if (pS[k] < 0) continue;
      puntoEn(ruta, pS[k], proyectado);
      matriz.makeTranslation(proyectado.x, ALTURA_PAQUETE, proyectado.z);
      paquetes.setMatrixAt(visibles, matriz);
      colorTmp.copy(pExito[k] ? colorExito : colorSenal);
      paquetes.setColorAt(visibles, colorTmp);
      visibles++;
    }
    paquetes.count = visibles;
    paquetes.instanceMatrix.needsUpdate = true;
    if (paquetes.instanceColor) paquetes.instanceColor.needsUpdate = true;
  }

  function actualizar(dt: number): void {
    const k = reducido ? 1 : 1 - Math.exp(-dt * 6);
    pActual += (pObjetivo - pActual) * k;
    if (Math.abs(pObjetivo - pActual) < 1e-4) pActual = pObjetivo;
    const ki = reducido ? 1 : 1 - Math.exp(-dt * 3.5);
    incX += (incXObjetivo - incX) * ki;
    incY += (incYObjetivo - incY) * ki;

    const d = limitar(Math.round(pActual), 0, pasos.length - 1);
    if (d !== dominante) {
      dominante = d;
      vaciarPaquetes();
      reloj = 0;
      anilloT = 1;
      anillo.visible = false;
      if (reducido) sembrarFijo();
    }

    actualizarPesos();

    if (!reducido) {
      reloj -= dt;
      if (reloj <= 0) {
        sembrar();
        reloj = CICLO;
      }
      if (anilloT < 1) {
        anilloT = Math.min(anilloT + dt / 0.8, 1);
        anillo.visible = anilloT < 1;
        anillo.scale.setScalar(1 + anilloT * 0.6);
        matAnillo.opacity = 1 - anilloT;
      }
    }
    actualizarPaquetes(dt);
  }

  function posicionarEtiquetas(): void {
    for (const nave of naves) {
      proyectado.copy(nave.ancla).project(camara);
      const x = (proyectado.x * 0.5 + 0.5) * anchoCss;
      const y = (-proyectado.y * 0.5 + 0.5) * altoCss;
      nave.etiqueta.x = x;
      nave.etiqueta.y = y;
      nave.etiqueta.visible =
        proyectado.z > -1 && proyectado.z < 1 && x >= 0 && x <= anchoCss && y >= 24 && y <= altoCss;
    }
    op.alPosicionar(posiciones);
  }

  function dibujar(): void {
    if (anchoCss < 1 || altoCss < 1) return;
    posicionarCamara();
    renderer.render(escena, camara);
    posicionarEtiquetas();
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
    actualizar(dt);
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
      actualizar(0);
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
    camara.updateProjectionMatrix();
    calcularEncuadres();
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

  aplicarColores();
  redimensionar(padre.clientWidth, padre.clientHeight);
  actualizar(0);
  dibujar();

  return {
    progreso(p: number): void {
      if (destruido || !Number.isFinite(p)) return;
      pObjetivo = limitar(p, 0, pasos.length - 1);
      if (reducido) solicitarDibujo();
    },

    reservar(fraccion: number): void {
      if (destruido) return;
      reserva = limitar(fraccion, 0, 0.6);
      calcularEncuadres();
      solicitarDibujo();
    },

    inclinar(x: number, y: number): void {
      // Con movimiento reducido la escena no sigue al mouse ni al giroscopio: queda quieta.
      if (destruido || reducido) return;
      incXObjetivo = limitar(Number.isFinite(x) ? x : 0, -1, 1);
      incYObjetivo = limitar(Number.isFinite(y) ? y : 0, -1, 1);
    },

    refrescarColores(): void {
      if (destruido) return;
      aplicarColores();
      solicitarDibujo();
    },

    reducir(activo: boolean): void {
      if (destruido || activo === reducido) return;
      reducido = activo;
      if (activo) {
        incXObjetivo = 0;
        incYObjetivo = 0;
      }
      // Fuerza a resembrar el paso: cuadro fijo si queda reducido, paquetes en marcha si no.
      dominante = -1;
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
    },
  };
}

// ---------------------------------------------------------------- utilidades

function limitar(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function crearRuta(xz: number[]): Ruta {
  const n = xz.length / 2;
  const acumulado = new Float32Array(n);
  for (let i = 1; i < n; i++) {
    acumulado[i] = acumulado[i - 1] + Math.hypot(xz[i * 2] - xz[i * 2 - 2], xz[i * 2 + 1] - xz[i * 2 - 1]);
  }
  return { xz: Float32Array.from(xz), acumulado, total: acumulado[n - 1] };
}

function puntoEn(r: Ruta, s: number, destino: Vector3): Vector3 {
  const n = r.acumulado.length;
  for (let i = 0; i < n - 1; i++) {
    if (s <= r.acumulado[i + 1] || i === n - 2) {
      const largo = r.acumulado[i + 1] - r.acumulado[i];
      const t = largo > 0 ? limitar((s - r.acumulado[i]) / largo, 0, 1) : 0;
      return destino.set(
        r.xz[i * 2] + (r.xz[i * 2 + 2] - r.xz[i * 2]) * t,
        0,
        r.xz[i * 2 + 1] + (r.xz[i * 2 + 3] - r.xz[i * 2 + 1]) * t,
      );
    }
  }
  return destino.set(r.xz[0], 0, r.xz[1]);
}

interface ColorLeido {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Convierte cualquier color CSS (hex, rgb, var(--token)…) a sRGB con un canvas 2D. */
function crearLectorColor(referencia: Element): (valor: string) => ColorLeido {
  const cache = new Map<string, ColorLeido>();
  const auxiliar = document.createElement('canvas');
  auxiliar.width = 1;
  auxiliar.height = 1;
  const ctx = auxiliar.getContext('2d', { willReadFrequently: true });
  const negro: ColorLeido = { r: 0, g: 0, b: 0, a: 1 };
  return (valor: string): ColorLeido => {
    let css = valor.trim();
    const m = /^var\(\s*(--[^,\s)]+)\s*(?:,\s*(.*))?\)$/.exec(css);
    if (m) css = getComputedStyle(referencia).getPropertyValue(m[1]).trim() || (m[2] ?? '').trim();
    const previo = cache.get(css);
    if (previo) return previo;
    let leido = negro;
    if (ctx) {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000000';
      ctx.fillStyle = css;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      leido = { r: (d[0] ?? 0) / 255, g: (d[1] ?? 0) / 255, b: (d[2] ?? 0) / 255, a: (d[3] ?? 255) / 255 };
    }
    cache.set(css, leido);
    return leido;
  };
}
