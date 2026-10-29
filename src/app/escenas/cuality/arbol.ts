/**
 * "La llave arma el menú": la experiencia firma del mundo Cuality.
 *
 * Visto desde arriba, el árbol de permisos es el sello del logo: al centro el sello, alrededor
 * el anillo de la caché y después tres anillos de nodos (módulos, páginas, botones). Con el
 * progreso (lo maneja el scroll desde el anfitrión) la cámara baja del sello a un plano inclinado:
 * llegan las llaves del usuario y orbitan el centro, la forja estampa una política al vuelo, la
 * caché se llena y los nodos cuyo permiso está en el llavero se levantan encendidos.
 * Las llaves también las cambia el visitante: la escena las recibe con llaves() y vuelve a forjar.
 *
 * Independiente de Angular: el anfitrión lo carga con import() solo en el navegador.
 * Cero asignaciones por cuadro; en movimiento reducido dibuja un cuadro a demanda.
 */
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  BoxGeometry,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Path,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  Shape,
  SphereGeometry,
  Texture,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three';
import { ARBOL, MOMENTOS, type NodoArbol, type Permiso } from '../../mundos/cuality/contenido';

// ---------------------------------------------------------------- contrato

export type AnclaArbol = 'llavero' | 'forja' | 'cache' | 'tablero' | 'admin' | 'reportes' | 'usuarios' | 'roles' | 'informes' | 'auditorias';

export interface PosicionAncla {
  x: number;
  y: number;
  visible: boolean;
}

export interface ColoresArbol {
  azul: string;
  azulLogo: string;
  azulNoche: string;
  gris: string;
  grisNoche: string;
  noche: string;
  noche2: string;
  blanco: string;
}

export interface OpcionesArbol {
  lienzo: HTMLCanvasElement;
  reducido: boolean;
  colores: () => ColoresArbol;
  /** Ruta del logo de Cuality: se estampa en el sello del centro. */
  logo: string;
  /** Px CSS relativos al lienzo. El objeto se reutiliza entre cuadros: léelo en el momento. */
  alPosicionar?: (pos: Readonly<Record<AnclaArbol, PosicionAncla>>) => void;
}

export interface EscenaArbol {
  /** 0..1: el recorrido completo, del sello visto desde arriba al menú armado. */
  progreso(p: number): void;
  /** Las llaves del usuario: cuáles tiene y cuáles le llegan por su rol. */
  llaves(activas: ReadonlySet<Permiso>, delRol: ReadonlySet<Permiso>): void;
  /** Un cambio de llaves: se borra la caché, se forja la política y la caché se vuelve a llenar. */
  forjar(codigo?: string): void;
  /** El texto de la moneda usa Poppins e IBM Plex Mono: el anfitrión avisa cuando cargaron. */
  redibujarTextos(): void;
  /** -1..1, de Orientacion: gira un poco la mesa. */
  inclinar(x: number, y: number): void;
  destruir(): void;
}

// ---------------------------------------------------------------- composición

const FOV = 36;
const R_SELLO = 1.25;
const R_CACHE = 1.6;
const RADIO: Record<NodoArbol['tipo'], number> = { modulo: 2.8, pagina: 4.4, boton: 5.9 };
const ALTO: Record<NodoArbol['tipo'], number> = { modulo: 1.5, pagina: 1.05, boton: 0.7 };
const ALTO_PLANO = 0.06;
const MAX_LLAVES = 16;

const ANCLAS_NODO: readonly AnclaArbol[] = ['tablero', 'admin', 'reportes', 'usuarios', 'roles', 'informes', 'auditorias'];
const ORDEN_ANCLAS: readonly AnclaArbol[] = ['llavero', 'forja', 'cache', ...ANCLAS_NODO];

interface Toma {
  p: number;
  pos: Vector3;
  mira: Vector3;
  /** 0 = cámara cenital (arriba de la pantalla es el norte del sello), 1 = cámara de pie. */
  pie: number;
}

