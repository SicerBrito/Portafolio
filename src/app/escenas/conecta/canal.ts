/**
 * "Tres nodos, un canal": la experiencia firma del mundo Conecta.
 *
 * El logo de Conecta (tres nodos dorados) se abre en una constelación: cada nodo es una
 * empresa del grupo con su color, y Conecta aparece dorado al centro. Con el progreso
 * (lo maneja el scroll desde el anfitrión), un sistema pide un mensaje, una partícula
 * dorada viaja, cruza la válvula del tope diario y llega a un celular que se inclina con
 * el giroscopio o el mouse. Los estados vuelven a Conecta por el webhook.
 *
 * Independiente de Angular: el anfitrión lo carga con import() solo en el navegador.
 * Cero asignaciones por cuadro; en movimiento reducido dibuja un cuadro a demanda.
 */
import {
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CurvePath,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  QuadraticBezierCurve3,
  Quaternion,
  SRGBColorSpace,
  Scene,
  Shape,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three';

// ---------------------------------------------------------------- contrato

export type AnclaCanal = 'ocupasalud' | 'bogota' | 'autoaprender' | 'conecta' | 'sistema' | 'tope' | 'celular' | 'estados';

export interface PosicionAncla {
  x: number;
  y: number;
  visible: boolean;
}

export interface ColoresCanal {
  oro1: string;
  oro2: string;
  oro3: string;
  oro6: string;
  oroClaro: string;
  tinta: string;
  tinta2: string;
  tintaSuave: string;
  lila: string;
  linea: string;
  ocupasalud: string;
  autoaprender: string;
  chat: string;
  chatPunto: string;
  burbujaTexto: string;
  textoSuave: string;
  enlace: string;
}

export interface OpcionesCanal {
  lienzo: HTMLCanvasElement;
  reducido: boolean;
  colores: () => ColoresCanal;
  /** Px CSS relativos al lienzo. El objeto se reutiliza entre cuadros: léelo en el momento. */
  alPosicionar: (pos: Readonly<Record<AnclaCanal, PosicionAncla>>) => void;
}

export interface EscenaCanal {
  /** 0..1: el recorrido completo del mensaje. */
  progreso(p: number): void;
  /** -1..1, de Orientacion: inclina el celular y mueve un poco la cámara. */
  inclinar(x: number, y: number): void;
  refrescarColores(): void;
  destruir(): void;
}

/** Momentos del recorrido; el anfitrión los usa para sus pasos y sus estados. */
export const MOMENTOS = {
  constelacion: 0.22,
  pedido: 0.34,
  valvula: 0.59,
  celular: 0.74,
  enviado: 0.86,
  entregado: 0.91,
  leido: 0.96,
} as const;

// ---------------------------------------------------------------- composición

const FOV = 35;
/** El logo en 3D: mismas proporciones que conecta-icono.svg (viewBox 100, escala 3,2). */
const ESCALA_LOGO = 3.2;
const RADIO_LOGO = 0.14 * ESCALA_LOGO;
const RADIO_ARISTA_LOGO = 0.035 * ESCALA_LOGO;
const RADIO_NODO = 0.36;
const RADIO_CENTRO = 0.56;
const RADIO_RAYO = 0.03;

const CENTRO = new Vector3(0, 0, 0);
const SISTEMA = new Vector3(-4.7, 0.2, 0.5);
const VALVULA = new Vector3(3.3, -0.3, 0);
const CELULAR = new Vector3(6.5, 0.1, 0.4);
/** El mensaje entra por el borde de abajo y el aviso de estado sale por arriba: nada tapa la burbuja. */
const ENTRADA_CELULAR = new Vector3(6.5, -1.55, 0.45);
const SALIDA_CELULAR = new Vector3(6.5, 1.75, 0.4);
const GIRO_CELULAR = -0.24;
const GIRO_VALVULA = 0.95;

const MARCAS_TOPE = 24;
const TOPE_USADO = 9;

const ANCHO_PANTALLA = 1.34;
const ALTO_PANTALLA = 2.82;
const PX_PANTALLA = 400;

interface NodoDef {
  id: 'ocupasalud' | 'autoaprender' | 'bogota';
  logo: Vector3;
  destino: Vector3;
  colorLogo: keyof ColoresCanal;
  colorMarca: keyof ColoresCanal;
}

const NODOS: NodoDef[] = [
  { id: 'ocupasalud', logo: new Vector3(-0.704, 0.64, 0), destino: new Vector3(-2.6, 1.5, 0.3), colorLogo: 'oro1', colorMarca: 'ocupasalud' },
  { id: 'autoaprender', logo: new Vector3(0.704, 0.64, 0), destino: new Vector3(2.1, 1.85, -0.4), colorLogo: 'oro2', colorMarca: 'autoaprender' },
  { id: 'bogota', logo: new Vector3(0, -0.64, 0), destino: new Vector3(-1.5, -2.0, 0.2), colorLogo: 'oro6', colorMarca: 'ocupasalud' },
];

const ARISTAS_LOGO: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 2],
];

