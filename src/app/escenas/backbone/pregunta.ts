/**
 * "La vida de una pregunta": el circuito del backbone de IA como una columna vertebral cerrada.
 * Un mensaje sale de una plataforma, cruza la puerta de la llave, pasa por el cupo de su llave,
 * llega al agente (la estrella del favicon del panel) con sus skills, consulta un sistema mientras
 * el muro del socket rechaza la red de metadatos, y vuelve en streaming hasta dejar un recibo.
 * Todo el estado sale del progreso (0..1): subir el scroll devuelve la escena exacta.
 * Independiente de Angular: el anfitrión la carga con import() solo en el navegador.
 */
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  DynamicDrawUsage,
  EdgesGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  SRGBColorSpace,
  Scene,
  Shape,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';

// ---------------------------------------------------------------- contrato

export type AnclaPregunta =
  | 'ahdo'
  | 'ocupasalud'
  | 'puerta'
  | 'rebote'
  | 'cupo'
  | 'agente'
  | 'skill'
  | 'sistema'
  | 'muro'
  | 'recibo';

export interface PosicionAncla {
  x: number;
  y: number;
  visible: boolean;
}

export interface ColoresPregunta {
  fondo: string;
  linea: string;
  lineaSuave: string;
  tinta: string;
  tinta3: string;
  senal: string;
  indigo: string;
  violeta: string;
  noche: string;
  exito: string;
  aviso: string;
  peligro: string;
  ahdo: string;
  ocupasalud: string;
  superficie: string;
  superficie2: string;
}

export interface OpcionesPregunta {
  lienzo: HTMLCanvasElement;
  reducido: boolean;
  colores: () => ColoresPregunta;
  /**
   * Px CSS relativos al lienzo. El objeto se reutiliza entre cuadros: léelo en el acto.
   * `ancho` es el del lienzo, para que quien pinta las etiquetas no las deje cortadas en el borde
   * sin tener que medir el DOM en cada cuadro.
   */
  alPosicionar: (pos: Readonly<Record<AnclaPregunta, PosicionAncla>>, ancho: number) => void;
}

export interface EscenaPregunta {
  progreso(p: number): void;
  /** Px CSS que tapa un panel a la izquierda: el centro de la imagen se corre a la derecha. */
  margenIzquierdo(px: number): void;
  inclinar(x: number, y: number): void;
  refrescarColores(): void;
  destruir(): void;
}

/** El progreso que deja a la vista cada paso del texto (contenido.ts guarda una copia). */
export const MOMENTOS_PREGUNTA = [0.06, 0.2, 0.34, 0.5, 0.65, 0.8, 0.96];

// ---------------------------------------------------------------- geometría del circuito

const RX = 7.2;
const RZ = 4.4;
const ANG0 = Math.PI * 0.5;
const VERTEBRAS = 84;

/** Dónde está cada estación sobre el circuito (fracción de vuelta). */
const U = {
  plataforma: 0,
  puerta: 0.1,
  cupo: 0.22,
  agente: 0.5,
  sistema: 0.63,
  muro: 0.74,
};

/** Hacia dónde mira la cámara según el progreso: [p, u]. */
const FOCO: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0.08, 0.015],
  [0.2, U.puerta],
  [0.34, U.cupo],
  [0.5, U.agente],
  [0.65, 0.67],
  [0.8, 0.85],
  [0.96, 1],
  [1, 1],
];

const limitar = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const tramo = (p: number, a: number, b: number) => limitar((p - a) / (b - a), 0, 1);
const suave = (t: number) => t * t * (3 - 2 * t);
/** 0 → 1 → 0 con mesetas: visible entre b y c, sube desde a y baja hasta d. */
const meseta = (p: number, a: number, b: number, c: number, d: number) =>
  suave(tramo(p, a, b)) * (1 - suave(tramo(p, c, d)));

function puntoLazo(u: number, salida: Vector3): Vector3 {
  const a = ANG0 + u * Math.PI * 2;
  return salida.set(Math.cos(a) * RX, 0.6 + 0.32 * Math.sin(a * 2), Math.sin(a) * RZ);
}

function tangenteLazo(u: number, salida: Vector3): Vector3 {
  const a = ANG0 + u * Math.PI * 2;
  return salida.set(-Math.sin(a) * RX, 0.64 * Math.cos(a * 2), Math.cos(a) * RZ).normalize();
}

function normalLazo(u: number, salida: Vector3): Vector3 {
  const a = ANG0 + u * Math.PI * 2;
  return salida.set(Math.cos(a) / RX, 0, Math.sin(a) / RZ).normalize();
}

function focoEn(p: number): number {
  for (let i = 1; i < FOCO.length; i++) {
    const [pb, ub] = FOCO[i];
    if (p <= pb) {
      const [pa, ua] = FOCO[i - 1];
      return ua + (ub - ua) * suave(tramo(p, pa, pb));
    }
  }
  return 1;
}

// ---------------------------------------------------------------- escena