const TOMAS: readonly Toma[] = [
  { p: 0, pos: new Vector3(0, 21, 0.001), mira: new Vector3(0, 0, 0), pie: 0 },
  { p: 0.12, pos: new Vector3(0, 20, 0.8), mira: new Vector3(0, 0, 0), pie: 0 },
  { p: MOMENTOS.llavero + 0.06, pos: new Vector3(0, 8.5, 8), mira: new Vector3(0, 1, 0), pie: 1 },
  { p: MOMENTOS.forja + 0.08, pos: new Vector3(3, 5.4, 6.4), mira: new Vector3(0, 0.6, 0), pie: 1 },
  { p: MOMENTOS.cache + 0.08, pos: new Vector3(-3.8, 5, 6), mira: new Vector3(0, 0.3, 0), pie: 1 },
  { p: MOMENTOS.arbol + 0.08, pos: new Vector3(0.5, 12, 14.5), mira: new Vector3(0, 0.3, 0), pie: 1 },
  { p: 1, pos: new Vector3(9.5, 10.5, 12), mira: new Vector3(0, 0.3, 0), pie: 1 },
];

const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const tramo = (p: number, a: number, b: number) => limitar((p - a) / (b - a), 0, 1);
const suave = (t: number) => t * t * (3 - 2 * t);
const enPlano = (angulo: number, r: number, destino: Vector3, y = 0) =>
  destino.set(Math.sin((angulo * Math.PI) / 180) * r, y, -Math.cos((angulo * Math.PI) / 180) * r);

// ---------------------------------------------------------------- escena

