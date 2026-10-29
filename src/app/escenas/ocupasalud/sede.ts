/**
 * "Un día en la IPS": la experiencia firma del mundo Ocupasalud.
 *
 * Una maqueta de una sede de ejemplo, vista desde arriba: recepción, sala de espera, cuatro
 * consultorios, rayos X y la salida. El paciente es el isotipo de Ocupasalud (la esfera azul
 * sobre la figura plateada) y recorre la sede con el progreso que maneja el scroll. Detrás de él
 * se pintan las dos líneas de piso de la marca, el azul de OCUPA y el verde de SALUD.
 * - Bajo sus pies corre el reloj de 6 horas de la encuesta (12 marcas de media hora).
 * - En rayos X aparece la nube de la plataforma externa, llega el aviso de estudio firmado y el
 *   PDF vuela a la carpeta que el paciente lleva encima.
 * - En la salida, el reloj se completa; la burbuja de la encuesta la pone el anfitrión en HTML.
 *
 * Independiente de Angular: el anfitrión lo carga con import() solo en el navegador.
 * Cero asignaciones por cuadro. En movimiento reducido dibuja un cuadro a demanda.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  InstancedMesh,
  Line,
  LineDashedMaterial,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  OrthographicCamera,
  PCFShadowMap,
  PlaneGeometry,
  QuadraticBezierCurve3,
  Quaternion,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three';
import { EVENTOS, RELOJ, RUTA, VENTANAS, salaActual, type AnclaSede, type SalaId } from './momentos';

// ---------------------------------------------------------------- contrato

export interface PosicionAncla {
  x: number;
  y: number;
  visible: boolean;
}

export interface ColoresSede {
  azul: string;
  verde: string;
  marino: string;
  esfera: string;
  plata: string;
  plata2: string;
  rojo: string;
  rayos: string;
  base: string;
  piso: string;
  muro: string;
}

export interface OpcionesSede {
  lienzo: HTMLCanvasElement;
  reducido: boolean;
  colores: () => ColoresSede;
  /** Px CSS relativos al lienzo. El objeto se reutiliza entre cuadros: léelo en el momento. */
  alPosicionar: (pos: Readonly<Record<AnclaSede, PosicionAncla>>) => void;
}

export interface EscenaSede {
  /** 0..1: el día completo del paciente. */
  progreso(p: number): void;
  /** -1..1, de Orientacion: gira un poco la maqueta. */
  inclinar(x: number, y: number): void;
  /** 0..0,5: fracción del ancho, a la izquierda, que tapan los pasos. La maqueta se corre a la derecha. */
  encuadre(fraccion: number): void;
  refrescarColores(): void;
  destruir(): void;
}

// ---------------------------------------------------------------- la sede

interface Sala {
  id: SalaId;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  tono: 'azul' | 'verde' | 'rayos';
  /** Dónde va el letrero (encima del muro del fondo). */
  letrero: readonly [number, number, number];
}

const SALAS: readonly Sala[] = [
  { id: 'recepcion', x0: -9.2, x1: -4.2, z0: 0.9, z1: 4.4, tono: 'azul', letrero: [-6.6, 1.4, 1.2] },
  { id: 'cola', x0: -4.2, x1: 1.4, z0: 1.5, z1: 4.4, tono: 'azul', letrero: [-1.4, 1.2, 1.6] },
  { id: 'medicina', x0: -9.2, x1: -5.4, z0: -3.6, z1: -0.7, tono: 'verde', letrero: [-7.3, 1.25, -3.5] },
  { id: 'optometria', x0: -5.4, x1: -2.0, z0: -3.6, z1: -0.7, tono: 'verde', letrero: [-3.7, 1.55, -3.5] },
  { id: 'audiometria', x0: -2.0, x1: 1.4, z0: -3.6, z1: -0.7, tono: 'verde', letrero: [-0.3, 1.25, -3.5] },
  { id: 'laboratorio', x0: 1.4, x1: 5.4, z0: -3.6, z1: -0.7, tono: 'verde', letrero: [3.4, 1.25, -3.5] },
  { id: 'rayosx', x0: 5.4, x1: 9.6, z0: -3.6, z1: 1.4, tono: 'rayos', letrero: [7.6, 1.25, -3.5] },
  { id: 'salida', x0: 5.4, x1: 9.6, z0: 1.4, z1: 4.4, tono: 'verde', letrero: [8.2, 1.3, 1.6] },
];

const LETREROS = Object.fromEntries(SALAS.map((s) => [s.id, s.letrero])) as Record<
  SalaId,
  readonly [number, number, number]
>;

const ALTO_MURO = 0.8;
const ALTO_FRENTE = 0.42;
const GROSOR = 0.12;