export function crearPregunta(op: OpcionesPregunta): EscenaPregunta {
  const { lienzo, reducido } = op;
  const padre: Element = lienzo.parentElement ?? lienzo;

  const renderer = new WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;

  const escena = new Scene();
  const niebla = new Fog(0x0b0f1a, 16, 40);
  escena.fog = niebla;
  const camara = new PerspectiveCamera(42, 1, 0.1, 120);

  const desechables: Array<{ dispose(): void }> = [];
  const registrar = <T extends { dispose(): void }>(d: T): T => {
    desechables.push(d);
    return d;
  };

  escena.add(new HemisphereLight(0xffffff, 0x1a2136, Math.PI * 0.55));
  const luz = new DirectionalLight(0xffffff, Math.PI * 0.55);
  luz.position.set(4, 10, 7);
  escena.add(luz);

  // Vectores de trabajo: nada se crea dentro del bucle.
  const v1 = new Vector3();
  const v2 = new Vector3();
  const v3 = new Vector3();
  const eje = new Vector3(0, 0, 1);
  const q = new Quaternion();
  const m4 = new Matrix4();
  const escalaUno = new Vector3(1, 1, 1);
  const c1 = new Color();
  const c2 = new Color();

  // ---- texturas pintadas una sola vez

  const halo = registrar(texturaHalo());
  const documento = registrar(texturaDocumento());
  const recibo = registrar(texturaRecibo());

  // ---- piso: el plano del circuito, en anillos y radios

  const piso = registrar(geometriaPiso());
  const matPiso = registrar(new LineBasicMaterial({ transparent: true, opacity: 0.55 }));
  escena.add(new LineSegments(piso, matPiso));

  // ---- polvo de fondo

  const polvoGeo = registrar(new BufferGeometry());
  {
    const n = 260;
    const pos = new Float32Array(n * 3);
    let s = 7;
    const azar = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (azar() - 0.5) * 34;
      pos[i * 3 + 1] = azar() * 9 - 0.5;
      pos[i * 3 + 2] = (azar() - 0.5) * 24;
    }
    polvoGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  }
  const matPolvo = registrar(
    new PointsMaterial({ size: 0.06, transparent: true, opacity: 0.55, map: halo, depthWrite: false }),
  );
  const polvo = new Points(polvoGeo, matPolvo);
  escena.add(polvo);

  // ---- la columna: el cable y sus vértebras

  const cableGeo = registrar(new BufferGeometry());
  {
    const n = 240;
    const pos = new Float32Array((n + 1) * 3);
    for (let i = 0; i <= n; i++) {
      puntoLazo(i / n, v1);
      pos[i * 3] = v1.x;
      pos[i * 3 + 1] = v1.y;
      pos[i * 3 + 2] = v1.z;
    }
    cableGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  }
  const matCable = registrar(new LineBasicMaterial({ transparent: true, opacity: 0.9 }));
  escena.add(new Line(cableGeo, matCable));

  const vertebraGeo = registrar(new TorusGeometry(0.3, 0.045, 6, 22));
  const matVertebra = registrar(new MeshBasicMaterial());
  const vertebras = new InstancedMesh(vertebraGeo, matVertebra, VERTEBRAS);
  for (let i = 0; i < VERTEBRAS; i++) {
    const u = i / VERTEBRAS;
    puntoLazo(u, v1);
    tangenteLazo(u, v2);
    q.setFromUnitVectors(eje, v2);
    m4.compose(v1, q, escalaUno);
    vertebras.setMatrixAt(i, m4);
    vertebras.setColorAt(i, c1.set(0xffffff));
  }
  vertebras.instanceMatrix.needsUpdate = true;
  escena.add(vertebras);

  // ---- las dos plataformas

  const torreGeo = registrar(new BoxGeometry(1.2, 2.4, 1.2));
  const torreBordes = registrar(new EdgesGeometry(torreGeo));
  const matAhdo = registrar(new MeshLambertMaterial());
  const matOcupa = registrar(new MeshLambertMaterial());
  const matBordeTorre = registrar(new LineBasicMaterial({ transparent: true, opacity: 0.8 }));

  const torreAhdo = new Group();
  torreAhdo.add(new Mesh(torreGeo, matAhdo), new LineSegments(torreBordes, matBordeTorre));
  puntoLazo(U.plataforma, v1);
  normalLazo(U.plataforma, v2);
  torreAhdo.position.set(v1.x + v2.x * 1.9 - 0.9, 1.2, v1.z + v2.z * 1.9);
  escena.add(torreAhdo);

  const torreOcupa = new Group();
  torreOcupa.add(new Mesh(torreGeo, matOcupa), new LineSegments(torreBordes, matBordeTorre));
  torreOcupa.scale.set(0.9, 0.8, 0.9);
  torreOcupa.position.set(torreAhdo.position.x + 2.2, 0.96, torreAhdo.position.z - 0.4);
  escena.add(torreOcupa);

  // Ventanas: franjas claras en la cara frontal de cada torre.
  const ventanaGeo = registrar(new PlaneGeometry(0.8, 0.08));
  const matVentana = registrar(new MeshBasicMaterial({ transparent: true, opacity: 0.55 }));
  for (const torre of [torreAhdo, torreOcupa]) {
    for (let i = 0; i < 6; i++) {
      const v = new Mesh(ventanaGeo, matVentana);
      v.position.set(0, -0.8 + i * 0.32, 0.605);
      torre.add(v);
    }
  }

  // ---- el mensaje (con su llave) y el intruso (sin llave)

  const capsulaGeo = registrar(new CapsuleGeometry(0.15, 0.34, 4, 12));
  const matMensaje = registrar(new MeshBasicMaterial());
  const matHaloMensaje = registrar(
    new SpriteMaterial({ map: halo, transparent: true, blending: AdditiveBlending, depthWrite: false }),
  );
  const mensaje = new Group();
  const cuerpoMensaje = new Mesh(capsulaGeo, matMensaje);
  cuerpoMensaje.rotation.x = Math.PI / 2;
  mensaje.add(cuerpoMensaje);
  const llaveAnillo = registrar(new TorusGeometry(0.09, 0.03, 6, 14));
  const llaveVastago = registrar(new BoxGeometry(0.04, 0.04, 0.22));
  const matLlave = registrar(new MeshBasicMaterial());
  const llave = new Group();
  const anilloLlave = new Mesh(llaveAnillo, matLlave);
  anilloLlave.rotation.y = Math.PI / 2;
  const vastago = new Mesh(llaveVastago, matLlave);
  vastago.position.z = -0.16;
  llave.add(anilloLlave, vastago);
  llave.position.set(0, 0.24, -0.1);
  mensaje.add(llave);
  const haloMensaje = new Sprite(matHaloMensaje);
  haloMensaje.scale.setScalar(1.3);
  mensaje.add(haloMensaje);
  escena.add(mensaje);

  const matIntruso = registrar(new MeshBasicMaterial({ transparent: true, opacity: 0.8 }));
  const intruso = new Mesh(capsulaGeo, matIntruso);
  escena.add(intruso);

  // ---- la puerta de la llave

  const puerta = new Group();
  const barraV = registrar(new BoxGeometry(0.1, 1.7, 0.1));
  const barraH = registrar(new BoxGeometry(1.5, 0.1, 0.1));
  const matPuerta = registrar(new MeshLambertMaterial());
  const marco = [
    new Mesh(barraV, matPuerta),
    new Mesh(barraV, matPuerta),
    new Mesh(barraH, matPuerta),
    new Mesh(barraH, matPuerta),
  ];
  marco[0].position.set(-0.7, 0, 0);
  marco[1].position.set(0.7, 0, 0);
  marco[2].position.set(0, 0.8, 0);
  marco[3].position.set(0, -0.8, 0);
  puerta.add(...marco);
  const cerraduraGeo = registrar(new TorusGeometry(0.14, 0.035, 6, 18));
  const matCerradura = registrar(new MeshBasicMaterial());
  const cerradura = new Mesh(cerraduraGeo, matCerradura);
  cerradura.position.set(0, 1.08, 0);
  puerta.add(cerradura);
  const matHaloPuerta = registrar(
    new SpriteMaterial({ map: halo, transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0 }),
  );
  const haloPuerta = new Sprite(matHaloPuerta);
  haloPuerta.scale.setScalar(2.6);
  puerta.add(haloPuerta);
  puntoLazo(U.puerta, v1);
  tangenteLazo(U.puerta, v2);
  puerta.position.copy(v1).add(v3.set(0, 0.25, 0));
  puerta.quaternion.setFromUnitVectors(eje, v2.setY(0).normalize());
  escena.add(puerta);

  // ---- el cupo: un balde de fichas por llave

  const balde = new Group();
  const baldeGeo = registrar(new CylinderGeometry(0.78, 0.7, 1.4, 28, 1, true));
  const matBalde = registrar(
    new MeshBasicMaterial({ transparent: true, opacity: 0.12, side: DoubleSide, depthWrite: false }),
  );
  balde.add(new Mesh(baldeGeo, matBalde));
  const bordeBalde = registrar(new EdgesGeometry(baldeGeo, 30));
  const matBordeBalde = registrar(new LineBasicMaterial({ transparent: true, opacity: 0.7 }));
  balde.add(new LineSegments(bordeBalde, matBordeBalde));
  const fichaGeo = registrar(new BoxGeometry(0.2, 0.2, 0.2));
  const matFicha = registrar(new MeshLambertMaterial());
  const FICHAS = 30;
  const fichas = new InstancedMesh(fichaGeo, matFicha, FICHAS);
  fichas.instanceMatrix.setUsage(DynamicDrawUsage);
  const posFichas: Vector3[] = [];
  for (let i = 0; i < FICHAS; i++) {
    const capa = Math.floor(i / 6);
    const a = (i % 6) * ((Math.PI * 2) / 6) + capa * 0.5;
    posFichas.push(new Vector3(Math.cos(a) * 0.42, -0.52 + capa * 0.24, Math.sin(a) * 0.42));
  }
  balde.add(fichas);
  puntoLazo(U.cupo, v1);
  normalLazo(U.cupo, v2);
  balde.position.set(v1.x + v2.x * 1.55, 0.75, v1.z + v2.z * 1.55);
  escena.add(balde);
  const fichaLibre = new Vector3();

  // ---- el agente: la estrella del favicon, con sus skills alrededor

  const agente = new Group();
  puntoLazo(U.agente, v1);
  agente.position.set(v1.x, 2.35, v1.z - 0.2);
  escena.add(agente);

  const estrellaGeo = registrar(geometriaEstrella());
  const matEstrella = registrar(new MeshStandardMaterial({ metalness: 0.25, roughness: 0.32 }));
  const estrella = new Mesh(estrellaGeo, matEstrella);
  agente.add(estrella);
  const matHaloAgente = registrar(
    new SpriteMaterial({ map: halo, transparent: true, blending: AdditiveBlending, depthWrite: false }),
  );
  const haloAgente = new Sprite(matHaloAgente);
  haloAgente.scale.setScalar(4.6);
  agente.add(haloAgente);

  const SKILLS = 6;
  const tarjetaGeo = registrar(new BoxGeometry(0.62, 0.84, 0.03));
  const tarjetaBordes = registrar(new EdgesGeometry(tarjetaGeo));
  const matTarjeta = registrar(new MeshLambertMaterial({ map: documento }));
  const matTarjetaActiva = registrar(new MeshLambertMaterial({ map: documento }));
  const matBordeTarjeta = registrar(new LineBasicMaterial({ transparent: true, opacity: 0.85 }));
  const matBordeActiva = registrar(new LineBasicMaterial());
  const orbita = new Group();
  orbita.rotation.x = 0.32;
  agente.add(orbita);
  const tarjetas: Group[] = [];
  for (let i = 0; i < SKILLS; i++) {
    const t = new Group();
    const activa = i === 0;
    t.add(new Mesh(tarjetaGeo, activa ? matTarjetaActiva : matTarjeta));
    t.add(new LineSegments(tarjetaBordes, activa ? matBordeActiva : matBordeTarjeta));
    orbita.add(t);
    tarjetas.push(t);
  }
  const tarjetaElegida = tarjetas[0];

  // ---- el sistema de la empresa y la red de metadatos detrás de su muro

  const sistema = new Group();
  const sistemaGeo = registrar(new BoxGeometry(1.1, 1.9, 1.1));
  const matSistema = registrar(new MeshLambertMaterial());
  sistema.add(new Mesh(sistemaGeo, matSistema));
  const sistemaBordes = registrar(new EdgesGeometry(sistemaGeo));
  sistema.add(new LineSegments(sistemaBordes, matBordeTorre));
  for (let i = 0; i < 5; i++) {
    const v = new Mesh(ventanaGeo, matVentana);
    v.scale.x = 0.9;
    v.position.set(0, -0.6 + i * 0.3, 0.555);
    sistema.add(v);
  }
  puntoLazo(U.sistema, v1);
  normalLazo(U.sistema, v2);
  sistema.position.set(v1.x + v2.x * 2.3, 0.95, v1.z + v2.z * 2.3);
  sistema.lookAt(0, 0.95, 0);
  escena.add(sistema);

  const muro = new Group();
  const nucleoGeo = registrar(new BoxGeometry(0.8, 0.8, 0.8));
  const matNucleo = registrar(new MeshBasicMaterial());
  const nucleo = new Mesh(nucleoGeo, matNucleo);
  muro.add(nucleo);
  // La geometría base solo sirve para sacar las aristas: se libera en el acto.
  const icosaedro = new IcosahedronGeometry(1.15, 1);
  const escudoGeo = registrar(new EdgesGeometry(icosaedro));
  icosaedro.dispose();
  const matEscudo = registrar(new LineBasicMaterial({ transparent: true, opacity: 0.5 }));
  const escudo = new LineSegments(escudoGeo, matEscudo);
  muro.add(escudo);
  const matHaloMuro = registrar(
    new SpriteMaterial({ map: halo, transparent: true, blending: AdditiveBlending, depthWrite: false, opacity: 0 }),
  );
  const haloMuro = new Sprite(matHaloMuro);
  haloMuro.scale.setScalar(3.4);
  muro.add(haloMuro);
  puntoLazo(U.muro, v1);
  normalLazo(U.muro, v2);
  muro.position.set(v1.x + v2.x * 2.6, 1.2, v1.z + v2.z * 2.6);
  escena.add(muro);

  // El rayo del agente al sistema y la sonda que intenta la red de metadatos.
  const RAYO = 48;
  const rayoGeo = registrar(new BufferGeometry());
  {
    const pos = new Float32Array(RAYO * 3);
    const a = agente.position;
    const b = v3.copy(sistema.position).add(v1.set(0, 1.0, 0));
    for (let i = 0; i < RAYO; i++) {
      const t = i / (RAYO - 1);
      const alto = Math.sin(t * Math.PI) * 1.2;
      pos[i * 3] = a.x + (b.x - a.x) * t;
      pos[i * 3 + 1] = a.y + (b.y - a.y) * t + alto;
      pos[i * 3 + 2] = a.z + (b.z - a.z) * t;
    }
    rayoGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  }
  const matRayo = registrar(new LineBasicMaterial({ transparent: true, opacity: 0.95 }));
  const rayo = new Line(rayoGeo, matRayo);
  escena.add(rayo);
  const destinoSistema = new Vector3().copy(sistema.position).add(new Vector3(0, 1.0, 0));

  const sondaGeo = registrar(new SphereGeometry(0.1, 12, 10));
  const matSonda = registrar(new MeshBasicMaterial({ transparent: true }));
  const sonda = new Mesh(sondaGeo, matSonda);
  escena.add(sonda);
  const datoGeo = sondaGeo;
  const matDato = registrar(new MeshBasicMaterial({ transparent: true }));
  const dato = new Mesh(datoGeo, matDato);
  escena.add(dato);
  const choque = new Vector3();
  {
    // El punto del escudo que mira al agente: ahí se estrella la sonda.
    v1.copy(agente.position).sub(muro.position).normalize().multiplyScalar(1.15);
    choque.copy(muro.position).add(v1);
  }

  // ---- la respuesta en streaming: partículas que vuelven por la columna

  const FLUJO = 140;
  const flujoPos = new Float32Array(FLUJO * 3);
  const flujoGeo = registrar(new BufferGeometry());
  const atribFlujo = new BufferAttribute(flujoPos, 3);
  atribFlujo.setUsage(DynamicDrawUsage);
  flujoGeo.setAttribute('position', atribFlujo);
  const matFlujo = registrar(
    new PointsMaterial({
      size: 0.17,
      map: halo,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  const flujo = new Points(flujoGeo, matFlujo);
  flujo.frustumCulled = false;
  escena.add(flujo);

  // ---- el recibo

  const reciboGeo = registrar(new PlaneGeometry(1.0, 1.45));
  reciboGeo.translate(0, 0.725, 0);
  const matRecibo = registrar(new MeshBasicMaterial({ map: recibo, side: DoubleSide, transparent: true }));
  const papel = new Mesh(reciboGeo, matRecibo);
  papel.position.set(torreAhdo.position.x - 1.5, 0.15, torreAhdo.position.z + 0.6);
  papel.rotation.y = 0.35;
  escena.add(papel);

  // ---- anclas para las etiquetas del DOM

  const anclas: Record<AnclaPregunta, PosicionAncla> = {
    ahdo: { x: 0, y: 0, visible: false },
    ocupasalud: { x: 0, y: 0, visible: false },
    puerta: { x: 0, y: 0, visible: false },
    rebote: { x: 0, y: 0, visible: false },
    cupo: { x: 0, y: 0, visible: false },
    agente: { x: 0, y: 0, visible: false },
    skill: { x: 0, y: 0, visible: false },
    sistema: { x: 0, y: 0, visible: false },
    muro: { x: 0, y: 0, visible: false },
    recibo: { x: 0, y: 0, visible: false },
  };
  const puntoAncla: Record<AnclaPregunta, Vector3> = {
    ahdo: new Vector3(),
    ocupasalud: new Vector3(),
    puerta: new Vector3(),
    rebote: new Vector3(),
    cupo: new Vector3(),
    agente: new Vector3(),
    skill: new Vector3(),
    sistema: new Vector3(),
    muro: new Vector3(),
    recibo: new Vector3(),
  };
  const nombresAncla = Object.keys(anclas) as AnclaPregunta[];
  puntoAncla.ahdo.copy(torreAhdo.position).add(v1.set(0, 1.45, 0));
  puntoAncla.ocupasalud.copy(torreOcupa.position).add(v1.set(0, 1.2, 0));
  puntoAncla.puerta.copy(puerta.position).add(v1.set(0, 1.45, 0));
  puntoAncla.cupo.copy(balde.position).add(v1.set(0, 0.95, 0));
  puntoAncla.agente.copy(agente.position).add(v1.set(0, 1.45, 0));
  puntoAncla.sistema.copy(sistema.position).add(v1.set(0, 1.3, 0));
  puntoAncla.muro.copy(muro.position).add(v1.set(0, 1.45, 0));
  puntoAncla.recibo.copy(papel.position).add(v1.set(0, 1.65, 0));

  // ---- colores

  const col = {
    tinta: new Color(),
    tinta3: new Color(),
    senal: new Color(),
    indigo: new Color(),
    violeta: new Color(),
    linea: new Color(),
    lineaSuave: new Color(),
    exito: new Color(),
    aviso: new Color(),
    peligro: new Color(),
    superficie2: new Color(),
  };

  function aplicarColores(): void {
    const c = op.colores();
    col.tinta.set(c.tinta);
    col.tinta3.set(c.tinta3);
    col.senal.set(c.senal);
    col.indigo.set(c.indigo);
    col.violeta.set(c.violeta);
    col.linea.set(c.linea);
    col.lineaSuave.set(c.lineaSuave);
    col.exito.set(c.exito);
    col.aviso.set(c.aviso);
    col.peligro.set(c.peligro);
    col.superficie2.set(c.superficie2);
    niebla.color.set(c.fondo);

    matPiso.color.copy(col.lineaSuave);
    matPolvo.color.copy(col.tinta3);
    matCable.color.copy(col.linea);
    matAhdo.color.set(c.ahdo);
    matOcupa.color.set(c.ocupasalud);
    matBordeTorre.color.copy(col.tinta);
    matVentana.color.copy(col.tinta);
    matMensaje.color.copy(col.tinta);
    matHaloMensaje.color.copy(col.senal);
    matLlave.color.copy(col.aviso);
    matIntruso.color.copy(col.tinta3);
    matPuerta.color.copy(col.linea);
    matCerradura.color.copy(col.aviso);
    matBalde.color.copy(col.senal);
    matBordeBalde.color.copy(col.senal);
    matFicha.color.copy(col.senal);
    matEstrella.color.copy(col.indigo);
    matEstrella.emissive.copy(col.indigo);
    matEstrella.emissiveIntensity = 0.55;
    matHaloAgente.color.copy(col.violeta);
    matTarjeta.color.copy(col.superficie2).lerp(col.tinta, 0.55);
    matTarjetaActiva.color.copy(col.tinta);
    matBordeTarjeta.color.copy(col.linea);
    matBordeActiva.color.copy(col.senal);
    matSistema.color.set(c.superficie2);
    matNucleo.color.copy(col.peligro);
    matEscudo.color.copy(col.peligro);
    matHaloMuro.color.copy(col.peligro);
    matRayo.color.copy(col.senal);
    matSonda.color.copy(col.peligro);
    matDato.color.copy(col.exito);
    matFlujo.color.copy(col.senal);
  }

  // ---- estado

  let progreso = 0;
  let tiempo = 0;
  let incX = 0;
  let incY = 0;
  let incXObj = 0;
  let incYObj = 0;
  let anchoCss = 1;
  let altoCss = 1;
  let margen = 0;
  let destruido = false;
  let enVista = false;
  let pestanaVisible = document.visibilityState !== 'hidden';
  let idBucle = 0;
  let idDibujo = 0;
  let ultimo = 0;
  let primerCuadro = true;
  const camPos = new Vector3();
  const camMira = new Vector3();
  const camPosObj = new Vector3();
  const camMiraObj = new Vector3();

  function objetivoCamara(p: number): void {
    const uf = focoEn(p);
    puntoLazo(uf, v1);
    normalLazo(uf, v2);
    tangenteLazo(uf, v3);
    const alzaAgente = meseta(p, 0.4, 0.47, 0.56, 0.62);
    camMiraObj.copy(v1).setY(v1.y + 0.7 + alzaAgente * 1.3);
    camPosObj
      .copy(v1)
      .addScaledVector(v2, 7.2 + alzaAgente * 1.2)
      .addScaledVector(v3, -1.6)
      .setY(3.3 + alzaAgente * 1.4);

    // Vista de conjunto al empezar: el circuito completo desde arriba.
    const conjunto = 1 - suave(tramo(p, 0.02, 0.12));
    if (conjunto > 0) {
      camPosObj.lerp(v1.set(0, 17.5, 15.5), conjunto);
      camMiraObj.lerp(v2.set(0, 0.4, -0.6), conjunto);
    }
    // Agente, sistema y muro a la vez: desde adentro del circuito, alto, para que nada tape la cámara.
    const vistaSistema = meseta(p, 0.55, 0.6, 0.73, 0.79);
    if (vistaSistema > 0) {
      camPosObj.lerp(v1.set(3.4, 9.4, 8.2), vistaSistema);
      camMiraObj.lerp(v2.set(8.0, 1.1, -2.7), vistaSistema);
    }
    // La llegada: las dos plataformas y el recibo, con distancia.
    const llegada = suave(tramo(p, 0.84, 0.93));
    if (llegada > 0) {
      camPosObj.lerp(v1.set(-0.2, 4.6, 15.2), llegada);
      camMiraObj.lerp(v2.set(-0.7, 1.2, 6.0), llegada);
    }
    camPosObj.x += incX * 0.9;
    camPosObj.y -= incY * 0.5;
  }

  function actualizar(dt: number): void {
    const p = progreso;
    if (!reducido) {
      tiempo += dt;
      incX += (incXObj - incX) * (1 - Math.exp(-dt * 4));
      incY += (incYObj - incY) * (1 - Math.exp(-dt * 4));
    }

    // Cámara
    objetivoCamara(p);
    if (reducido || primerCuadro) {
      camPos.copy(camPosObj);
      camMira.copy(camMiraObj);
      primerCuadro = false;
    } else {
      const k = 1 - Math.exp(-dt * 6);
      camPos.lerp(camPosObj, k);
      camMira.lerp(camMiraObj, k);
    }
    camara.position.copy(camPos);
    camara.lookAt(camMira);

    // El mensaje: de la torre al circuito, la puerta, el cupo y el agente.
    let uMensaje: number;
    const salida = suave(tramo(p, 0.03, 0.1));
    if (p < 0.1) uMensaje = 0;
    else if (p < 0.17) uMensaje = 0.055;
    else if (p < 0.3) uMensaje = 0.055 + (U.cupo + 0.02 - 0.055) * suave(tramo(p, 0.17, 0.3));
    else if (p < 0.37) uMensaje = U.cupo + 0.02 + 0.02 * tramo(p, 0.3, 0.37);
    else uMensaje = U.cupo + 0.04 + (U.agente - U.cupo - 0.04) * suave(tramo(p, 0.37, 0.47));
    puntoLazo(uMensaje, v1);
    tangenteLazo(uMensaje, v2);
    if (p < 0.1) {
      v3.copy(torreAhdo.position).add(v2.set(0.62, 0.2, 0.2));
      v1.lerpVectors(v3, v1, salida);
      tangenteLazo(0, v2);
    }
    // Al llegar al agente, sube hacia la estrella y se funde.
    const fundir = suave(tramo(p, 0.44, 0.48));
    if (fundir > 0) v1.lerp(agente.position, fundir);
    mensaje.position.copy(v1);
    mensaje.quaternion.setFromUnitVectors(eje, v2);
    const visibleMensaje = p < 0.48;
    mensaje.visible = visibleMensaje;
    mensaje.scale.setScalar(1 - fundir * 0.7);
    matHaloMensaje.opacity = 0.7 + (reducido ? 0 : 0.2 * Math.sin(tiempo * 5));

    // El intruso sin llave: llega a la puerta y rebota.
    const ida = tramo(p, 0.1, 0.14);
    const vuelta = tramo(p, 0.14, 0.19);
    const uIntruso = 0.03 + (U.puerta - 0.015 - 0.03) * suave(ida) - 0.07 * suave(vuelta);
    puntoLazo(uIntruso, v1);
    tangenteLazo(uIntruso, v2);
    intruso.position.copy(v1).add(v3.set(0, 0.0, 0));
    intruso.quaternion.setFromUnitVectors(v3.set(0, 1, 0), v2);
    intruso.visible = p > 0.09 && p < 0.2;
    matIntruso.opacity = 0.85 * (1 - suave(tramo(p, 0.16, 0.2)));
    puntoAncla.rebote.copy(puerta.position).add(v3.set(0, 0.2, 0)).addScaledVector(v2, -0.9);

    // La puerta se enciende: roja con el intruso, verde con la llave.
    const golpe = meseta(p, 0.13, 0.14, 0.15, 0.18);
    const pasa = meseta(p, 0.19, 0.21, 0.23, 0.27);
    if (golpe > pasa) {
      matHaloPuerta.color.copy(col.peligro);
      matHaloPuerta.opacity = golpe * 0.9;
      matPuerta.color.copy(col.linea).lerp(col.peligro, golpe);
    } else {
      matHaloPuerta.color.copy(col.exito);
      matHaloPuerta.opacity = pasa * 0.8;
      matPuerta.color.copy(col.linea).lerp(col.exito, pasa);
    }

    // El cupo: una ficha sale del balde y acompaña al mensaje.
    const tomar = tramo(p, 0.3, 0.37);
    for (let i = 0; i < FICHAS; i++) {
      if (i === FICHAS - 1) {
        fichaLibre.copy(posFichas[i]);
        if (tomar > 0) {
          // Del balde (coordenadas locales) hacia el mensaje (coordenadas del mundo).
          v3.copy(mensaje.position).sub(balde.position);
          fichaLibre.lerp(v3, suave(tomar));
          fichaLibre.y += Math.sin(tomar * Math.PI) * 0.8;
        }
        const e = 1 - suave(tramo(p, 0.36, 0.38));
        m4.compose(fichaLibre, q.identity(), v3.setScalar(Math.max(e, 0.0001)));
      } else {
        m4.compose(posFichas[i], q.identity(), escalaUno);
      }
      fichas.setMatrixAt(i, m4);
    }
    fichas.instanceMatrix.needsUpdate = true;

    // El agente: gira, late y despliega una skill.
    estrella.rotation.y = tiempo * 0.45 + p * 2.4;
    const late = 0.5 + (reducido ? 0 : 0.12 * Math.sin(tiempo * 2.2));
    const absorbe = meseta(p, 0.45, 0.48, 0.5, 0.56);
    matHaloAgente.opacity = late + absorbe * 0.35;
    orbita.rotation.y = tiempo * 0.18 + p * 1.2;
    const carga = meseta(p, 0.47, 0.53, 0.6, 0.66);
    for (let i = 0; i < SKILLS; i++) {
      const t = tarjetas[i];
      const a = (i / SKILLS) * Math.PI * 2;
      t.position.set(Math.cos(a) * 2.05, 0, Math.sin(a) * 2.05);
      t.rotation.set(0, -a + Math.PI / 2, 0);
      t.scale.setScalar(i === 0 ? 1 : 1 - carga * 0.25);
    }
    // La tarjeta elegida sale de la órbita y se abre frente a la cámara.
    if (carga > 0) {
      orbita.worldToLocal(v1.copy(camara.position));
      v1.normalize().multiplyScalar(1.5);
      v1.y += 0.2;
      tarjetaElegida.position.lerp(v1, carga);
      tarjetaElegida.scale.setScalar(1 + carga * 0.75);
      // lookAt trabaja en coordenadas del mundo aunque la tarjeta sea hija de la órbita.
      tarjetaElegida.lookAt(v3.copy(camara.position));
    }
    tarjetaElegida.getWorldPosition(puntoAncla.skill);
    puntoAncla.skill.y += 0.75 + carga * 0.4;

    // La llamada al sistema y la sonda contra el muro.
    const dibujo = tramo(p, 0.56, 0.6);
    const apaga = 1 - tramo(p, 0.72, 0.76);
    rayoGeo.setDrawRange(0, Math.floor(RAYO * dibujo));
    rayo.visible = dibujo > 0 && apaga > 0;
    matRayo.opacity = 0.95 * apaga;
    const regreso = tramo(p, 0.6, 0.67);
    dato.visible = regreso > 0 && regreso < 1;
    dato.position.lerpVectors(destinoSistema, agente.position, suave(regreso));
    dato.position.y += Math.sin(regreso * Math.PI) * 1.2;

    const lanza = tramo(p, 0.6, 0.65);
    const rebota = tramo(p, 0.65, 0.71);
    sonda.visible = lanza > 0 && rebota < 1;
    if (rebota <= 0) sonda.position.lerpVectors(agente.position, choque, suave(lanza));
    else sonda.position.lerpVectors(choque, agente.position, suave(rebota) * 0.35);
    matSonda.opacity = 1 - rebota;
    const impacto = meseta(p, 0.64, 0.655, 0.67, 0.74);
    matHaloMuro.opacity = impacto * 0.9;
    matEscudo.opacity = 0.35 + impacto * 0.6;
    escudo.rotation.y = tiempo * 0.12;
    escudo.scale.setScalar(1 + impacto * 0.08);

    // El streaming: la respuesta vuelve por la columna hasta la plataforma.
    const cabeza = tramo(p, 0.7, 0.92) * 1.35;
    let flujoVisible = false;
    for (let i = 0; i < FLUJO; i++) {
      const s = cabeza - (i / FLUJO) * 0.35;
      const o = i * 3;
      if (s <= 0 || s >= 1) {
        flujoPos[o] = 0;
        flujoPos[o + 1] = -50;
        flujoPos[o + 2] = 0;
        continue;
      }
      flujoVisible = true;
      puntoLazo(U.agente + (1 - U.agente) * s, v1);
      const ola = reducido ? 0 : Math.sin(tiempo * 6 + i) * 0.05;
      flujoPos[o] = v1.x + ((i * 37) % 7) * 0.025 - 0.075;
      flujoPos[o + 1] = v1.y + 0.42 + ola + ((i * 13) % 5) * 0.03;
      flujoPos[o + 2] = v1.z + ((i * 53) % 9) * 0.02 - 0.08;
    }
    atribFlujo.needsUpdate = true;
    flujo.visible = flujoVisible;

    // Las vértebras se encienden donde va el mensaje o la respuesta.
    const uLuz = p < 0.48 ? uMensaje : U.agente + (1 - U.agente) * limitar(cabeza, 0, 1);
    const luzActiva = p < 0.48 || (cabeza > 0 && cabeza < 1.35);
    for (let i = 0; i < VERTEBRAS; i++) {
      const u = i / VERTEBRAS;
      let d = Math.abs(u - uLuz);
      if (d > 0.5) d = 1 - d;
      const brillo = luzActiva ? Math.exp(-(d * d) / 0.0012) : 0;
      // Lo recorrido por la respuesta queda encendido suave.
      const recorrido = p >= 0.48 && u >= U.agente && u <= uLuz ? 0.35 : 0;
      c1.copy(col.linea).lerp(col.senal, Math.max(brillo, recorrido));
      if (brillo > 0.6) c1.lerp(c2.copy(col.tinta), (brillo - 0.6) * 1.2);
      vertebras.setColorAt(i, c1);
    }
    if (vertebras.instanceColor) vertebras.instanceColor.needsUpdate = true;

    // El recibo sube junto a la plataforma.
    const sube = suave(tramo(p, 0.9, 0.97));
    papel.visible = sube > 0;
    papel.scale.set(1, Math.max(sube, 0.0001), 1);
    papel.position.y = 0.15 + sube * 0.25;

    polvo.rotation.y = tiempo * 0.01;

    // Visibilidad de las etiquetas: cada una vive en su tramo (y en la vista de conjunto).
    const conjunto = p < 0.07;
    fijarAncla('ahdo', conjunto || p < 0.24 || p > 0.86);
    fijarAncla('ocupasalud', conjunto || p < 0.24 || p > 0.86);
    fijarAncla('puerta', conjunto || (p > 0.1 && p < 0.3));
    fijarAncla('rebote', p > 0.135 && p < 0.19);
    fijarAncla('cupo', conjunto || (p > 0.26 && p < 0.42));
    fijarAncla('agente', conjunto || (p > 0.4 && p < 0.62));
    fijarAncla('skill', p > 0.5 && p < 0.63);
    fijarAncla('sistema', conjunto || (p > 0.56 && p < 0.74));
    fijarAncla('muro', p > 0.62 && p < 0.78);
    fijarAncla('recibo', p > 0.92);
  }

  const visibles: Record<AnclaPregunta, boolean> = {
    ahdo: false,
    ocupasalud: false,
    puerta: false,
    rebote: false,
    cupo: false,
    agente: false,
    skill: false,
    sistema: false,
    muro: false,
    recibo: false,
  };
  function fijarAncla(id: AnclaPregunta, v: boolean): void {
    visibles[id] = v;
  }

  function posicionarAnclas(): void {
    camara.updateMatrixWorld();
    for (let i = 0; i < nombresAncla.length; i++) {
      const id = nombresAncla[i];
      const a = anclas[id];
      v1.copy(puntoAncla[id]).project(camara);
      a.x = (v1.x * 0.5 + 0.5) * anchoCss;
      a.y = (-v1.y * 0.5 + 0.5) * altoCss;
      a.visible =
        visibles[id] && v1.z < 1 && a.x > -40 && a.x < anchoCss + 40 && a.y > -20 && a.y < altoCss + 40;
    }
    op.alPosicionar(anclas, anchoCss);
  }

  function dibujar(): void {
    renderer.render(escena, camara);
    posicionarAnclas();
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
    // El cuadro completo es más ancho que el lienzo: la parte que tapa el panel queda fuera.
    const m = Math.min(margen, ancho * 0.5);
    const completo = ancho + m;
    camara.aspect = completo / alto;
    // En vertical se abre el lente para que el circuito quepa.
    camara.fov = ancho / alto < 0.9 ? 58 : ancho / alto < 1.3 ? 50 : 42;
    if (m > 0) camara.setViewOffset(completo, alto, 0, 0, ancho, alto);
    else camara.clearViewOffset();
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

  aplicarColores();
  redimensionar(padre.clientWidth, padre.clientHeight);
  actualizar(0);
  dibujar();

  return {
    progreso(p: number): void {
      if (destruido) return;
      progreso = limitar(Number.isFinite(p) ? p : 0, 0, 1);
      if (!idBucle) solicitarDibujo();
    },
    margenIzquierdo(px: number): void {
      if (destruido) return;
      const m = Number.isFinite(px) ? Math.max(0, px) : 0;
      if (m === margen) return;
      margen = m;
      redimensionar(anchoCss, altoCss);
    },
    inclinar(x: number, y: number): void {
      if (destruido) return;
      incXObj = limitar(Number.isFinite(x) ? x : 0, -1, 1);
      incYObj = limitar(Number.isFinite(y) ? y : 0, -1, 1);
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
      vertebras.dispose();
      fichas.dispose();
      for (const d of desechables) d.dispose();
      desechables.length = 0;
      escena.clear();
      renderer.dispose();
      // Suelta el contexto WebGL ya: si no, cada visita al mundo deja uno vivo hasta que pase el recolector.
      renderer.forceContextLoss();
    },
  };
}

// ---------------------------------------------------------------- piezas

/** La estrella de 4 puntas del favicon (viewBox 32×32, centro en 16,15), extruida. */
function geometriaEstrella(): ExtrudeGeometry {
  const puntos: Array<[number, number]> = [
    [16, 6],
    [18.6, 12.4],
    [25, 15],
    [18.6, 17.6],
    [16, 24],
    [13.4, 17.6],
    [7, 15],
    [13.4, 12.4],
  ];
  const k = 1.2 / 9;
  const forma = new Shape();
  puntos.forEach(([x, y], i) => {
    const px = (x - 16) * k;
    const py = -(y - 15) * k;
    if (i === 0) forma.moveTo(px, py);
    else forma.lineTo(px, py);
  });
  forma.closePath();
  const geo = new ExtrudeGeometry(forma, {
    depth: 0.26,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

/** Anillos y radios sobre el piso: el plano del circuito. */
function geometriaPiso(): BufferGeometry {
  const pos: number[] = [];
  const v = new Vector3();
  for (const escala of [0.55, 1, 1.45, 1.9]) {
    const n = 96;
    for (let i = 0; i < n; i++) {
      for (const j of [i, i + 1]) {
        const a = (j / n) * Math.PI * 2;
        v.set(Math.cos(a) * RX * escala, 0, Math.sin(a) * RZ * escala);
        pos.push(v.x, 0, v.z);
      }
    }
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    pos.push(Math.cos(a) * RX * 0.55, 0, Math.sin(a) * RZ * 0.55);
    pos.push(Math.cos(a) * RX * 1.9, 0, Math.sin(a) * RZ * 1.9);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return geo;
}

function lienzo2d(ancho: number, alto: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  return [c, c.getContext('2d')];
}

/** Un halo radial blanco: el color lo pone cada material. */
function texturaHalo(): CanvasTexture {
  const [c, ctx] = lienzo2d(128, 128);
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** La cara de una tarjeta de skill: título y renglones de instrucciones, sin texto legible. */
function texturaDocumento(): CanvasTexture {
  const [c, ctx] = lienzo2d(128, 172);
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 172);
    ctx.fillStyle = '#4f46e5';
    ctx.fillRect(14, 16, 28, 28);
    ctx.fillStyle = '#9aa5bf';
    ctx.fillRect(50, 20, 60, 8);
    ctx.fillRect(50, 34, 40, 6);
    for (let i = 0; i < 7; i++) ctx.fillRect(14, 62 + i * 14, i % 3 === 2 ? 64 : 100, 5);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Un recibo de papel con renglones y un corte en zigzag. */
function texturaRecibo(): CanvasTexture {
  const [c, ctx] = lienzo2d(128, 186);
  if (ctx) {
    ctx.fillStyle = '#e8ecf6';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let x = 0; x <= 128; x += 8) ctx.lineTo(x, x % 16 === 0 ? 0 : 6);
    ctx.lineTo(128, 186);
    ctx.lineTo(0, 186);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5b6478';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(14, 28 + i * 20, 54, 6);
      ctx.fillRect(86, 28 + i * 20, 28, 6);
    }
    ctx.fillStyle = '#4f46e5';
    ctx.fillRect(14, 140, 100, 3);
    ctx.fillRect(14, 154, 46, 10);
    ctx.fillRect(78, 154, 36, 10);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