interface Toma {
  p: number;
  pos: Vector3;
  mira: Vector3;
}

const TOMAS: Toma[] = [
  { p: 0, pos: new Vector3(0, 0, 7.6), mira: new Vector3(0, 0, 0) },
  { p: 0.2, pos: new Vector3(0.3, 1.3, 11.4), mira: new Vector3(-0.3, 0, 0) },
  { p: 0.4, pos: new Vector3(-1.3, 1.6, 12.6), mira: new Vector3(-0.6, -0.1, 0) },
  { p: 0.58, pos: new Vector3(2.0, 1.1, 9.6), mira: new Vector3(2.4, -0.2, 0) },
  { p: 0.76, pos: new Vector3(4.9, 0.5, 6.8), mira: new Vector3(5.9, 0.05, 0.4) },
  { p: 1, pos: new Vector3(2.6, 1.4, 11.6), mira: new Vector3(2.4, 0.3, 0) },
];

const LLEGADAS = [MOMENTOS.enviado, MOMENTOS.entregado, MOMENTOS.leido] as const;

const VENTANAS: Record<AnclaCanal, [number, number]> = {
  ocupasalud: [0.15, 0.66],
  bogota: [0.15, 0.66],
  autoaprender: [0.15, 0.66],
  conecta: [0.15, 1.01],
  sistema: [0.27, 0.6],
  tope: [0.46, 0.8],
  celular: [0.7, 1.01],
  estados: [0.8, 1.01],
};

// ---------------------------------------------------------------- utilidades puras

const limitar = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const tramo = (p: number, a: number, b: number) => limitar((p - a) / (b - a), 0, 1);
const suave = (t: number) => t * t * (3 - 2 * t);

// ---------------------------------------------------------------- escena