/** Muros: [x0, z0, x1, z1, alto]. La maqueta va en corte: los frentes son bajos o no existen. */
const MUROS: readonly (readonly [number, number, number, number, number])[] = [
  [-9.2, -3.6, 9.6, -3.6, ALTO_MURO],
  [-9.2, -3.6, -9.2, 2.6, ALTO_MURO],
  [-9.2, 4.0, -9.2, 4.4, ALTO_MURO],
  [-5.4, -3.6, -5.4, -0.7, ALTO_MURO],
  [-2.0, -3.6, -2.0, -0.7, ALTO_MURO],
  [1.4, -3.6, 1.4, -0.7, ALTO_MURO],
  [5.4, -3.6, 5.4, -0.4, ALTO_MURO],
  [5.4, 0.8, 5.4, 1.4, ALTO_MURO],
  [6.6, 1.4, 9.6, 1.4, ALTO_MURO],
  // Frentes de los consultorios, con la puerta frente a la parada del paciente.
  [-9.2, -0.7, -7.85, -0.7, ALTO_FRENTE],
  [-6.75, -0.7, -5.4, -0.7, ALTO_FRENTE],
  [-5.4, -0.7, -4.25, -0.7, ALTO_FRENTE],
  [-3.15, -0.7, -2.0, -0.7, ALTO_FRENTE],
  [-2.0, -0.7, -0.85, -0.7, ALTO_FRENTE],
  [0.25, -0.7, 1.4, -0.7, ALTO_FRENTE],
  [1.4, -0.7, 2.85, -0.7, ALTO_FRENTE],
  [3.95, -0.7, 5.4, -0.7, ALTO_FRENTE],
];

const LOSA = { x0: -9.2, x1: 9.6, z0: -3.6, z1: 4.4, alto: 0.3 };
const CENTRO = new Vector3((LOSA.x0 + LOSA.x1) / 2, 0, (LOSA.z0 + LOSA.z1) / 2);
/**
 * Desde dónde se mira: una isométrica de maqueta, a 45° por el frente derecho y 38° de alto.
 * La sede queda en diagonal y deja libre la esquina de abajo a la izquierda, donde van los pasos.
 */
const DIRECCION_CAMARA = new Vector3(1, 1.12, 1).normalize();
const DISTANCIA_CAMARA = 34;

const NUBE = new Vector3(5.8, 4.3, -3.3);
const GANTRY = new Vector3(7.5, 0.95, -2.45);
const ALTO_CARPETA = 1.5;
const RADIO_RELOJ = 0.72;
const MARCAS_RELOJ = 12;

/** Límites para encuadrar la maqueta: la losa, la altura de los muros y la nube. */
const ESQUINAS: readonly (readonly [number, number, number])[] = [
  [LOSA.x0 - 1.2, -LOSA.alto, LOSA.z0],
  [LOSA.x1, -LOSA.alto, LOSA.z0],
  [LOSA.x0 - 1.2, -LOSA.alto, LOSA.z1],
  [LOSA.x1, -LOSA.alto, LOSA.z1],
  [LOSA.x0, 1.6, LOSA.z0],
  [LOSA.x1, 1.6, LOSA.z0],
  [NUBE.x + 1.3, NUBE.y + 0.9, NUBE.z],
  [NUBE.x - 1.3, NUBE.y + 0.9, NUBE.z],
];

// ---------------------------------------------------------------- utilidades puras

const limitar = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const tramo = (p: number, a: number, b: number) => limitar((p - a) / (b - a), 0, 1);
const suave = (t: number) => t * t * (3 - 2 * t);
const campana = (p: number, a: number, b: number, borde = 0.02) =>
  Math.min(tramo(p, a - borde, a), 1 - tramo(p, b, b + borde));

/** Segmentos de la línea de piso: solo los tramos en los que el paciente camina. */
interface Segmento {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  pa: number;
  pb: number;
  largo: number;
  angulo: number;
  nx: number;
  nz: number;
}

const SEGMENTOS: readonly Segmento[] = (() => {
  const lista: Segmento[] = [];
  for (let i = 1; i < RUTA.length; i++) {
    const [pa, ax, az] = RUTA[i - 1];
    const [pb, bx, bz] = RUTA[i];
    const dx = bx - ax;
    const dz = bz - az;
    const largo = Math.hypot(dx, dz);
    if (largo < 1e-3) continue;
    lista.push({ ax, az, bx, bz, pa, pb, largo, angulo: Math.atan2(-dz, dx), nx: -dz / largo, nz: dx / largo });
  }
  return lista;
})();

// ---------------------------------------------------------------- escena