export function crearArbol(op: OpcionesArbol): EscenaArbol {
  const { lienzo, reducido } = op;
  const padre: Element = lienzo.parentElement ?? lienzo;

  const renderer = new WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const escena = new Scene();
  const camara = new PerspectiveCamera(FOV, 1, 0.1, 120);
  const raiz = new Group();
  escena.add(raiz);

  const desechables: Array<{ dispose(): void }> = [];
  const registrar = <T extends { dispose(): void }>(d: T): T => {
    desechables.push(d);
    return d;
  };

  let paleta = op.colores();

  escena.add(new HemisphereLight(0xe6f3ff, 0x1f2430, Math.PI * 0.75));
  const luz = new DirectionalLight(0xffffff, Math.PI * 0.85);
  luz.position.set(4, 10, 6);
  escena.add(luz);

  // ---- la mesa: anillos de módulos, páginas y botones
  const lineaMat = registrar(
    new MeshBasicMaterial({ color: paleta.grisNoche, transparent: true, opacity: 0.22, side: DoubleSide, depthWrite: false }),
  );
  for (const r of [RADIO.modulo, RADIO.pagina, RADIO.boton]) {
    const anillo = new Mesh(registrar(new RingGeometry(r - 0.015, r + 0.015, 128)), lineaMat);
    anillo.rotation.x = -Math.PI / 2;
    raiz.add(anillo);
  }
  // Las marcas del borde del sello: como el guilloche de un papel de seguridad
  const borde = new Mesh(registrar(new RingGeometry(RADIO.boton + 0.6, RADIO.boton + 0.64, 160)), lineaMat);
  borde.rotation.x = -Math.PI / 2;
  raiz.add(borde);

  // ---- el sello del centro, con el logo
  const selloMat = registrar(new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 }));
  const sello = new Mesh(registrar(new CircleGeometry(R_SELLO, 64)), selloMat);
  sello.rotation.x = -Math.PI / 2;
  sello.position.y = 0.02;
  raiz.add(sello);
  const aroMat = registrar(new MeshStandardMaterial({ color: paleta.gris, roughness: 0.4, metalness: 0.3 }));
  const aro = new Mesh(registrar(new TorusGeometry(R_SELLO, 0.07, 10, 96)), aroMat);
  aro.rotation.x = -Math.PI / 2;
  raiz.add(aro);

  // ---- la caché: un anillo que se enciende y sus casillas
  const cacheMat = registrar(
    new MeshStandardMaterial({ color: paleta.azul, emissive: paleta.azulLogo, emissiveIntensity: 0.1, roughness: 0.35 }),
  );
  const cache = new Mesh(registrar(new TorusGeometry(R_CACHE, 0.045, 8, 120)), cacheMat);
  cache.rotation.x = -Math.PI / 2;
  cache.position.y = 0.05;
  raiz.add(cache);
  const casillaMat = registrar(new MeshStandardMaterial({ color: 0xffffff, emissive: paleta.azulNoche, emissiveIntensity: 0.6 }));
  const casillas = new InstancedMesh(registrar(new SphereGeometry(0.08, 12, 8)), casillaMat, MAX_LLAVES);
  casillas.instanceMatrix.setUsage(DynamicDrawUsage);
  casillas.count = 0;
  raiz.add(casillas);

  // ---- los nodos del árbol
  interface Nodo {
    def: NodoArbol;
    malla: Mesh;
    material: MeshStandardMaterial;
    base: Vector3;
    alto: number;
    actual: number;
    encendido: boolean;
  }
  const geoCilindro = registrar(new CylinderGeometry(1, 1, 1, 24, 1, false));
  const geoCaja = registrar(new BoxGeometry(1, 1, 1));
  const marcaMat = registrar(new MeshBasicMaterial({ color: paleta.grisNoche, transparent: true, opacity: 0.16, depthWrite: false }));
  const geoMarca = registrar(new CircleGeometry(1, 24));

  const nodos: Nodo[] = ARBOL.map((def) => {
    const material = registrar(
      new MeshStandardMaterial({ color: paleta.gris, roughness: 0.45, metalness: 0.1, emissive: 0x000000 }),
    );
    const esBoton = def.tipo === 'boton';
    const malla = new Mesh(esBoton ? geoCaja : geoCilindro, material);
    const ancho = def.tipo === 'modulo' ? 0.36 : def.tipo === 'pagina' ? 0.27 : 0.32;
    malla.scale.set(esBoton ? ancho : ancho, ALTO_PLANO, esBoton ? ancho : ancho);
    const base = enPlano(def.angulo, RADIO[def.tipo], new Vector3());
    malla.position.copy(base);
    malla.position.y = ALTO_PLANO / 2;
    raiz.add(malla);
    const marca = new Mesh(geoMarca, marcaMat);
    marca.rotation.x = -Math.PI / 2;
    marca.scale.setScalar(ancho * 1.35);
    marca.position.set(base.x, 0.01, base.z);
    raiz.add(marca);
    return { def, malla, material, base, alto: ALTO[def.tipo], actual: ALTO_PLANO, encendido: false };
  });
  const nodoPorId = new Map(nodos.map((n) => [n.def.id, n]));

  // Ramas: del sello a cada módulo y de cada padre a sus hijos, con color por vértice.
  const ramasGeo = registrar(new BufferGeometry());
  const ramasPos: number[] = [];
  const tmp = new Vector3();
  for (const n of nodos) {
    const desde = n.def.padre ? nodoPorId.get(n.def.padre)?.base : enPlano(n.def.angulo, R_CACHE + 0.1, tmp.clone());
    if (!desde) continue;
    ramasPos.push(desde.x, 0.03, desde.z, n.base.x, 0.03, n.base.z);
  }
  ramasGeo.setAttribute('position', new Float32BufferAttribute(ramasPos, 3));
  const ramasColor = new Float32BufferAttribute(new Float32Array(ramasPos.length), 3);
  ramasColor.setUsage(DynamicDrawUsage);
  ramasGeo.setAttribute('color', ramasColor);
  const ramas = new LineSegments(ramasGeo, registrar(new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 })));
  raiz.add(ramas);

  // ---- el llavero: llaves que orbitan el centro
  const geoLlave = registrar(llave());
  const llavesMat = registrar(new MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.4 }));
  const llavesMalla = new InstancedMesh(geoLlave, llavesMat, MAX_LLAVES);
  llavesMalla.instanceMatrix.setUsage(DynamicDrawUsage);
  // El color por instancia tiene que existir antes del primer cuadro: si no, el shader nace sin él.
  for (let i = 0; i < MAX_LLAVES; i++) llavesMalla.setColorAt(i, new Color(0xffffff));
  llavesMalla.count = 0;
  raiz.add(llavesMalla);

  // ---- la forja: una moneda de política que se estampa en el sello
  const monedaMat = registrar(new MeshStandardMaterial({ color: 0xf3f5f7, roughness: 0.3, metalness: 0.2, emissive: 0x000000 }));
  const lienzoMoneda = document.createElement('canvas');
  lienzoMoneda.width = 256;
  lienzoMoneda.height = 256;
  const texturaMoneda = registrar(new CanvasTexture(lienzoMoneda));
  texturaMoneda.colorSpace = SRGBColorSpace;
  const caraMat = registrar(new MeshStandardMaterial({ map: texturaMoneda, roughness: 0.35, metalness: 0.1 }));
  const moneda = new Mesh(registrar(new CylinderGeometry(0.62, 0.62, 0.12, 48)), [monedaMat, caraMat, monedaMat]);
  const monedaCanto = new Mesh(registrar(new TorusGeometry(0.62, 0.035, 8, 48)), cacheMat);
  monedaCanto.rotation.x = Math.PI / 2;
  moneda.add(monedaCanto);
  moneda.visible = false;
  raiz.add(moneda);
  const ondaMat = registrar(
    new MeshBasicMaterial({ color: paleta.azulNoche, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false }),
  );
  const onda = new Mesh(registrar(new RingGeometry(0.9, 1, 64)), ondaMat);
  onda.rotation.x = -Math.PI / 2;
  onda.position.y = 0.08;
  raiz.add(onda);
  const chispasGeo = registrar(new BufferGeometry());
  {
    const n = 40;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 0.7 + (i % 4) * 0.18;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0.15 + (i % 5) * 0.12;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    chispasGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  }
  const chispasMat = registrar(
    new PointsMaterial({ color: paleta.azulNoche, size: 0.09, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }),
  );
  const chispas = new Points(chispasGeo, chispasMat);
  chispas.visible = false;
  raiz.add(chispas);

  // ---- estado
  let destruido = false;
  let texturaLogo: Texture | null = null;
  let pObjetivo = 0;
  let pActual = 0;
  let incXObjetivo = 0;
  let incYObjetivo = 0;
  let incX = 0;
  let incY = 0;
  let tiempo = 0;
  /**
   * Segundos sin que el visitante haga nada (scroll o llaves). El movimiento ambiente (las llaves
   * que orbitan, el vaivén de la mesa) se apaga suave entre los 3 y los 5 s de quietud: nada se
   * mueve solo por más de 5 s (WCAG 2.2.2).
   */
  let quieto = 0;
  let ultimo = 0;
  let idBucle = 0;
  let idDibujo = 0;
  let enVista = false;
  let pestanaVisible = document.visibilityState !== 'hidden';
  let anchoCss = 1;
  let altoCss = 1;
  /** Segundos desde la última forja pedida por el visitante (grande = ninguna en curso). */
  let desdeForja = 99;
  /** Cuántas casillas de la caché están llenas (se vacía al forjar y se vuelve a llenar). */
  let llenado = 1;
  let activas: ReadonlySet<Permiso> = new Set();
  let delRol: ReadonlySet<Permiso> = new Set();
  let listaLlaves: Permiso[] = [];
  /** El permiso de la última política forjada: el del guion o la llave que tocó el visitante. */
  let codigoForja: string = 'ROLES_CREATE';

  const anclas = {} as Record<AnclaArbol, PosicionAncla>;
  for (const id of ORDEN_ANCLAS) anclas[id] = { x: 0, y: 0, visible: false };

  const titere = new Object3D();
  const tmpPos = new Vector3();
  const tmpMira = new Vector3();
  const tmpArriba = new Vector3();
  const tmpProy = new Vector3();
  const norte = new Vector3(0, 0, -1);
  const vertical = new Vector3(0, 1, 0);
  const cAzul = new Color();
  const cGris = new Color();
  const cDirecta = new Color();
  const cEncendido = new Color();
  const cApagado = new Color();
  const cEmision = new Color();
  const negro = new Color(0x000000);

  /** La cara de la moneda: la política con el nombre del permiso que la pidió. */
  function pintarMoneda(): void {
    const ctx = lienzoMoneda.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#f3f5f7';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = paleta.azul;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(128, 128, 112, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = paleta.azul;
    ctx.textAlign = 'center';
    ctx.font = '600 22px Poppins, "Segoe UI", sans-serif';
    ctx.fillText('Política', 128, 104);
    ctx.font = '500 25px "IBM Plex Mono", Consolas, monospace';
    ctx.fillText(codigoForja, 128, 146);
    ctx.font = '400 17px Poppins, "Segoe UI", sans-serif';
    ctx.fillStyle = paleta.gris;
    ctx.fillText('creada al vuelo', 128, 178);
    texturaMoneda.needsUpdate = true;
  }

  function aplicarColores(): void {
    paleta = op.colores();
    pintarMoneda();
    cAzul.set(paleta.azul);
    cGris.set(paleta.gris);
    // Las directas en gris, como dicen los pasos y el llavero; el gris claro se lee sobre la bóveda.
    cDirecta.set(paleta.grisNoche);
    cEncendido.set(paleta.azul);
    cApagado.set(paleta.grisNoche);
    cEmision.set(paleta.azulLogo);
    lineaMat.color.set(paleta.grisNoche);
    marcaMat.color.set(paleta.grisNoche);
    aroMat.color.set(paleta.gris);
    cacheMat.color.set(paleta.azul);
    cacheMat.emissive.set(paleta.azulLogo);
    casillaMat.emissive.set(paleta.azulNoche);
    ondaMat.color.set(paleta.azulNoche);
    chispasMat.color.set(paleta.azulNoche);
    pintarLlaves();
    pintarRamas();
  }

  /** Colores por llave: azul si viene del rol, gris si es directa. No corre por cuadro. */
  function pintarLlaves(): void {
    for (let i = 0; i < listaLlaves.length; i++) {
      llavesMalla.setColorAt(i, delRol.has(listaLlaves[i]) ? cAzul : cDirecta);
    }
    if (llavesMalla.instanceColor) llavesMalla.instanceColor.needsUpdate = true;
  }

  function pintarRamas(): void {
    const arr = ramasColor.array as Float32Array;
    let k = 0;
    for (const n of nodos) {
      const padreDef = n.def.padre ? nodoPorId.get(n.def.padre) : null;
      if (n.def.padre && !padreDef) continue;
      const on = activas.has(n.def.permiso);
      const c = on ? cEncendido : cApagado;
      for (let v = 0; v < 2; v++) {
        arr[k++] = c.r;
        arr[k++] = c.g;
        arr[k++] = c.b;
      }
    }
    ramasColor.needsUpdate = true;
  }

  function actualizar(dt: number): void {
    if (reducido) {
      pActual = pObjetivo;
      incX = incXObjetivo;
      incY = incYObjetivo;
    } else {
      pActual += (pObjetivo - pActual) * (1 - Math.exp(-dt * 6));
      incX += (incXObjetivo - incX) * (1 - Math.exp(-dt * 4));
      incY += (incYObjetivo - incY) * (1 - Math.exp(-dt * 4));
    }
    const p = pActual;
    desdeForja += dt;

    raiz.rotation.y = incX * 0.08 + (reducido ? 0 : Math.sin(tiempo * 0.15) * 0.02);

    // El llavero: las llaves bajan y orbitan el centro.
    const llegada = suave(tramo(p, MOMENTOS.llavero - 0.04, MOMENTOS.llavero + 0.06));
    const n = listaLlaves.length;
    llavesMalla.count = llegada > 0.001 ? n : 0;
    const giro = reducido ? 0.3 : tiempo * 0.35;
    for (let i = 0; i < n; i++) {
      const a = giro + (i / Math.max(n, 1)) * Math.PI * 2;
      const r = 0.95;
      titere.position.set(Math.cos(a) * r, 1.7 + (1 - llegada) * 4 + Math.sin(a * 2 + tiempo) * 0.05, Math.sin(a) * r);
      titere.rotation.set(0, -a, Math.PI / 2 + 0.2);
      titere.scale.setScalar(1.15 * llegada + 0.001);
      titere.updateMatrix();
      llavesMalla.setMatrixAt(i, titere.matrix);
    }
    llavesMalla.instanceMatrix.needsUpdate = true;

    // La forja: por el scroll, o porque el visitante cambió las llaves.
    const fScroll = tramo(p, MOMENTOS.forja - 0.02, MOMENTOS.forja + 0.12);
    const fManual = tramo(desdeForja, 0, 1.1);
    const enCursoManual = desdeForja < 1.6;
    const f = enCursoManual ? fManual : fScroll;
    const caida = suave(tramo(f, 0, 0.45));
    const estampado = tramo(f, 0.45, 1);
    moneda.visible = (f > 0.001 && f < 0.999) || (p >= MOMENTOS.forja && p < MOMENTOS.cache && !enCursoManual);
    moneda.position.set(0, 0.3 + (1 - caida) * 3.6, 0);
    moneda.rotation.set(0, (1 - caida) * 3, 0);
    monedaMat.emissive.copy(estampado > 0 ? cEmision : negro);
    monedaMat.emissiveIntensity = 0.4 * (1 - estampado);
    onda.scale.setScalar(0.6 + estampado * 2.4);
    ondaMat.opacity = estampado > 0 && estampado < 1 ? (1 - estampado) * 0.8 : 0;
    chispas.visible = !reducido && estampado > 0 && estampado < 1;
    if (chispas.visible) {
      chispas.scale.setScalar(0.8 + estampado * 1.6);
      chispasMat.opacity = 1 - estampado;
    }

    // La caché: se enciende y se llena; con un cambio de llaves se vacía y se vuelve a llenar.
    const cScroll = tramo(p, MOMENTOS.cache - 0.02, MOMENTOS.cache + 0.1);
    if (enCursoManual) llenado = reducido ? 1 : tramo(desdeForja, 0.7, 1.5);
    else llenado = cScroll;
    const brillo = enCursoManual ? Math.sin(tramo(desdeForja, 0.6, 1.6) * Math.PI) : Math.sin(cScroll * Math.PI);
    cacheMat.emissiveIntensity = 0.12 + brillo * 0.9 + (p > MOMENTOS.cache ? 0.15 : 0);
    const llenas = Math.round(n * llenado);
    casillas.count = llenas;
    for (let i = 0; i < llenas; i++) {
      const a = (i / Math.max(n, 1)) * Math.PI * 2 - Math.PI / 2;
      titere.position.set(Math.cos(a) * R_CACHE, 0.12, Math.sin(a) * R_CACHE);
      titere.rotation.set(0, 0, 0);
      titere.scale.setScalar(1);
      titere.updateMatrix();
      casillas.setMatrixAt(i, titere.matrix);
    }
    casillas.instanceMatrix.needsUpdate = true;

    // El árbol: los nodos con llave se levantan, primero los módulos y al final los botones.
    const arbol = tramo(p, MOMENTOS.arbol - 0.03, MOMENTOS.arbol + 0.1);
    for (let i = 0; i < nodos.length; i++) {
      const nodo = nodos[i];
      const orden = nodo.def.tipo === 'modulo' ? 0 : nodo.def.tipo === 'pagina' ? 0.25 : 0.5;
      const sube = suave(tramo(arbol, orden, orden + 0.5));
      const on = activas.has(nodo.def.permiso);
      const objetivo = on ? ALTO_PLANO + (nodo.alto - ALTO_PLANO) * sube : ALTO_PLANO;
      nodo.actual = reducido || dt === 0 ? objetivo : nodo.actual + (objetivo - nodo.actual) * (1 - Math.exp(-dt * 8));
      nodo.malla.scale.y = Math.max(nodo.actual, 0.01);
      nodo.malla.position.y = nodo.malla.scale.y / 2;
      const encendido = on && sube > 0.5;
      if (encendido !== nodo.encendido || dt === 0) {
        nodo.encendido = encendido;
        nodo.material.color.copy(encendido ? cEncendido : cGris);
        nodo.material.emissive.copy(encendido ? cEmision : negro);
        nodo.material.emissiveIntensity = encendido ? 0.45 : 0;
      }
    }
    ramas.visible = p > 0.02;

    encuadrar(p);
  }

  function encuadrar(p: number): void {
    let i = 0;
    while (i < TOMAS.length - 2 && p > TOMAS[i + 1].p) i++;
    const a = TOMAS[i];
    const b = TOMAS[i + 1];
    const t = suave(tramo(p, a.p, b.p));
    tmpPos.lerpVectors(a.pos, b.pos, t);
    tmpMira.lerpVectors(a.mira, b.mira, t);
    const pie = a.pie + (b.pie - a.pie) * t;
    tmpArriba.lerpVectors(norte, vertical, pie).normalize();
    // En pantallas angostas la cámara se aleja para que quepa el sello entero.
    const aspecto = anchoCss / altoCss;
    const factor = aspecto < 1.2 ? limitar(1.2 / aspecto, 1, 2.1) : 1;
    tmpPos.sub(tmpMira).multiplyScalar(factor).add(tmpMira);
    tmpPos.x += incX * 0.5;
    tmpPos.y -= incY * 0.4;
    camara.position.copy(tmpPos);
    camara.up.copy(tmpArriba);
    camara.lookAt(tmpMira);
  }

  function posicionar(): void {
    const avisar = op.alPosicionar;
    if (!avisar) return;
    camara.updateMatrixWorld();
    raiz.updateMatrixWorld();
    const p = pActual;
    for (let i = 0; i < ORDEN_ANCLAS.length; i++) {
      const id = ORDEN_ANCLAS[i];
      let visible = false;
      switch (id) {
        case 'llavero':
          tmpProy.set(0, 2.45, 0);
          visible = p >= MOMENTOS.llavero && p < MOMENTOS.forja - 0.02 && listaLlaves.length > 0;
          break;
        case 'forja':
          tmpProy.set(0, 1.15, 0);
          visible = p >= MOMENTOS.forja && p < MOMENTOS.cache - 0.02;
          break;
        case 'cache':
          tmpProy.set(R_CACHE * 0.7, 0.35, R_CACHE * 0.7);
          visible = p >= MOMENTOS.cache && p < MOMENTOS.arbol - 0.02;
          break;
        default: {
          const nodo = nodoPorId.get(id);
          if (!nodo) break;
          tmpProy.copy(nodo.base).setY(nodo.malla.scale.y + 0.35);
          visible = p >= MOMENTOS.arbol && nodo.encendido;
        }
      }
      tmpProy.applyMatrix4(raiz.matrixWorld).project(camara);
      const a = anclas[id];
      a.x = (tmpProy.x * 0.5 + 0.5) * anchoCss;
      a.y = (-tmpProy.y * 0.5 + 0.5) * altoCss;
      a.visible = visible && tmpProy.z < 1 && a.x > 8 && a.x < anchoCss - 8 && a.y > 16 && a.y < altoCss - 16;
    }
    avisar(anclas);
  }

  function dibujar(): void {
    renderer.render(escena, camara);
    posicionar();
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
    quieto += dt;
    tiempo += dt * (1 - tramo(quieto, 3, 5));
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

  // El logo del sello: con el evento load (con decode() una pestaña que no pinta lo deja esperando).
  {
    const img = new Image();
    let listo = false;
    const alCargar = () => {
      if (listo || destruido) return;
      listo = true;
      // El logo no es cuadrado: se centra en un lienzo cuadrado para que el círculo no lo deforme.
      const lado = 256;
      const c = document.createElement('canvas');
      c.width = lado;
      c.height = lado;
      const ctx = c.getContext('2d');
      const escala = lado / Math.max(img.naturalWidth, img.naturalHeight, 1);
      const w = img.naturalWidth * escala;
      const h = img.naturalHeight * escala;
      ctx?.drawImage(img, (lado - w) / 2, (lado - h) / 2, w, h);
      texturaLogo = new CanvasTexture(c);
      texturaLogo.colorSpace = SRGBColorSpace;
      texturaLogo.needsUpdate = true;
      selloMat.map = texturaLogo;
      selloMat.opacity = 1;
      selloMat.needsUpdate = true;
      solicitarDibujo();
    };
    img.addEventListener('load', alCargar, { once: true });
    img.src = op.logo;
    if (img.complete && img.naturalWidth) alCargar();
  }

  aplicarColores();
  redimensionar(padre.clientWidth, padre.clientHeight);
  actualizar(0);
  dibujar();

  return {
    progreso(p: number): void {
      if (destruido) return;
      const nuevo = limitar(Number.isFinite(p) ? p : 0, 0, 1);
      if (nuevo !== pObjetivo) quieto = 0;
      pObjetivo = nuevo;
      if (reducido) solicitarDibujo();
    },

    llaves(nuevas: ReadonlySet<Permiso>, rol: ReadonlySet<Permiso>): void {
      if (destruido) return;
      quieto = 0;
      activas = nuevas;
      delRol = rol;
      listaLlaves = Array.from(nuevas).slice(0, MAX_LLAVES);
      pintarLlaves();
      pintarRamas();
      solicitarDibujo();
    },

    forjar(codigo?: string): void {
      if (destruido) return;
      quieto = 0;
      if (codigo) {
        codigoForja = codigo;
        pintarMoneda();
      }
      // Con movimiento reducido no hay animación: la caché queda llena en el acto.
      if (reducido) {
        solicitarDibujo();
        return;
      }
      desdeForja = 0;
      llenado = 0;
      solicitarDibujo();
    },

    redibujarTextos(): void {
      if (destruido) return;
      pintarMoneda();
      solicitarDibujo();
    },

    inclinar(x: number, y: number): void {
      if (destruido) return;
      incXObjetivo = limitar(Number.isFinite(x) ? x : 0, -1, 1);
      incYObjetivo = limitar(Number.isFinite(y) ? y : 0, -1, 1);
      if (reducido) solicitarDibujo();
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
      texturaLogo?.dispose();
      llavesMalla.dispose();
      casillas.dispose();
      for (const d of desechables) d.dispose();
      desechables.length = 0;
      escena.traverse((o) => {
        const m = (o as Mesh).material as Material | Material[] | undefined;
        if (Array.isArray(m)) m.forEach((x) => x.dispose());
        else m?.dispose();
      });
      escena.clear();
      renderer.dispose();
      // Suelta el contexto WebGL ya: al pasar de mundo en mundo no se acumulan contextos vivos.
      renderer.forceContextLoss();
    },
  };
}

// ---------------------------------------------------------------- piezas

/** Una llave plana: cabeza con su agujero, caña y dos dientes. */
function llave(): ExtrudeGeometry {
  const cabeza = new Shape();
  cabeza.absarc(0, 0.26, 0.17, 0, Math.PI * 2, false);
  const agujero = new Path();
  agujero.absarc(0, 0.26, 0.075, 0, Math.PI * 2, true);
  cabeza.holes.push(agujero);

  const cana = new Shape();
  cana.moveTo(-0.035, 0.12);
  cana.lineTo(0.035, 0.12);
  cana.lineTo(0.035, -0.18);
  cana.lineTo(0.12, -0.18);
  cana.lineTo(0.12, -0.25);
  cana.lineTo(0.035, -0.25);
  cana.lineTo(0.035, -0.29);
  cana.lineTo(0.1, -0.29);
  cana.lineTo(0.1, -0.36);
  cana.lineTo(-0.035, -0.36);
  cana.closePath();

  const g = new ExtrudeGeometry([cabeza, cana], { depth: 0.05, bevelEnabled: false, curveSegments: 20 });
  g.translate(0, 0, -0.025);
  return g;
}