export function crearCanal(op: OpcionesCanal): EscenaCanal {
  const { lienzo, reducido } = op;
  const padre: Element = lienzo.parentElement ?? lienzo;

  const renderer = new WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const escena = new Scene();
  const camara = new PerspectiveCamera(FOV, 1, 0.1, 100);
  const raiz = new Group();
  escena.add(raiz);

  const desechables: Array<{ dispose(): void }> = [];
  const registrar = <T extends { dispose(): void }>(d: T): T => {
    desechables.push(d);
    return d;
  };

  escena.add(new HemisphereLight(0xffffff, 0xd9cdb4, Math.PI * 0.85));
  const luz = new DirectionalLight(0xffffff, Math.PI * 0.75);
  luz.position.set(3, 6, 8);
  escena.add(luz);

  const color = (): ColoresCanal => op.colores();
  let paleta = color();

  // ---- piezas compartidas
  const esfera = registrar(new SphereGeometry(1, 40, 24));
  const cilindro = registrar(new CylinderGeometry(1, 1, 1, 12, 1, false));

  const metal = (hex: string, opacidad = 1) =>
    registrar(
      new MeshStandardMaterial({
        color: hex,
        roughness: 0.38,
        metalness: 0.22,
        transparent: opacidad < 1,
        opacity: opacidad,
      }),
    );

  // ---- nodos de las empresas (empiezan siendo el logo)
  const nodos = NODOS.map((def) => {
    const material = metal(paleta[def.colorLogo]);
    const malla = new Mesh(esfera, material);
    raiz.add(malla);
    return { def, malla, material, desde: new Color(), hasta: new Color() };
  });

  const nodoPorId = { ocupasalud: nodos[0], autoaprender: nodos[1], bogota: nodos[2] };

  const aristasLogo = ARISTAS_LOGO.map(([a, b]) => {
    const material = metal(paleta.oro3, 1);
    material.transparent = true;
    const malla = new Mesh(cilindro, material);
    raiz.add(malla);
    return { a, b, malla, material };
  });

  // ---- Conecta al centro, con su anillo
  const materialCentro = metal(paleta.oro1);
  materialCentro.emissive = new Color(paleta.oro2);
  materialCentro.emissiveIntensity = 0.12;
  const centro = new Mesh(esfera, materialCentro);
  raiz.add(centro);

  const anilloGeo = registrar(new TorusGeometry(0.95, 0.025, 8, 80));
  const anilloMat = registrar(new MeshBasicMaterial({ color: paleta.oro3, transparent: true, opacity: 0 }));
  const anillo = new Mesh(anilloGeo, anilloMat);
  anillo.rotation.x = Math.PI * 0.42;
  raiz.add(anillo);

  const rayos = nodos.map(() => {
    const material = registrar(new MeshBasicMaterial({ color: paleta.oro3, transparent: true, opacity: 0 }));
    const malla = new Mesh(cilindro, material);
    raiz.add(malla);
    return { malla, material };
  });

  // ---- el sistema que pide el mensaje
  const sistema = new Group();
  sistema.position.copy(SISTEMA);
  const cajaMat = metal(paleta.tinta);
  const caja = new Mesh(registrar(new BoxGeometry(0.95, 0.66, 0.2)), cajaMat);
  sistema.add(caja);
  const barraGeo = registrar(new BoxGeometry(0.62, 0.06, 0.02));
  const barraMat = registrar(new MeshBasicMaterial({ color: paleta.oro1 }));
  for (let i = 0; i < 3; i++) {
    const barra = new Mesh(barraGeo, barraMat);
    barra.position.set(-0.06 * i, 0.16 - i * 0.16, 0.11);
    barra.scale.x = 1 - i * 0.2;
    sistema.add(barra);
  }
  raiz.add(sistema);

  // ---- la ruta del mensaje: sistema → Conecta → válvula → celular
  const ruta = new CurvePath<Vector3>();
  ruta.add(new QuadraticBezierCurve3(SISTEMA.clone(), new Vector3(-2.4, -1.0, 0.9), CENTRO.clone()));
  ruta.add(new QuadraticBezierCurve3(CENTRO.clone(), new Vector3(1.6, 0.5, 0.3), VALVULA.clone()));
  ruta.add(new QuadraticBezierCurve3(VALVULA.clone(), new Vector3(5.2, -1.9, 0.6), ENTRADA_CELULAR.clone()));
  const SEGMENTOS_RUTA = 150;
  const LADOS_TUBO = 6;
  const rutaGeo = registrar(new TubeGeometry(ruta, SEGMENTOS_RUTA, 0.022, LADOS_TUBO, false));
  const rutaMat = registrar(new MeshBasicMaterial({ color: paleta.oro3, transparent: true, opacity: 0.85 }));
  const rutaMalla = new Mesh(rutaGeo, rutaMat);
  raiz.add(rutaMalla);
  const indicesRuta = rutaGeo.index ? rutaGeo.index.count : 0;

  // El webhook vuelve por otro camino: de Meta a Conecta, por arriba.
  const vuelta = new QuadraticBezierCurve3(SALIDA_CELULAR.clone(), new Vector3(3.6, 3.6, 0.4), CENTRO.clone());
  const vueltaGeo = registrar(new TubeGeometry(vuelta, 80, 0.016, LADOS_TUBO, false));
  const vueltaMat = registrar(new MeshBasicMaterial({ color: paleta.lila, transparent: true, opacity: 0.7 }));
  const vueltaMalla = new Mesh(vueltaGeo, vueltaMat);
  raiz.add(vueltaMalla);
  const indicesVuelta = vueltaGeo.index ? vueltaGeo.index.count : 0;

  // ---- la partícula dorada y su halo
  const particulaMat = registrar(new MeshBasicMaterial({ color: paleta.oro1 }));
  const particula = new Mesh(esfera, particulaMat);
  particula.scale.setScalar(0.13);
  raiz.add(particula);
  const haloTex = registrar(texturaHalo());
  const haloMat = registrar(new SpriteMaterial({ map: haloTex, color: paleta.oro1, transparent: true, depthWrite: false }));
  const halo = new Sprite(haloMat);
  halo.scale.setScalar(0.9);
  raiz.add(halo);

  // ---- los pulsos del webhook: enviado, entregado, leído
  const pulsos = [paleta.tintaSuave, paleta.lila, paleta.oro1].map((hex) => {
    const material = registrar(new MeshBasicMaterial({ color: hex }));
    const malla = new Mesh(esfera, material);
    malla.scale.setScalar(0.1);
    raiz.add(malla);
    return { malla, material };
  });

  // ---- la válvula del tope diario
  const valvula = new Group();
  valvula.position.copy(VALVULA);
  // Entre la dirección de la ruta y la cámara: se lee como aro y la partícula lo cruza.
  valvula.rotation.y = GIRO_VALVULA;
  const aroMat = metal(paleta.tinta);
  const aro = new Mesh(registrar(new TorusGeometry(0.8, 0.08, 14, 64)), aroMat);
  valvula.add(aro);
  const compuertaGeo = registrar(new CircleGeometry(0.72, 28, 0, Math.PI));
  const compuertaMat = registrar(
    new MeshBasicMaterial({ color: paleta.oro2, transparent: true, opacity: 0.45, side: DoubleSide, depthWrite: false }),
  );
  const compuertaArriba = new Mesh(compuertaGeo, compuertaMat);
  const compuertaAbajo = new Mesh(compuertaGeo, compuertaMat);
  compuertaAbajo.rotation.z = Math.PI;
  valvula.add(compuertaArriba, compuertaAbajo);

  const marcaGeo = registrar(new BoxGeometry(0.07, 0.22, 0.07));
  const marcaMat = registrar(new MeshBasicMaterial({ color: 0xffffff }));
  const marcas = new InstancedMesh(marcaGeo, marcaMat, MARCAS_TOPE);
  registrar(marcas);
  const auxMatriz = new Matrix4();
  const auxQuat = new Quaternion();
  const auxEscala = new Vector3(1, 1, 1);
  const auxPos = new Vector3();
  const ejeZ = new Vector3(0, 0, 1);
  for (let i = 0; i < MARCAS_TOPE; i++) {
    // Empieza arriba y avanza en el sentido del reloj, como un medidor.
    const angulo = Math.PI / 2 - (i / MARCAS_TOPE) * Math.PI * 2;
    auxPos.set(Math.cos(angulo) * 1.1, Math.sin(angulo) * 1.1, 0);
    auxQuat.setFromAxisAngle(ejeZ, angulo - Math.PI / 2);
    auxMatriz.compose(auxPos, auxQuat, auxEscala);
    marcas.setMatrixAt(i, auxMatriz);
  }
  valvula.add(marcas);
  raiz.add(valvula);
  const colorMarcaLlena = new Color();
  const colorMarcaVacia = new Color();
  let marcasEncendidas = -1;

  // ---- el celular
  const celular = new Group();
  celular.position.copy(CELULAR);
  const cuerpoGeo = registrar(cuerpoCelular());
  const cuerpoMat = metal(paleta.tinta);
  celular.add(new Mesh(cuerpoGeo, cuerpoMat));
  const lienzoPantalla = document.createElement('canvas');
  lienzoPantalla.width = Math.round(ANCHO_PANTALLA * PX_PANTALLA);
  lienzoPantalla.height = Math.round(ALTO_PANTALLA * PX_PANTALLA);
  const texturaPantalla = registrar(new CanvasTexture(lienzoPantalla));
  texturaPantalla.colorSpace = SRGBColorSpace;
  texturaPantalla.anisotropy = 4;
  const pantallaMat = registrar(new MeshBasicMaterial({ map: texturaPantalla, toneMapped: false }));
  const pantalla = new Mesh(registrar(new PlaneGeometry(ANCHO_PANTALLA, ALTO_PANTALLA)), pantallaMat);
  pantalla.position.z = 0.096;
  celular.add(pantalla);
  raiz.add(celular);
  let estadoPantalla = -1;

  // ---- estado
  let pObjetivo = 0;
  let pActual = 0;
  let incX = 0;
  let incY = 0;
  let incXObjetivo = 0;
  let incYObjetivo = 0;
  let tiempo = 0;
  let anchoCss = 1;
  let altoCss = 1;
  let destruido = false;
  let enVista = false;
  let pestanaVisible = document.visibilityState !== 'hidden';
  let idBucle = 0;
  let idDibujo = 0;
  let ultimo = 0;

  const tmpA = new Vector3();
  const tmpB = new Vector3();
  const tmpPos = new Vector3();
  const tmpMira = new Vector3();
  const tmpProy = new Vector3();
  const arriba = new Vector3(0, 1, 0);
  const tmpQuat = new Quaternion();

  const anclas: Record<AnclaCanal, PosicionAncla> = {
    ocupasalud: { x: 0, y: 0, visible: false },
    bogota: { x: 0, y: 0, visible: false },
    autoaprender: { x: 0, y: 0, visible: false },
    conecta: { x: 0, y: 0, visible: false },
    sistema: { x: 0, y: 0, visible: false },
    tope: { x: 0, y: 0, visible: false },
    celular: { x: 0, y: 0, visible: false },
    estados: { x: 0, y: 0, visible: false },
  };
  const ordenAnclas = Object.keys(anclas) as AnclaCanal[];

  // ---- colores

  function aplicarColores(): void {
    paleta = color();
    for (const n of nodos) {
      n.desde.set(paleta[n.def.colorLogo]);
      n.hasta.set(paleta[n.def.colorMarca]);
    }
    for (const a of aristasLogo) a.material.color.set(paleta.oro3);
    materialCentro.color.set(paleta.oro1);
    materialCentro.emissive.set(paleta.oro2);
    anilloMat.color.set(paleta.oro3);
    for (const r of rayos) r.material.color.set(paleta.oro3);
    cajaMat.color.set(paleta.tinta);
    barraMat.color.set(paleta.oro1);
    rutaMat.color.set(paleta.oro3);
    vueltaMat.color.set(paleta.lila);
    particulaMat.color.set(paleta.oro1);
    haloMat.color.set(paleta.oro1);
    pulsos[0].material.color.set(paleta.tintaSuave);
    pulsos[1].material.color.set(paleta.lila);
    pulsos[2].material.color.set(paleta.oro1);
    aroMat.color.set(paleta.tinta);
    compuertaMat.color.set(paleta.oro2);
    cuerpoMat.color.set(paleta.tinta2);
    colorMarcaLlena.set(paleta.oro1);
    colorMarcaVacia.set(paleta.linea);
    marcasEncendidas = -1;
    estadoPantalla = -1;
  }

  // ---- la pantalla del celular (solo se redibuja al cambiar de estado)

  function dibujarPantalla(estado: number): void {
    if (estado === estadoPantalla) return;
    estadoPantalla = estado;
    const ctx = lienzoPantalla.getContext('2d');
    if (!ctx) return;
    pintarPantalla(ctx, lienzoPantalla.width, lienzoPantalla.height, estado === 1, paleta);
    texturaPantalla.needsUpdate = true;
  }

  // ---- un cuadro del recorrido

  function colocarArista(malla: Mesh, a: Vector3, b: Vector3, radio: number): void {
    tmpA.subVectors(b, a);
    const largo = tmpA.length();
    malla.position.addVectors(a, b).multiplyScalar(0.5);
    if (largo < 1e-5) {
      malla.scale.set(0.0001, 0.0001, 0.0001);
      return;
    }
    tmpA.divideScalar(largo);
    tmpQuat.setFromUnitVectors(arriba, tmpA);
    malla.quaternion.copy(tmpQuat);
    malla.scale.set(radio, largo, radio);
  }

  function actualizar(dt: number): void {
    const k = reducido ? 1 : 1 - Math.exp(-dt * 7);
    pActual += (pObjetivo - pActual) * k;
    if (Math.abs(pObjetivo - pActual) < 1e-5) pActual = pObjetivo;
    incX += (incXObjetivo - incX) * (reducido ? 1 : 1 - Math.exp(-dt * 5));
    incY += (incYObjetivo - incY) * (reducido ? 1 : 1 - Math.exp(-dt * 5));
    const p = pActual;

    // El logo se abre en la constelación.
    const apertura = suave(tramo(p, 0.05, MOMENTOS.constelacion));
    const radioNodo = RADIO_LOGO + (RADIO_NODO - RADIO_LOGO) * apertura;
    // Bucles con índice y no for…of: en el cuadro no se crean iteradores.
    for (let i = 0; i < nodos.length; i++) {
      const n = nodos[i];
      n.malla.position.lerpVectors(n.def.logo, n.def.destino, apertura);
      n.malla.scale.setScalar(radioNodo);
      n.material.color.copy(n.desde).lerp(n.hasta, apertura);
    }
    const grosorLogo = RADIO_ARISTA_LOGO * (1 - apertura) + 0.012 * apertura;
    for (let i = 0; i < aristasLogo.length; i++) {
      const a = aristasLogo[i];
      colocarArista(a.malla, nodos[a.a].malla.position, nodos[a.b].malla.position, grosorLogo);
      a.material.opacity = 1 - apertura * 0.88;
      a.malla.visible = a.material.opacity > 0.01;
    }

    const nacer = suave(tramo(p, 0.1, MOMENTOS.constelacion));
    const latido = reducido ? 0 : Math.sin(tiempo * 2.4) * 0.025;
    centro.scale.setScalar(Math.max(0.0001, RADIO_CENTRO * nacer * (1 + latido)));
    anillo.scale.setScalar(Math.max(0.0001, nacer));
    anilloMat.opacity = 0.8 * nacer;
    anillo.rotation.z = tiempo * 0.35;
    for (let i = 0; i < rayos.length; i++) {
      colocarArista(rayos[i].malla, CENTRO, nodos[i].malla.position, RADIO_RAYO);
      rayos[i].material.opacity = 0.9 * nacer;
      rayos[i].malla.visible = nacer > 0.01;
    }

    // El sistema aparece y escribe su pedido.
    const sistemaVe = suave(tramo(p, 0.24, MOMENTOS.pedido));
    sistema.scale.setScalar(Math.max(0.0001, sistemaVe));
    sistema.rotation.y = 0.35 + incX * 0.1;

    // La partícula: sistema → Conecta (0,34–0,48), Conecta → válvula (0,48–0,56),
    // espera cupo en la válvula, y válvula → celular (0,6–MOMENTOS.celular).
    let u = 0;
    if (p < 0.48) u = tramo(p, MOMENTOS.pedido, 0.48) / 3;
    else if (p < 0.56) u = 1 / 3 + tramo(p, 0.48, 0.56) / 3;
    else if (p < 0.6) u = 2 / 3;
    else u = 2 / 3 + tramo(p, 0.6, MOMENTOS.celular) / 3;
    const viajando = p > MOMENTOS.pedido - 0.005 && p < MOMENTOS.celular + 0.01;
    ruta.getPoint(u, tmpPos);
    particula.position.copy(tmpPos);
    halo.position.copy(tmpPos);
    particula.visible = viajando;
    halo.visible = viajando;
    const brillo = reducido ? 1 : 0.85 + Math.sin(tiempo * 6) * 0.15;
    halo.scale.setScalar(0.9 * brillo);

    // La ruta se dibuja detrás de la partícula.
    const visibleRuta = p < MOMENTOS.pedido ? 0 : u;
    const porLado = LADOS_TUBO * 6;
    rutaGeo.setDrawRange(0, Math.floor((visibleRuta * indicesRuta) / porLado) * porLado);

    // La válvula: la compuerta se abre si hay cupo, y una marca más se enciende.
    const abrir = suave(tramo(p, 0.55, 0.585)) * (1 - suave(tramo(p, 0.6, 0.64)));
    compuertaArriba.position.y = abrir * 0.78;
    compuertaAbajo.position.y = -abrir * 0.78;
    compuertaMat.opacity = 0.45 * (1 - abrir * 0.6);
    aro.scale.setScalar(1 + abrir * 0.06);
    const encendidas = TOPE_USADO + (p >= MOMENTOS.valvula ? 1 : 0);
    if (encendidas !== marcasEncendidas) {
      marcasEncendidas = encendidas;
      for (let i = 0; i < MARCAS_TOPE; i++) marcas.setColorAt(i, i < encendidas ? colorMarcaLlena : colorMarcaVacia);
      if (marcas.instanceColor) marcas.instanceColor.needsUpdate = true;
    }
    valvula.rotation.x = incY * 0.08;
    // La válvula y el celular no estorban al logo: entran cuando se abre la constelación.
    valvula.scale.setScalar(Math.max(0.0001, suave(tramo(p, 0.1, 0.26))));
    celular.scale.setScalar(Math.max(0.0001, suave(tramo(p, 0.12, 0.3))));

    // El celular: se inclina con el giroscopio o el mouse.
    celular.rotation.y = GIRO_CELULAR + incX * 0.42;
    celular.rotation.x = incY * 0.28;
    celular.position.y = CELULAR.y + (reducido ? 0 : Math.sin(tiempo * 1.1) * 0.04);
    dibujarPantalla(p >= MOMENTOS.celular ? 1 : 0);

    // Lo que vuelve por el webhook.
    const veVuelta = suave(tramo(p, 0.78, 0.83));
    vueltaGeo.setDrawRange(0, Math.floor((veVuelta * indicesVuelta) / porLado) * porLado);
    vueltaMalla.visible = veVuelta > 0.001;
    for (let i = 0; i < pulsos.length; i++) {
      const fin = LLEGADAS[i];
      const t = tramo(p, fin - 0.07, fin);
      const pulso = pulsos[i];
      pulso.malla.visible = t > 0 && t < 1;
      if (pulso.malla.visible) vuelta.getPoint(suave(t), pulso.malla.position);
    }

    // Toda la maqueta se mueve apenas con la inclinación.
    raiz.rotation.y = incX * 0.05;
    raiz.rotation.x = incY * 0.03;

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
    // En pantallas angostas la cámara se aleja para que quepa lo mismo a lo ancho.
    const aspecto = anchoCss / altoCss;
    const factor = aspecto < 1.35 ? limitar(1.35 / aspecto, 1, 2.3) : 1;
    tmpB.subVectors(tmpPos, tmpMira).multiplyScalar(factor);
    camara.position.addVectors(tmpMira, tmpB);
    camara.position.x += incX * 0.35;
    camara.position.y -= incY * 0.22;
    camara.lookAt(tmpMira);
  }

  function posicionar(): void {
    camara.updateMatrixWorld();
    raiz.updateMatrixWorld();
    const p = pActual;
    for (let i = 0; i < ordenAnclas.length; i++) {
      const id = ordenAnclas[i];
      const ancla = anclas[id];
      switch (id) {
        case 'ocupasalud':
        case 'autoaprender':
        case 'bogota': {
          const m = nodoPorId[id].malla;
          tmpProy.copy(m.position).setY(m.position.y + m.scale.y + 0.3);
          break;
        }
        case 'conecta':
          tmpProy.set(0, RADIO_CENTRO + 0.55, 0);
          break;
        case 'sistema':
          tmpProy.copy(SISTEMA).setY(SISTEMA.y + 0.65);
          break;
        case 'tope':
          tmpProy.copy(VALVULA).setY(VALVULA.y + 1.55);
          break;
        case 'celular':
          tmpProy.copy(CELULAR).setY(CELULAR.y + 1.85);
          break;
        case 'estados':
          tmpProy.set(0, RADIO_CENTRO + 1.25, 0);
          break;
      }
      tmpProy.applyMatrix4(raiz.matrixWorld).project(camara);
      const ventana = VENTANAS[id];
      ancla.x = (tmpProy.x * 0.5 + 0.5) * anchoCss;
      ancla.y = (-tmpProy.y * 0.5 + 0.5) * altoCss;
      ancla.visible =
        p >= ventana[0] &&
        p <= ventana[1] &&
        tmpProy.z < 1 &&
        ancla.x > 8 &&
        ancla.x < anchoCss - 8 &&
        ancla.y > 8 &&
        ancla.y < altoCss - 8;
    }
    op.alPosicionar(anclas);
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
    tiempo += dt;
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

  // Las letras de la pantalla del celular: se redibuja cuando terminan de cargar.
  void document.fonts?.ready.then(() => {
    if (destruido) return;
    estadoPantalla = -1;
    solicitarDibujo();
  });

  aplicarColores();
  redimensionar(padre.clientWidth, padre.clientHeight);
  actualizar(0);
  dibujar();

  return {
    progreso(p: number): void {
      if (destruido) return;
      pObjetivo = limitar(Number.isFinite(p) ? p : 0, 0, 1);
      if (reducido) solicitarDibujo();
    },

    inclinar(x: number, y: number): void {
      if (destruido) return;
      incXObjetivo = limitar(Number.isFinite(x) ? x : 0, -1, 1);
      incYObjetivo = limitar(Number.isFinite(y) ? y : 0, -1, 1);
      if (reducido) solicitarDibujo();
    },

    refrescarColores(): void {
      if (destruido) return;
      aplicarColores();
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

function cuerpoCelular(): ExtrudeGeometry {
  const ancho = 1.5;
  const alto = 3.0;
  const r = 0.24;
  const x = -ancho / 2;
  const y = -alto / 2;
  const forma = new Shape();
  forma.moveTo(x + r, y);
  forma.lineTo(x + ancho - r, y);
  forma.quadraticCurveTo(x + ancho, y, x + ancho, y + r);
  forma.lineTo(x + ancho, y + alto - r);
  forma.quadraticCurveTo(x + ancho, y + alto, x + ancho - r, y + alto);
  forma.lineTo(x + r, y + alto);
  forma.quadraticCurveTo(x, y + alto, x, y + alto - r);
  forma.lineTo(x, y + r);
  forma.quadraticCurveTo(x, y, x + r, y);
  const geo = new ExtrudeGeometry(forma, {
    depth: 0.12,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -0.06);
  return geo;
}

function texturaHalo(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** La pantalla del celular: el chat de WhatsApp como lo pinta la vista previa del panel. Datos ficticios. */
function pintarPantalla(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  conMensaje: boolean,
  c: ColoresCanal,
): void {
  const letra = (peso: number, px: number) => `${peso} ${px}px 'DM Sans', 'Segoe UI', system-ui, sans-serif`;
  ctx.clearRect(0, 0, w, h);

  // Fondo del chat con su trama de puntos.
  ctx.fillStyle = c.chat;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = c.chatPunto;
  for (let y = 150; y < h; y += 22) {
    for (let x = 8; x < w; x += 22) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Encabezado.
  ctx.fillStyle = c.tinta;
  ctx.fillRect(0, 0, w, 150);
  ctx.fillStyle = c.tintaSuave;
  ctx.font = letra(500, 22);
  ctx.fillText('9:41', 28, 38);
  ctx.beginPath();
  ctx.arc(76, 100, 30, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  // Los tres nodos del logo, en miniatura.
  const nodo = (x: number, y: number, col: string) => {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = col;
    ctx.fill();
  };
  ctx.strokeStyle = c.oro3;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(65, 94);
  ctx.lineTo(87, 94);
  ctx.lineTo(76, 114);
  ctx.closePath();
  ctx.stroke();
  nodo(65, 94, c.oro1);
  nodo(87, 94, c.oro2);
  nodo(76, 114, c.oro6);
  ctx.fillStyle = '#ffffff';
  ctx.font = letra(700, 28);
  ctx.fillText('Aviso de ejemplo', 124, 96);
  ctx.fillStyle = c.tintaSuave;
  ctx.font = letra(400, 21);
  ctx.fillText('Cuenta de empresa', 124, 126);

  // Etiqueta del día.
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  redondeado(ctx, w / 2 - 44, 186, 88, 36, 12);
  ctx.fill();
  ctx.fillStyle = c.textoSuave;
  ctx.font = letra(500, 19);
  ctx.textAlign = 'center';
  ctx.fillText('HOY', w / 2, 211);
  ctx.textAlign = 'left';

  if (!conMensaje) {
    ctx.fillStyle = c.textoSuave;
    ctx.font = letra(400, 22);
    ctx.textAlign = 'center';
    ctx.fillText('Esperando el mensaje…', w / 2, h / 2);
    ctx.textAlign = 'left';
    return;
  }

  // La burbuja.
  const x0 = 34;
  const anchoBurbuja = w - 96;
  const texto =
    'Hola, María. Te recordamos tu cita de mañana a las 8:00. Si no puedes asistir, respóndenos por aquí.';
  ctx.font = letra(400, 25);
  const lineas = partir(ctx, texto, anchoBurbuja - 40);
  const altoBurbuja = 70 + lineas.length * 34 + 70;
  const y0 = 252;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(36,22,64,0.14)';
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 3;
  redondeado(ctx, x0, y0, anchoBurbuja, altoBurbuja, 18);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x0 + 2, y0);
  ctx.lineTo(x0 - 14, y0);
  ctx.lineTo(x0 + 2, y0 + 18);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = c.burbujaTexto;
  ctx.font = letra(700, 25);
  ctx.fillText('Recordatorio de cita', x0 + 20, y0 + 44);
  ctx.font = letra(400, 25);
  lineas.forEach((l, i) => ctx.fillText(l, x0 + 20, y0 + 86 + i * 34));
  ctx.fillStyle = c.textoSuave;
  ctx.font = letra(400, 20);
  ctx.fillText('Datos de ejemplo', x0 + 20, y0 + altoBurbuja - 22);
  ctx.textAlign = 'right';
  ctx.fillText('18:40', x0 + anchoBurbuja - 18, y0 + altoBurbuja - 22);
  ctx.textAlign = 'left';

  // El botón de la plantilla.
  const yb = y0 + altoBurbuja + 10;
  ctx.fillStyle = '#ffffff';
  redondeado(ctx, x0, yb, anchoBurbuja, 62, 16);
  ctx.fill();
  ctx.fillStyle = c.enlace;
  ctx.font = letra(500, 24);
  ctx.textAlign = 'center';
  ctx.fillText('Ver detalles de la cita', x0 + anchoBurbuja / 2, yb + 40);
  ctx.textAlign = 'left';
}

function redondeado(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function partir(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const palabras = texto.split(' ');
  const lineas: string[] = [];
  let linea = '';
  for (const p of palabras) {
    const prueba = linea ? `${linea} ${p}` : p;
    if (ctx.measureText(prueba).width > ancho && linea) {
      lineas.push(linea);
      linea = p;
    } else {
      linea = prueba;
    }
  }
  if (linea) lineas.push(linea);
  return lineas;
}