export function crearSede(op: OpcionesSede): EscenaSede {
  const { lienzo, reducido } = op;
  const padre: Element = lienzo.parentElement ?? lienzo;

  const renderer = new WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;

  const escena = new Scene();
  const camara = new OrthographicCamera(-1, 1, 1, -1, 0.1, 120);
  const raiz = new Group();
  escena.add(raiz);

  const desechables: Array<{ dispose(): void }> = [];
  const registrar = <T extends { dispose(): void }>(d: T): T => {
    desechables.push(d);
    return d;
  };

  // ---- luz

  escena.add(new HemisphereLight(0xffffff, 0xcfe0ec, Math.PI * 0.62));
  const sol = new DirectionalLight(0xffffff, Math.PI * 0.95);
  sol.position.set(-5, 16, 9);
  sol.castShadow = true;
  sol.shadow.mapSize.set(1024, 1024);
  sol.shadow.camera.left = -13;
  sol.shadow.camera.right = 13;
  sol.shadow.camera.top = 9;
  sol.shadow.camera.bottom = -9;
  sol.shadow.camera.near = 1;
  sol.shadow.camera.far = 45;
  sol.shadow.bias = -0.0008;
  sol.shadow.camera.updateProjectionMatrix();
  escena.add(sol);

  let paleta = op.colores();

  // ---- materiales

  const mat = (opciones: ConstructorParameters<typeof MeshStandardMaterial>[0]) =>
    registrar(new MeshStandardMaterial(opciones));
  const mLosa = mat({ roughness: 0.95 });
  const mMuro = mat({ roughness: 0.85 });
  const mMarino = mat({ roughness: 0.55 });
  const mAzul = mat({ roughness: 0.5 });
  const mVerde = mat({ roughness: 0.5 });
  const mBlanco = mat({ roughness: 0.6 });
  const mPlata = mat({ roughness: 0.32, metalness: 0.6 });
  const mEsfera = mat({ roughness: 0.22, metalness: 0.15 });
  const mPeones = mat({ roughness: 0.55 });
  const mRojo = mat({ roughness: 0.5 });
  const mGantry = mat({ roughness: 0.4 });
  const mNube = mat({ roughness: 0.9, transparent: true, opacity: 0.96 });
  const mInstancia = mat({ roughness: 0.6 });
  const mSalas = SALAS.map(() => mat({ roughness: 0.95 }));

  // ---- geometrías compartidas

  const cubo = registrar(new BoxGeometry(1, 1, 1));
  const plano = registrar(new PlaneGeometry(1, 1));
  plano.rotateX(-Math.PI / 2);

  const caja = (m: Material, sx: number, sy: number, sz: number, x: number, y: number, z: number, sombra = true) => {
    const malla = new Mesh(cubo, m);
    malla.scale.set(sx, sy, sz);
    malla.position.set(x, y, z);
    malla.castShadow = sombra;
    malla.receiveShadow = true;
    malla.matrixAutoUpdate = false;
    malla.updateMatrix();
    raiz.add(malla);
    return malla;
  };

  // ---- losa, pisos y franja de marca

  caja(mLosa, LOSA.x1 - LOSA.x0, LOSA.alto, LOSA.z1 - LOSA.z0, CENTRO.x, -LOSA.alto / 2, CENTRO.z, false);
  const mitad = (LOSA.x0 + LOSA.x1) / 2;
  caja(mAzul, mitad - LOSA.x0, 0.12, 0.03, (LOSA.x0 + mitad) / 2, -0.09, LOSA.z1 + 0.015, false);
  caja(mVerde, LOSA.x1 - mitad, 0.12, 0.03, (mitad + LOSA.x1) / 2, -0.09, LOSA.z1 + 0.015, false);

  SALAS.forEach((s, i) => {
    const piso = new Mesh(plano, mSalas[i]);
    piso.scale.set(s.x1 - s.x0 - 0.04, 1, s.z1 - s.z0 - 0.04);
    piso.position.set((s.x0 + s.x1) / 2, 0.004, (s.z0 + s.z1) / 2);
    piso.receiveShadow = true;
    piso.matrixAutoUpdate = false;
    piso.updateMatrix();
    raiz.add(piso);
  });

  // ---- muros (una sola llamada)

  const muros = new InstancedMesh(cubo, mMuro, MUROS.length);
  const ayudante = new Object3D();
  MUROS.forEach(([x0, z0, x1, z1, alto], i) => {
    const largoX = Math.abs(x1 - x0);
    const largoZ = Math.abs(z1 - z0);
    ayudante.position.set((x0 + x1) / 2, alto / 2, (z0 + z1) / 2);
    ayudante.scale.set(largoX > 0 ? largoX + GROSOR : GROSOR, alto, largoZ > 0 ? largoZ + GROSOR : GROSOR);
    ayudante.updateMatrix();
    muros.setMatrixAt(i, ayudante.matrix);
  });
  muros.castShadow = true;
  muros.receiveShadow = true;
  raiz.add(muros);

  // El remate marino sobre cada muro: el canto que hace legible una maqueta de arquitectura.
  const remates = new InstancedMesh(cubo, mMarino, MUROS.length);
  MUROS.forEach(([x0, z0, x1, z1, alto], i) => {
    const largoX = Math.abs(x1 - x0);
    const largoZ = Math.abs(z1 - z0);
    ayudante.position.set((x0 + x1) / 2, alto + 0.015, (z0 + z1) / 2);
    ayudante.scale.set(largoX > 0 ? largoX + GROSOR : GROSOR, 0.03, largoZ > 0 ? largoZ + GROSOR : GROSOR);
    ayudante.updateMatrix();
    remates.setMatrixAt(i, ayudante.matrix);
  });
  raiz.add(remates);

  // ---- mobiliario

  // Recepción: el mostrador con su cubierta marino y un monitor.
  caja(mBlanco, 2.6, 0.76, 0.7, -6.4, 0.38, 1.9);
  caja(mMarino, 2.75, 0.06, 0.82, -6.4, 0.79, 1.9);
  caja(mMarino, 0.5, 0.34, 0.05, -6.9, 0.99, 1.75);
  // Entrada: el marco de la puerta en el muro izquierdo.
  caja(mMarino, 0.16, 1.3, 0.16, -9.2, 0.65, 2.6);
  caja(mMarino, 0.16, 1.3, 0.16, -9.2, 0.65, 4.0);
  caja(mAzul, 0.2, 0.18, 1.56, -9.2, 1.36, 3.3);

  // Sala de espera: sillas azules en dos filas y cuatro pacientes de ejemplo.
  const SILLAS: (readonly [number, number])[] = [];
  for (let f = 0; f < 2; f++) for (let c = 0; c < 5; c++) SILLAS.push([-3.4 + c, f ? 3.95 : 2.25]);
  const sillas = new InstancedMesh(cubo, mAzul, SILLAS.length);
  SILLAS.forEach(([x, z], i) => {
    ayudante.position.set(x, 0.2, z);
    ayudante.scale.set(0.62, 0.4, 0.55);
    ayudante.updateMatrix();
    sillas.setMatrixAt(i, ayudante.matrix);
  });
  sillas.castShadow = true;
  sillas.receiveShadow = true;
  raiz.add(sillas);

  const SENTADOS = [0, 2, 6, 9];
  const cuerpoPeon = registrar(new CapsuleGeometry(0.16, 0.34, 4, 12));
  const cabezaPeon = registrar(new SphereGeometry(0.15, 18, 12));
  const cuerpos = new InstancedMesh(cuerpoPeon, mPeones, SENTADOS.length);
  const cabezas = new InstancedMesh(cabezaPeon, mPeones, SENTADOS.length);
  SENTADOS.forEach((s, i) => {
    const [x, z] = SILLAS[s];
    ayudante.scale.set(1, 1, 1);
    ayudante.position.set(x, 0.72, z);
    ayudante.updateMatrix();
    cuerpos.setMatrixAt(i, ayudante.matrix);
    ayudante.position.set(x, 1.12, z);
    ayudante.updateMatrix();
    cabezas.setMatrixAt(i, ayudante.matrix);
  });
  cuerpos.castShadow = true;
  cabezas.castShadow = true;
  raiz.add(cuerpos, cabezas);

  // Medicina: camilla con almohada y un escritorio.
  caja(mBlanco, 1.7, 0.42, 0.72, -8.1, 0.21, -2.65);
  caja(mPlata, 0.42, 0.1, 0.6, -8.7, 0.47, -2.65);
  caja(mMarino, 0.9, 0.6, 0.5, -6.2, 0.3, -3.05);

  // Optometría: la carta de letras en el muro del fondo.
  const textura = registrar(cartaOptometria());
  const mCarta = mat({ roughness: 0.8, map: textura });
  caja(mCarta, 1.0, 1.2, 0.06, -3.7, 0.72, -3.48);
  const columna = registrar(new CylinderGeometry(0.06, 0.09, 0.9, 12));
  const foroptero = new Mesh(columna, mMarino);
  foroptero.position.set(-4.5, 0.45, -2.2);
  foroptero.castShadow = true;
  raiz.add(foroptero);
  caja(mMarino, 0.5, 0.16, 0.16, -4.5, 0.94, -2.2);

  // Audiometría: la cabina insonorizada, con su ventana.
  caja(mVerde, 1.3, 1.1, 1.2, 0.55, 0.55, -2.55);
  caja(mMarino, 0.05, 0.42, 0.5, -0.12, 0.72, -2.55, false);

  // Laboratorio: el mesón y los tubos con tapa de colores.
  caja(mBlanco, 3.1, 0.62, 0.62, 3.4, 0.31, -3.12);
  const tubo = registrar(new CylinderGeometry(0.055, 0.055, 0.32, 10));
  const tubos = new InstancedMesh(tubo, mInstancia, 7);
  const tonoTubo = [0, 1, 2, 0, 1, 0, 2];
  for (let i = 0; i < 7; i++) {
    ayudante.position.set(2.3 + i * 0.32, 0.79, -3.1);
    ayudante.scale.set(1, 1, 1);
    ayudante.updateMatrix();
    tubos.setMatrixAt(i, ayudante.matrix);
  }
  tubos.castShadow = true;
  raiz.add(tubos);

  // Rayos X: la mesa, el gantry y su base.
  caja(mBlanco, 2.1, 0.5, 0.8, 8.0, 0.25, -2.45);
  caja(mPlata, 0.42, 0.18, 1.7, GANTRY.x, 0.09, GANTRY.z);
  const anillo = registrar(new TorusGeometry(0.78, 0.17, 14, 48));
  const gantry = new Mesh(anillo, mGantry);
  gantry.position.copy(GANTRY);
  gantry.rotation.y = Math.PI / 2;
  gantry.castShadow = true;
  raiz.add(gantry);

  // Salida: un tapete azul junto al borde.
  caja(mAzul, 1.2, 0.02, 0.7, 7.4, 0.012, 4.0, false);

  // ---- la línea de piso que sigue al paciente (azul de OCUPA y verde de SALUD)

  const linea = new InstancedMesh(cubo, mInstancia, SEGMENTOS.length * 2);
  linea.receiveShadow = true;
  // Sus instancias se mueven cada cuadro: más barato no recortarla que recalcular su esfera.
  linea.frustumCulled = false;
  raiz.add(linea);

  // ---- el paciente: el isotipo de Ocupasalud

  const paciente = new Group();
  const base = new Mesh(registrar(new CylinderGeometry(0.3, 0.34, 0.08, 28)), mMarino);
  base.position.y = 0.04;
  const figura = new Mesh(registrar(new TorusGeometry(0.3, 0.075, 12, 40, Math.PI * 1.35)), mPlata);
  figura.position.y = 0.44;
  figura.rotation.z = -Math.PI * 1.175;
  const cabeza = new Mesh(registrar(new SphereGeometry(0.19, 28, 18)), mEsfera);
  cabeza.position.y = 0.88;
  for (const m of [base, figura, cabeza]) {
    m.castShadow = true;
    paciente.add(m);
  }
  paciente.scale.setScalar(1.12);
  raiz.add(paciente);

  // La carpeta del paciente, que flota encima. La hoja aparece cuando llega el PDF.
  const carpeta = new Group();
  const tapa = new Mesh(cubo, mMarino);
  tapa.scale.set(0.58, 0.05, 0.42);
  const pestana = new Mesh(cubo, mMarino);
  pestana.scale.set(0.2, 0.05, 0.08);
  pestana.position.set(-0.17, 0, -0.24);
  const hoja = new Mesh(cubo, mBlanco);
  hoja.scale.set(0.46, 0.02, 0.34);
  hoja.position.set(0.02, 0.045, 0.02);
  carpeta.add(tapa, pestana, hoja);
  carpeta.traverse((o) => (o.castShadow = true));
  raiz.add(carpeta);

  // El reloj de la encuesta: doce marcas de media hora alrededor del paciente.
  const marcas = new InstancedMesh(cubo, mInstancia, MARCAS_RELOJ);
  marcas.frustumCulled = false;
  raiz.add(marcas);

  // ---- la plataforma externa: una nube, la señal y el PDF

  const nube = new Group();
  const bola = registrar(new SphereGeometry(1, 22, 14));
  const BOLAS: readonly (readonly [number, number, number, number])[] = [
    [0, 0, 0, 0.72],
    [0.72, -0.12, 0.1, 0.55],
    [-0.72, -0.14, 0, 0.52],
    [0.3, 0.36, -0.1, 0.52],
    [-0.3, 0.3, 0.16, 0.46],
  ];
  for (const [x, y, z, r] of BOLAS) {
    const b = new Mesh(bola, mNube);
    b.position.set(x, y, z);
    b.scale.setScalar(r);
    nube.add(b);
  }
  nube.position.copy(NUBE);
  raiz.add(nube);

  const senalGeo = registrar(
    new BufferGeometry().setFromPoints([new Vector3(NUBE.x - 0.3, NUBE.y - 0.6, NUBE.z), GANTRY.clone().setY(1.9)]),
  );
  const mSenal = registrar(new LineDashedMaterial({ dashSize: 0.16, gapSize: 0.12, transparent: true }));
  const senal = new Line(senalGeo, mSenal);
  senal.computeLineDistances();
  raiz.add(senal);

  const pdf = new Group();
  const pdfHoja = new Mesh(cubo, mBlanco);
  pdfHoja.scale.set(0.44, 0.03, 0.56);
  const pdfBanda = new Mesh(cubo, mRojo);
  pdfBanda.scale.set(0.44, 0.034, 0.13);
  pdfBanda.position.z = -0.21;
  pdf.add(pdfHoja, pdfBanda);
  raiz.add(pdf);

  const ESTACION_RAYOS = RUTA.find(([p]) => p >= EVENTOS.pdf[0]) ?? RUTA[RUTA.length - 1];
  const vuelo = new QuadraticBezierCurve3(
    new Vector3(NUBE.x - 0.2, NUBE.y - 0.4, NUBE.z),
    new Vector3(5.6, 4.6, -1.4),
    new Vector3(ESTACION_RAYOS[1], ALTO_CARPETA * 1.12 + 0.08, ESTACION_RAYOS[2]),
  );

  // ---- colores

  const colorBaseSala: Color[] = SALAS.map(() => new Color());
  const colorActivoSala: Color[] = SALAS.map(() => new Color());
  const mezclaSala = SALAS.map(() => 0);
  const cAzul = new Color();
  const cVerde = new Color();
  const cApagado = new Color();
  const cTmp = new Color();
  const cBlanco = new Color(0xffffff);

  function aplicarColores(): void {
    paleta = op.colores();
    cAzul.set(paleta.azul);
    cVerde.set(paleta.verde);
    cApagado.set(paleta.piso).lerp(cAzul, 0.18);
    mLosa.color.set(paleta.base);
    mMuro.color.set(paleta.muro);
    mMarino.color.set(paleta.marino);
    mAzul.color.set(paleta.azul);
    mVerde.color.set(paleta.verde);
    mBlanco.color.set(0xffffff);
    mPlata.color.set(paleta.plata2);
    mEsfera.color.set(paleta.esfera);
    mEsfera.emissive.set(paleta.esfera);
    mEsfera.emissiveIntensity = 0.12;
    mPeones.color.set(paleta.plata);
    mRojo.color.set(paleta.rojo);
    mGantry.color.set(0xffffff);
    mGantry.emissive.set(paleta.rayos);
    mNube.color.set(0xffffff);
    mNube.emissive.set(paleta.rayos);
    mNube.emissiveIntensity = 0.08;
    mInstancia.color.set(0xffffff);
    mSenal.color.set(paleta.rayos);
    SALAS.forEach((s, i) => {
      const tono = s.tono === 'azul' ? paleta.azul : s.tono === 'verde' ? paleta.verde : paleta.rayos;
      cTmp.set(tono);
      colorBaseSala[i].set(paleta.piso).lerp(cTmp, 0.16);
      colorActivoSala[i].set(paleta.piso).lerp(cTmp, 0.55);
      mSalas[i].color.copy(colorBaseSala[i]).lerp(colorActivoSala[i], mezclaSala[i]);
    });
    for (let i = 0; i < SEGMENTOS.length; i++) {
      linea.setColorAt(i * 2, cAzul);
      linea.setColorAt(i * 2 + 1, cVerde);
    }
    if (linea.instanceColor) linea.instanceColor.needsUpdate = true;
    const tonos = [cAzul, cVerde, cTmp.set(paleta.rojo)];
    for (let i = 0; i < 7; i++) tubos.setColorAt(i, tonos[tonoTubo[i]]);
    if (tubos.instanceColor) tubos.instanceColor.needsUpdate = true;
    relojPintado = -1;
  }

  // ---- estado

  let pObjetivo = 0;
  let pActual = 0;
  let incXObjetivo = 0;
  let incYObjetivo = 0;
  let incX = 0;
  let incY = 0;
  let fraccion = 0;
  let tiempo = 0;
  let ultimo = 0;
  let idBucle = 0;
  let idDibujo = 0;
  let destruido = false;
  let enVista = false;
  let pestanaVisible = document.visibilityState !== 'hidden';
  let anchoCss = 1;
  let altoCss = 1;
  let relojPintado = -1;
  let rumbo = 0;
  let mitadAlto = 6;
  let zoomBase = 1;
  let seguir = 0.2;

  const centroVista = new Vector3();
  const objetivo = new Vector3();
  const tmp = new Vector3();
  const tmpProy = new Vector3();
  const derecha = new Vector3();
  const arriba = new Vector3();
  const posPaciente = new Vector3();
  const giro = new Quaternion();
  const ejeY = new Vector3(0, 1, 0);
  const escalaTmp = new Vector3();
  const matriz = new Matrix4();

  const anclas = {} as Record<AnclaSede, PosicionAncla>;
  const ordenAnclas = Object.keys(VENTANAS) as AnclaSede[];
  for (const id of ordenAnclas) anclas[id] = { x: 0, y: 0, visible: false };

  // ---- encuadre

  function encuadrar(): void {
    const aspecto = anchoCss / altoCss;
    camara.position.copy(CENTRO).addScaledVector(DIRECCION_CAMARA, DISTANCIA_CAMARA);
    camara.lookAt(CENTRO);
    camara.updateMatrixWorld();
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [x, y, z] of ESQUINAS) {
      tmp.set(x, y, z).applyMatrix4(camara.matrixWorldInverse);
      minX = Math.min(minX, tmp.x);
      maxX = Math.max(maxX, tmp.x);
      minY = Math.min(minY, tmp.y);
      maxY = Math.max(maxY, tmp.y);
    }
    derecha.set(1, 0, 0).applyQuaternion(camara.quaternion);
    arriba.set(0, 1, 0).applyQuaternion(camara.quaternion);
    centroVista
      .copy(CENTRO)
      .addScaledVector(derecha, (minX + maxX) / 2)
      .addScaledVector(arriba, (minY + maxY) / 2);
    const mitadAnchoContenido = ((maxX - minX) / 2) * 1.05;
    const mitadAltoContenido = ((maxY - minY) / 2) * 1.06;
    const util = 1 - fraccion;
    mitadAlto = Math.max(mitadAltoContenido, mitadAnchoContenido / (util * aspecto));

    // En pantallas angostas la maqueta entera queda diminuta: la cámara se acerca y sigue al paciente.
    if (aspecto * util < 1) {
      zoomBase = 1.9;
      seguir = 0.85;
    } else if (aspecto * util < 1.25) {
      zoomBase = 1.3;
      seguir = 0.5;
    } else {
      zoomBase = 1;
      seguir = 0.1;
    }
    const mitadAncho = mitadAlto * aspecto;
    camara.left = -mitadAncho * (1 + fraccion);
    camara.right = mitadAncho * (1 - fraccion);
    camara.top = mitadAlto;
    camara.bottom = -mitadAlto;
  }

  // ---- un cuadro

  function posicionEnRuta(p: number, destino: Vector3): number {
    let i = 1;
    while (i < RUTA.length - 1 && p > RUTA[i][0]) i++;
    // Índices y no desestructuración: corre en cada cuadro y no debe crear iteradores.
    const a = RUTA[i - 1];
    const b = RUTA[i];
    const ax = a[1];
    const az = a[2];
    const bx = b[1];
    const bz = b[2];
    const t = suave(tramo(p, a[0], b[0]));
    destino.set(ax + (bx - ax) * t, 0, az + (bz - az) * t);
    const moviendo = Math.hypot(bx - ax, bz - az) > 1e-3 && t > 0 && t < 1;
    if (moviendo) rumbo = Math.atan2(bx - ax, bz - az);
    return moviendo ? t : -1;
  }

  function actualizar(dt: number): void {
    // El scrub del anfitrión ya suaviza el progreso: aquí se toma tal cual, y así las etiquetas
    // del DOM y la maqueta nunca se desfasan.
    pActual = pObjetivo;
    incX += (incXObjetivo - incX) * (reducido ? 1 : 1 - Math.exp(-dt * 4));
    incY += (incYObjetivo - incY) * (reducido ? 1 : 1 - Math.exp(-dt * 4));
    const p = pActual;

    // El paciente camina: un saltito mientras se mueve.
    const t = posicionEnRuta(p, posPaciente);
    const salto = t >= 0 && !reducido ? Math.abs(Math.sin(t * Math.PI * 6)) * 0.07 : 0;
    paciente.position.set(posPaciente.x, salto, posPaciente.z);
    // El isotipo mira casi siempre a la cámara, para que se lea como el logo; gira un poco al caminar.
    paciente.rotation.y = 0.37 + Math.sin(rumbo) * 0.35;
    paciente.visible = p > 0.005;

    // La carpeta flota encima; la hoja aparece cuando el PDF llega.
    const flota = reducido ? 0 : Math.sin(tiempo * 2.2) * 0.04;
    carpeta.position.set(posPaciente.x, ALTO_CARPETA * 1.12 + flota + salto, posPaciente.z);
    carpeta.rotation.y = reducido ? 0.3 : 0.3 + Math.sin(tiempo * 0.9) * 0.15;
    const llegada = tramo(p, EVENTOS.pdf[1] - 0.005, EVENTOS.pdf[1] + 0.01);
    hoja.visible = llegada > 0;
    const brillo = campana(p, EVENTOS.pdf[1], EVENTOS.pdf[1] + 0.04, 0.01);
    tapa.scale.set(0.58 + brillo * 0.08, 0.05, 0.42 + brillo * 0.06);
    carpeta.visible = paciente.visible;

    // La línea de piso, hasta donde va el paciente.
    for (let i = 0; i < SEGMENTOS.length; i++) {
      const s = SEGMENTOS[i];
      const f = suave(tramo(p, s.pa, s.pb));
      // Un tramo que no ha empezado no se ve: ni siquiera su punta.
      const visible = f > 0;
      giro.setFromAxisAngle(ejeY, s.angulo);
      for (let lado = 0; lado < 2; lado++) {
        const desfase = lado ? 0.09 : -0.09;
        tmp.set(
          s.ax + (s.bx - s.ax) * (f / 2) + s.nx * desfase,
          0.012,
          s.az + (s.bz - s.az) * (f / 2) + s.nz * desfase,
        );
        if (visible) escalaTmp.set(s.largo * f + 0.07, 0.016, 0.07);
        else escalaTmp.set(1e-4, 1e-4, 1e-4);
        matriz.compose(tmp, giro, escalaTmp);
        linea.setMatrixAt(i * 2 + lado, matriz);
      }
    }
    linea.instanceMatrix.needsUpdate = true;

    // El reloj: doce medias horas que se encienden de recepción a la salida.
    const horas = tramo(p, RELOJ.desde, RELOJ.hasta) * RELOJ.horas;
    const encendidas = Math.floor(horas * 2 + 1e-6);
    const aparece = suave(tramo(p, RELOJ.desde - 0.02, RELOJ.desde + 0.01));
    const completo = p >= RELOJ.hasta;
    const pulso = completo && !reducido ? 1 + Math.sin(tiempo * 5) * 0.08 : 1;
    for (let i = 0; i < MARCAS_RELOJ; i++) {
      // La primera marca va arriba (las 12) y siguen en el sentido del reloj, visto desde la cámara.
      const a = Math.PI - (i / MARCAS_RELOJ) * Math.PI * 2;
      tmp.set(
        posPaciente.x + Math.sin(a) * RADIO_RELOJ * pulso,
        0.03,
        posPaciente.z + Math.cos(a) * RADIO_RELOJ * pulso,
      );
      giro.setFromAxisAngle(ejeY, a);
      escalaTmp.set(0.11 * aparece + 1e-4, 0.04, 0.28 * aparece + 1e-4);
      matriz.compose(tmp, giro, escalaTmp);
      marcas.setMatrixAt(i, matriz);
    }
    marcas.instanceMatrix.needsUpdate = true;
    if (encendidas !== relojPintado) {
      relojPintado = encendidas;
      for (let i = 0; i < MARCAS_RELOJ; i++) {
        marcas.setColorAt(i, i < encendidas ? (i % 2 ? cVerde : cAzul) : cApagado);
      }
      if (marcas.instanceColor) marcas.instanceColor.needsUpdate = true;
    }

    // Las salas: la que tiene al paciente se ilumina.
    const sala = salaActual(p);
    for (let i = 0; i < SALAS.length; i++) {
      const meta = SALAS[i].id === sala ? 1 : 0;
      mezclaSala[i] += (meta - mezclaSala[i]) * (reducido ? 1 : 1 - Math.exp(-dt * 5));
      mSalas[i].color.copy(colorBaseSala[i]).lerp(colorActivoSala[i], mezclaSala[i]);
    }

    // Rayos X: el gantry se enciende mientras se toma y se firma el estudio.
    const rayos = campana(p, 0.685, 0.8, 0.02);
    mGantry.emissiveIntensity = rayos * (reducido ? 0.6 : 0.45 + Math.sin(tiempo * 4) * 0.15);
    gantry.rotation.x = reducido ? 0 : tiempo * 0.6 * rayos;

    // La nube de la plataforma externa, su señal y el PDF que vuela a la carpeta.
    const vNube = suave(campana(p, EVENTOS.nube[0], EVENTOS.nube[1], 0.04));
    nube.visible = vNube > 0.001;
    nube.scale.setScalar(0.6 + vNube * 0.4);
    nube.position.set(NUBE.x, NUBE.y + (reducido ? 0 : Math.sin(tiempo * 0.8) * 0.08), NUBE.z);
    mNube.opacity = 0.96 * vNube;
    senal.visible = campana(p, EVENTOS.firmado - 0.02, EVENTOS.pdf[1], 0.015) > 0.01;

    const tVuelo = tramo(p, EVENTOS.pdf[0], EVENTOS.pdf[1]);
    pdf.visible = tVuelo > 0 && tVuelo < 1;
    if (pdf.visible) {
      vuelo.getPoint(suave(tVuelo), pdf.position);
      pdf.rotation.set(0.5 - tVuelo * 0.5, tVuelo * Math.PI * 1.5, 0.3 * (1 - tVuelo));
      pdf.scale.setScalar(0.7 + Math.sin(tVuelo * Math.PI) * 0.5);
    }

    // Inclinación: la maqueta gira un poco con el mouse o el celular.
    raiz.rotation.y = incX * 0.07;
    raiz.rotation.x = incY * 0.025;

    // Cámara: mira la sede entera y se corre hacia el paciente según el ancho disponible.
    objetivo.copy(centroVista).lerp(tmp.set(posPaciente.x, 0.6, posPaciente.z), seguir);
    camara.position.copy(objetivo).addScaledVector(DIRECCION_CAMARA, DISTANCIA_CAMARA);
    camara.lookAt(objetivo);
    camara.zoom = zoomBase * (1 + 0.04 * rayos);
    camara.updateProjectionMatrix();
  }

  function posicionar(): void {
    camara.updateMatrixWorld();
    raiz.updateMatrixWorld();
    const p = pActual;
    for (let k = 0; k < ordenAnclas.length; k++) {
      const id = ordenAnclas[k];
      const ancla = anclas[id];
      switch (id) {
        case 'turno':
          tmpProy.set(posPaciente.x, ALTO_CARPETA * 1.12 + 0.42, posPaciente.z);
          break;
        case 'reloj':
          tmpProy.set(posPaciente.x, 0, posPaciente.z + RADIO_RELOJ + 0.5);
          break;
        case 'externa':
          tmpProy.set(NUBE.x, NUBE.y + 1.05, NUBE.z);
          break;
        case 'firmado':
          vuelo.getPoint(0.42, tmpProy);
          tmpProy.y += 0.4;
          break;
        case 'encuesta': {
          // La burbuja sube desde la carpeta mientras aparece.
          const sube = suave(tramo(p, EVENTOS.burbuja[0], EVENTOS.burbuja[1]));
          tmpProy.set(posPaciente.x, ALTO_CARPETA * 1.12 + 0.3 + sube * 0.7, posPaciente.z);
          break;
        }
        default: {
          const l = LETREROS[id];
          tmpProy.set(l[0], l[1], l[2]);
        }
      }
      tmpProy.applyMatrix4(raiz.matrixWorld).project(camara);
      const ventana = VENTANAS[id];
      const desde = ventana[0];
      const hasta = ventana[1];
      ancla.x = (tmpProy.x * 0.5 + 0.5) * anchoCss;
      ancla.y = (-tmpProy.y * 0.5 + 0.5) * altoCss;
      const margenIzquierdo = anchoCss * fraccion;
      ancla.visible =
        p >= desde &&
        p <= hasta &&
        ancla.x > margenIzquierdo + 8 &&
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
      // Con movimiento reducido la maqueta no sigue al mouse ni al celular: queda quieta.
      if (destruido || reducido) return;
      incXObjetivo = limitar(Number.isFinite(x) ? x : 0, -1, 1);
      incYObjetivo = limitar(Number.isFinite(y) ? y : 0, -1, 1);
    },

    encuadre(f: number): void {
      if (destruido) return;
      fraccion = limitar(Number.isFinite(f) ? f : 0, 0, 0.5);
      encuadrar();
      solicitarDibujo();
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
      escena.traverse((o) => {
        if (o instanceof InstancedMesh) o.dispose();
      });
      for (const d of desechables) d.dispose();
      desechables.length = 0;
      // El mapa de sombras del sol es un render target propio: no lo suelta renderer.dispose().
      sol.dispose();
      escena.clear();
      renderer.dispose();
      // Suelta el contexto WebGL ya: el navegador admite pocos a la vez y se navega entre mundos.
      renderer.forceContextLoss();
    },
  };
}

// ---------------------------------------------------------------- piezas

/** La carta de optometría: letras que se achican, en marino sobre blanco. */
function cartaOptometria(): CanvasTexture {
  const lado = 256;
  const lienzo = document.createElement('canvas');
  lienzo.width = lado;
  lienzo.height = Math.round(lado * 1.2);
  const ctx = lienzo.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    ctx.fillStyle = '#133b5c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const filas = ['E', 'F P', 'T O Z', 'L P E D', 'P E C F D'];
    let y = 40;
    filas.forEach((fila, i) => {
      const tam = 64 - i * 11;
      ctx.font = `700 ${tam}px Arial, sans-serif`;
      ctx.fillText(fila, lado / 2, y);
      y += tam + 14;
    });
  }
  const textura = new CanvasTexture(lienzo);
  textura.colorSpace = SRGBColorSpace;
  return textura;
}
