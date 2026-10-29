/**
 * "La escalada": la experiencia firma del mundo Prevent.
 *
 * Un andamio de cuatro cuerpos. Cada travesaño es un documento requerido del curso de ejemplo:
 * con el progreso (lo maneja el scroll desde el anfitrión) el personaje dorado de la marca sube
 * por la escalera, el documento de su travesaño pasa de pendiente a cargado y a válido, y al
 * validarse la línea de vida se engancha a su punto de anclaje con un mosquetón. Arriba se
 * despliega un certificado de ejemplo con datos ficticios. La inclinación del celular (o el
 * mouse) balancea el andamio y el arnés lo compensa.
 *
 * Independiente de Angular: el anfitrión lo carga con import() solo en el navegador.
 * Cero asignaciones por cuadro; en movimiento reducido dibuja un cuadro a demanda.
 */
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  RingGeometry,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Texture,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three';
import {
  CERTIFICADO,
  CUMBRE,
  NIVELES,
  SUELO,
  alturaEscalador,
  estadoDocumento,
  limitar,
  tramo,
  type EstadoDocumento,
} from './fases';

// ---------------------------------------------------------------- contrato

export type AnclaAndamio = 'nivel0' | 'nivel1' | 'nivel2' | 'nivel3' | 'cumbre';

export interface PosicionAncla {
  x: number;
  y: number;
  visible: boolean;
}

export interface ColoresAndamio {
  oro: string;
  oroClaro: string;
  ambar: string;
  marron: string;
  amarillo: string;
  verde: string;
  gris: string;
  fondo: string;
  superficie: string;
  linea: string;
  crema: string;
}

export interface OpcionesAndamio {
  lienzo: HTMLCanvasElement;
  reducido: boolean;
  colores: () => ColoresAndamio;
  /** Ruta del personaje dorado de la marca (PNG o WebP con transparencia). */
  personaje: string;
  /** Px CSS relativos al lienzo. El objeto se reutiliza entre cuadros: léelo en el momento. */
  alPosicionar?: (pos: Readonly<Record<AnclaAndamio, PosicionAncla>>) => void;
}

export interface EscenaAndamio {
  /** 0..1: el recorrido completo, del suelo a la cumbre. */
  progreso(p: number): void;
  /** -1..1, de Orientacion: balancea el andamio. */
  inclinar(x: number, y: number): void;
  /** El texto del lienzo usa Poppins: el anfitrión avisa cuando cargó. */
  redibujarTextos(): void;
  destruir(): void;
}

// ---------------------------------------------------------------- composición

const FOV = 38;
/** Medidas del andamio, en metros de maqueta. */
const ANCHO = 2.2;
const FONDO = 1.4;
const ALTO_CUERPO = 1.55;
const ALTO_TOTAL = ALTO_CUERPO * NIVELES;
const BARANDA = 1.0;
const RADIO_TUBO = 0.035;
const X_ESCALERA = -0.42;
const Z_FRENTE = FONDO / 2;
const X_LINEA = ANCHO / 2 + 0.32;
const Z_LINEA = Z_FRENTE + 0.18;
const ALTO_PERSONAJE = 1.15;
const ALTO_LINEA = ALTO_TOTAL + BARANDA + 0.15;

const ORDEN_ANCLAS: readonly AnclaAndamio[] = ['nivel0', 'nivel1', 'nivel2', 'nivel3', 'cumbre'];

const suave = (t: number) => t * t * (3 - 2 * t);

// ---------------------------------------------------------------- escena

export function crearAndamio(op: OpcionesAndamio): EscenaAndamio {
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

  const cielo = new HemisphereLight(0xfff4dc, 0x2a1a0c, Math.PI * 0.8);
  escena.add(cielo);
  const sol = new DirectionalLight(0xffe7b0, Math.PI * 0.95);
  sol.position.set(4, 10, 6);
  escena.add(sol);
  const contraluz = new DirectionalLight(0xc09230, Math.PI * 0.35);
  contraluz.position.set(-6, 4, -5);
  escena.add(contraluz);

  // ---- materiales
  const acero = registrar(new MeshStandardMaterial({ color: 0x8c8275, roughness: 0.48, metalness: 0.35 }));
  const tablon = registrar(new MeshStandardMaterial({ color: 0x5a3c1c, roughness: 0.82, metalness: 0 }));
  const oro = registrar(
    new MeshStandardMaterial({ color: paleta.oro, roughness: 0.3, metalness: 0.55, emissive: paleta.marron, emissiveIntensity: 0.25 }),
  );
  const cuerdaGris = registrar(new MeshStandardMaterial({ color: 0x5b5146, roughness: 0.9 }));
  const sueloMat = registrar(new MeshStandardMaterial({ color: paleta.superficie, roughness: 1 }));
  const anilloMat = registrar(
    new MeshBasicMaterial({ color: paleta.oro, transparent: true, opacity: 0.22, side: DoubleSide, depthWrite: false }),
  );

  // ---- geometrías compartidas
  const cilindro = registrar(new CylinderGeometry(1, 1, 1, 10, 1, false));
  const esfera = registrar(new SphereGeometry(1, 12, 8));

  // ---- el suelo: una placa y los anillos de replanteo
  const suelo = new Mesh(registrar(new CircleGeometry(5.5, 48)), sueloMat);
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = -0.02;
  raiz.add(suelo);
  for (let i = 1; i <= 3; i++) {
    const anillo = new Mesh(registrar(new RingGeometry(i * 1.5 - 0.012, i * 1.5 + 0.012, 64)), anilloMat);
    anillo.rotation.x = -Math.PI / 2;
    raiz.add(anillo);
  }

  // ---- el andamio: todos los tubos en una sola malla instanciada
  const tubos: Array<[Vector3, Vector3, number]> = [];
  const tubo = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, r = RADIO_TUBO) =>
    tubos.push([new Vector3(ax, ay, az), new Vector3(bx, by, bz), r]);

  const xs = [-ANCHO / 2, ANCHO / 2];
  const zs = [-FONDO / 2, FONDO / 2];
  // Parales
  for (const x of xs) for (const z of zs) tubo(x, 0, z, x, ALTO_TOTAL + BARANDA, z, RADIO_TUBO * 1.25);
  // Largueros y travesaños de cada cuerpo, más la baranda de arriba
  for (let n = 0; n <= NIVELES; n++) {
    const y = n * ALTO_CUERPO;
    tubo(-ANCHO / 2, y, -FONDO / 2, ANCHO / 2, y, -FONDO / 2);
    tubo(-ANCHO / 2, y, FONDO / 2, ANCHO / 2, y, FONDO / 2);
    tubo(-ANCHO / 2, y, -FONDO / 2, -ANCHO / 2, y, FONDO / 2);
    tubo(ANCHO / 2, y, -FONDO / 2, ANCHO / 2, y, FONDO / 2);
  }
  const yb = ALTO_TOTAL + BARANDA;
  tubo(-ANCHO / 2, yb, -FONDO / 2, ANCHO / 2, yb, -FONDO / 2);
  tubo(-ANCHO / 2, yb, FONDO / 2, ANCHO / 2, yb, FONDO / 2);
  tubo(-ANCHO / 2, yb, -FONDO / 2, -ANCHO / 2, yb, FONDO / 2);
  tubo(ANCHO / 2, yb, -FONDO / 2, ANCHO / 2, yb, FONDO / 2);
  // Crucetas: atrás y a los lados, alternando la diagonal en cada cuerpo
  for (let n = 0; n < NIVELES; n++) {
    const a = n * ALTO_CUERPO;
    const b = a + ALTO_CUERPO;
    const par = n % 2 === 0;
    tubo(par ? -ANCHO / 2 : ANCHO / 2, a, -FONDO / 2, par ? ANCHO / 2 : -ANCHO / 2, b, -FONDO / 2, RADIO_TUBO * 0.8);
    tubo(-ANCHO / 2, a, par ? -FONDO / 2 : FONDO / 2, -ANCHO / 2, b, par ? FONDO / 2 : -FONDO / 2, RADIO_TUBO * 0.8);
    tubo(ANCHO / 2, a, par ? FONDO / 2 : -FONDO / 2, ANCHO / 2, b, par ? -FONDO / 2 : FONDO / 2, RADIO_TUBO * 0.8);
  }
  // La escalera del frente: dos rieles y sus peldaños
  const zEsc = Z_FRENTE + 0.06;
  tubo(X_ESCALERA - 0.22, 0, zEsc, X_ESCALERA - 0.22, ALTO_TOTAL + 0.6, zEsc, RADIO_TUBO * 0.8);
  tubo(X_ESCALERA + 0.22, 0, zEsc, X_ESCALERA + 0.22, ALTO_TOTAL + 0.6, zEsc, RADIO_TUBO * 0.8);
  for (let y = 0.3; y < ALTO_TOTAL + 0.5; y += 0.32) {
    tubo(X_ESCALERA - 0.22, y, zEsc, X_ESCALERA + 0.22, y, zEsc, RADIO_TUBO * 0.6);
  }

  // El brazo que sostiene el anclaje de la línea de vida
  tubo(ANCHO / 2, ALTO_LINEA, Z_FRENTE, X_LINEA, ALTO_LINEA, Z_LINEA);

  const mallaTubos = new InstancedMesh(cilindro, acero, tubos.length);
  const m4 = new Matrix4();
  const q = new Quaternion();
  const arriba = new Vector3(0, 1, 0);
  const tmpA = new Vector3();
  const tmpB = new Vector3();
  const tmpEscala = new Vector3();
  tubos.forEach(([a, b, r], i) => {
    tmpA.subVectors(b, a);
    const largo = tmpA.length();
    q.setFromUnitVectors(arriba, tmpA.normalize());
    tmpB.addVectors(a, b).multiplyScalar(0.5);
    tmpEscala.set(r, largo, r);
    m4.compose(tmpB, q, tmpEscala);
    mallaTubos.setMatrixAt(i, m4);
  });
  mallaTubos.instanceMatrix.needsUpdate = true;
  raiz.add(mallaTubos);

  // Abrazaderas en los cruces de parales y largueros
  const abrazaderas = new InstancedMesh(esfera, acero, 4 * (NIVELES + 2));
  {
    let k = 0;
    const ys: number[] = [];
    for (let n = 0; n <= NIVELES; n++) ys.push(n * ALTO_CUERPO);
    ys.push(yb);
    for (const y of ys)
      for (const x of xs)
        for (const z of zs) {
          tmpEscala.setScalar(0.07);
          tmpB.set(x, y, z);
          m4.compose(tmpB, q.identity(), tmpEscala);
          abrazaderas.setMatrixAt(k++, m4);
        }
    abrazaderas.instanceMatrix.needsUpdate = true;
  }
  raiz.add(abrazaderas);

  // Plataformas: un tablón por cuerpo
  const geoTablon = registrar(new BoxGeometry(ANCHO - 0.1, 0.07, FONDO - 0.1));
  const tablones = new InstancedMesh(geoTablon, tablon, NIVELES);
  for (let n = 1; n <= NIVELES; n++) {
    tmpB.set(0, n * ALTO_CUERPO + 0.04, 0);
    tmpEscala.set(1, 1, 1);
    m4.compose(tmpB, q.identity(), tmpEscala);
    tablones.setMatrixAt(n - 1, m4);
  }
  tablones.instanceMatrix.needsUpdate = true;
  raiz.add(tablones);

  // ---- los documentos de cada travesaño
  interface Travesano {
    hoja: Mesh;
    material: MeshStandardMaterial;
    sello: Mesh;
    selloMat: MeshBasicMaterial;
    anclaje: Mesh;
    mosqueton: Mesh;
    eslinga: Mesh;
    chispas: Points;
    chispasMat: PointsMaterial;
    estado: EstadoDocumento;
    /** Segundos desde que quedó válido (para la chispa). */
    desde: number;
    y: number;
  }
  const geoHoja = registrar(new BoxGeometry(0.46, 0.62, 0.02));
  // El papel: renglones y un encabezado, teñidos por el color del estado.
  const papel = registrar(texturaPapel());
  const geoSello = registrar(new CylinderGeometry(0.1, 0.1, 0.012, 24));
  const geoAnclaje = registrar(new TorusGeometry(0.07, 0.018, 8, 20));
  const geoMosqueton = registrar(new TorusGeometry(0.1, 0.02, 8, 24));

  const geoChispas = registrar(new BufferGeometry());
  {
    const n = 26;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + (i % 3) * 0.4;
      const rad = 0.5 + (i % 5) * 0.12;
      pos[i * 3] = Math.cos(ang) * rad;
      pos[i * 3 + 1] = Math.sin(ang) * rad * 0.8;
      pos[i * 3 + 2] = ((i % 4) - 1.5) * 0.08;
    }
    geoChispas.setAttribute('position', new Float32BufferAttribute(pos, 3));
  }

  const travesanos: Travesano[] = [];
  for (let i = 0; i < NIVELES; i++) {
    const y = (i + 1) * ALTO_CUERPO;
    const material = registrar(
      new MeshStandardMaterial({ color: 0x3a2c1b, map: papel, roughness: 0.7, emissive: 0x000000 }),
    );
    const hoja = new Mesh(geoHoja, material);
    hoja.position.set(0.42, y + 0.42, Z_FRENTE + 0.04);
    hoja.rotation.x = -0.12;
    raiz.add(hoja);

    const selloMat = registrar(new MeshBasicMaterial({ color: paleta.verde }));
    const sello = new Mesh(geoSello, selloMat);
    sello.rotation.x = Math.PI / 2 - 0.12;
    sello.position.set(0.56, y + 0.26, Z_FRENTE + 0.07);
    sello.scale.setScalar(0.001);
    raiz.add(sello);

    const anclaje = new Mesh(geoAnclaje, oro);
    anclaje.position.set(ANCHO / 2 + 0.08, y + 0.75, Z_FRENTE);
    anclaje.rotation.y = Math.PI / 2;
    raiz.add(anclaje);

    const mosqueton = new Mesh(geoMosqueton, oro);
    mosqueton.scale.set(0.7, 1.15, 1);
    mosqueton.position.set(ANCHO / 2 + 0.18, y + 0.75, Z_FRENTE + 0.08);
    raiz.add(mosqueton);

    const eslinga = new Mesh(cilindro, oro);
    eslinga.rotation.z = Math.PI / 2;
    eslinga.position.set((ANCHO / 2 + 0.18 + X_LINEA) / 2, y + 0.75, Z_LINEA - 0.05);
    eslinga.scale.set(0.012, 0.001, 0.012);
    raiz.add(eslinga);

    const chispasMat = registrar(
      new PointsMaterial({
        color: paleta.amarillo,
        size: 0.09,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    );
    const chispas = new Points(geoChispas, chispasMat);
    chispas.position.set(ANCHO / 2 + 0.18, y + 0.75, Z_FRENTE + 0.1);
    chispas.visible = false;
    raiz.add(chispas);

    travesanos.push({ hoja, material, sello, selloMat, anclaje, mosqueton, eslinga, chispas, chispasMat, estado: 'pendiente', desde: 99, y });
  }

  // ---- la línea de vida: gris en reposo, dorada hasta el último anclaje enganchado
  const lineaGris = new Mesh(cilindro, cuerdaGris);
  lineaGris.scale.set(0.022, ALTO_LINEA, 0.022);
  lineaGris.position.set(X_LINEA, ALTO_LINEA / 2, Z_LINEA);
  raiz.add(lineaGris);
  const lineaOro = new Mesh(cilindro, oro);
  lineaOro.scale.set(0.03, 0.001, 0.03);
  lineaOro.position.set(X_LINEA, 0, Z_LINEA);
  raiz.add(lineaOro);
  // El punto de anclaje de arriba, de donde cuelga la línea
  const anclaCumbre = new Mesh(geoMosqueton, oro);
  anclaCumbre.position.set(X_LINEA, ALTO_LINEA, Z_LINEA);
  anclaCumbre.rotation.y = Math.PI / 2;
  raiz.add(anclaCumbre);

  // ---- el personaje: el isotipo dorado de Prevent, con casco
  const personajeMat = registrar(new SpriteMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  const personaje = new Sprite(personajeMat);
  personaje.center.set(0.5, 0);
  personaje.scale.set(ALTO_PERSONAJE * (581 / 760), ALTO_PERSONAJE, 1);
  personaje.position.set(X_ESCALERA, 0, zEsc + 0.25);
  raiz.add(personaje);

  const halo = new Sprite(
    registrar(
      new SpriteMaterial({
        map: registrar(texturaHalo()),
        color: paleta.oro,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    ),
  );
  halo.scale.set(5.2, 5.2, 1);
  raiz.add(halo);

  // ---- el certificado de ejemplo de la cumbre
  const lienzoCert = document.createElement('canvas');
  lienzoCert.width = 1024;
  lienzoCert.height = 720;
  const texturaCert = registrar(new CanvasTexture(lienzoCert));
  texturaCert.colorSpace = SRGBColorSpace;
  texturaCert.anisotropy = 4;
  const certificado = new Mesh(
    registrar(new PlaneGeometry(2.3, 2.3 * (720 / 1024))),
    registrar(new MeshBasicMaterial({ map: texturaCert, transparent: true, side: DoubleSide })),
  );
  const Y_CERT = ALTO_TOTAL + BARANDA + 1.35;
  certificado.position.set(-0.25, Y_CERT, 0.35);
  certificado.scale.set(1, 0.001, 1);
  certificado.visible = false;
  raiz.add(certificado);
  halo.position.set(-0.25, Y_CERT, 0.1);

  function pintarCertificado(): void {
    const ctx = lienzoCert.getContext('2d');
    if (!ctx) return;
    const w = lienzoCert.width;
    const h = lienzoCert.height;
    const c = paleta;
    ctx.clearRect(0, 0, w, h);
    redondeado(ctx, 8, 8, w - 16, h - 16, 26);
    ctx.fillStyle = '#fbf4e6';
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = c.oro;
    ctx.stroke();
    redondeado(ctx, 30, 30, w - 60, h - 60, 16);
    ctx.lineWidth = 2;
    ctx.strokeStyle = c.marron;
    ctx.stroke();

    // La franja del degradado de la marca
    const g = ctx.createLinearGradient(60, 0, w - 60, 0);
    g.addColorStop(0, '#f1df14');
    g.addColorStop(0.3, '#ffef42');
    g.addColorStop(0.62, '#e9b036');
    g.addColorStop(1, '#818329');
    ctx.fillStyle = g;
    ctx.fillRect(60, 64, w - 120, 12);

    ctx.textAlign = 'center';
    ctx.fillStyle = c.marron;
    ctx.font = '600 30px Poppins, "Segoe UI", sans-serif';
    ctx.fillText('Certificado de ejemplo', w / 2, 140);
    ctx.fillStyle = '#1d150d';
    ctx.font = '700 58px Poppins, "Segoe UI", sans-serif';
    ctx.fillText('Trabajador de ejemplo', w / 2, 232);
    ctx.font = '400 28px Poppins, "Segoe UI", sans-serif';
    ctx.fillStyle = '#3a2c1b';
    ctx.fillText('Trabajo seguro en alturas', w / 2, 300);
    ctx.font = '600 36px Poppins, "Segoe UI", sans-serif';
    ctx.fillStyle = c.marron;
    ctx.fillText('Reentrenamiento sectorial', w / 2, 352);

    // Las firmas: entrenador y supervisor, como guarda el modelo del certificado
    ctx.strokeStyle = '#3a2c1b';
    ctx.lineWidth = 2;
    for (const x of [w * 0.3, w * 0.7]) {
      ctx.beginPath();
      ctx.moveTo(x - 150, 520);
      ctx.lineTo(x + 150, 520);
      ctx.stroke();
    }
    ctx.font = '400 24px Poppins, "Segoe UI", sans-serif';
    ctx.fillStyle = '#3a2c1b';
    ctx.fillText('Entrenador', w * 0.3, 556);
    ctx.fillText('Supervisor', w * 0.7, 556);
    ctx.font = '600 22px Poppins, "Segoe UI", sans-serif';
    ctx.fillStyle = c.marron;
    ctx.fillText('Datos ficticios', w / 2, 640);

    // Sello: cuatro de cuatro
    ctx.save();
    ctx.translate(w - 150, 470);
    ctx.rotate(-0.18);
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.lineWidth = 6;
    ctx.strokeStyle = c.verde;
    ctx.stroke();
    ctx.fillStyle = c.verde;
    ctx.font = '700 40px Poppins, "Segoe UI", sans-serif';
    ctx.fillText('4/4', 0, 4);
    ctx.font = '600 18px Poppins, "Segoe UI", sans-serif';
    ctx.fillText('VÁLIDOS', 0, 32);
    ctx.restore();
    texturaCert.needsUpdate = true;
  }

  // ---- estado del bucle
  let destruido = false;
  let texturaPersonaje: Texture | null = null;
  let pObjetivo = 0;
  let pActual = 0;
  let incXObjetivo = 0;
  let incYObjetivo = 0;
  let incX = 0;
  let incY = 0;
  let tiempo = 0;
  /**
   * Segundos sin scroll. La brisa y el pulso del halo se apagan suave entre los 3 y los 5 s de
   * quietud: nada se mueve solo por más de 5 s (WCAG 2.2.2).
   */
  let quieto = 0;
  let ultimo = 0;
  let idBucle = 0;
  let idDibujo = 0;
  let enVista = false;
  let pestanaVisible = document.visibilityState !== 'hidden';
  let anchoCss = 1;
  let altoCss = 1;
  let alturaVista = 0;

  const anclas = {} as Record<AnclaAndamio, PosicionAncla>;
  for (const id of ORDEN_ANCLAS) anclas[id] = { x: 0, y: 0, visible: false };

  const colorPendiente = new Color(0x3a2c1b);
  const colorCargado = new Color();
  const colorValido = new Color();
  const emisionValida = new Color();
  const negro = new Color(0x000000);
  const tmpCam = new Vector3();
  const tmpMira = new Vector3();
  const tmpDerecha = new Vector3();
  const tmpProy = new Vector3();

  function aplicarColores(): void {
    paleta = op.colores();
    oro.color.set(paleta.oro);
    oro.emissive.set(paleta.marron);
    anilloMat.color.set(paleta.oro);
    sueloMat.color.set(paleta.superficie);
    colorCargado.set(paleta.crema);
    colorValido.set(paleta.oro);
    emisionValida.set(paleta.ambar);
    for (const t of travesanos) {
      t.selloMat.color.set(paleta.verde);
      t.chispasMat.color.set(paleta.amarillo);
    }
    (halo.material as SpriteMaterial).color.set(paleta.ambar);
    pintarCertificado();
  }

  function actualizar(dt: number): void {
    if (reducido) {
      pActual = pObjetivo;
      incX = incXObjetivo;
      incY = incYObjetivo;
    } else {
      const k = 1 - Math.exp(-dt * 6);
      pActual += (pObjetivo - pActual) * k;
      incX += (incXObjetivo - incX) * (1 - Math.exp(-dt * 4));
      incY += (incYObjetivo - incY) * (1 - Math.exp(-dt * 4));
    }
    const p = pActual;

    // El balanceo: la inclinación del celular, más una brisa que no se nota en reducido.
    const brisa = reducido ? 0 : Math.sin(tiempo * 0.7) * 0.006;
    raiz.rotation.z = -incX * 0.05 + brisa;
    raiz.rotation.x = incY * 0.025;

    // El personaje sube por la escalera; el arnés lo mantiene vertical.
    const altura = alturaEscalador(p);
    const yPersonaje = altura * ALTO_CUERPO + (altura > 0 ? 0.08 : 0);
    personaje.position.y = yPersonaje;
    personaje.position.x = X_ESCALERA + (altura >= NIVELES ? tramo(p, CUMBRE, CUMBRE + 0.03) * -0.4 : 0);
    personajeMat.rotation = -raiz.rotation.z * 0.9;

    // Documentos, mosquetones y línea de vida
    let enganchados = 0;
    for (let i = 0; i < NIVELES; i++) {
      const t = travesanos[i];
      const estado = estadoDocumento(p, i);
      if (estado !== t.estado) {
        if (estado === 'valido' && t.estado !== 'valido') t.desde = 0;
        t.estado = estado;
      }
      t.desde += dt;
      const valido = estado === 'valido';
      if (valido) enganchados = i + 1;

      if (estado === 'pendiente') {
        t.material.color.copy(colorPendiente);
        t.material.emissive.copy(negro);
      } else if (estado === 'cargado') {
        t.material.color.copy(colorCargado);
        t.material.emissive.copy(negro);
      } else {
        t.material.color.copy(colorValido);
        t.material.emissive.copy(emisionValida);
        t.material.emissiveIntensity = 0.35;
      }
      // La hoja llega volando desde el personaje cuando se sube el archivo.
      const llegada = estado === 'pendiente' ? 0 : 1;
      t.hoja.scale.setScalar(0.15 + 0.85 * llegada);

      const s = valido ? (reducido ? 1 : suave(limitar(t.desde / 0.35, 0, 1))) : 0.001;
      t.sello.scale.setScalar(Math.max(s, 0.001));
      // El mosquetón se cierra: gira de abierto a cerrado y se acerca al anclaje.
      const cierre = valido ? (reducido ? 1 : suave(limitar(t.desde / 0.5, 0, 1))) : 0;
      t.mosqueton.rotation.set(0, Math.PI / 2, (1 - cierre) * 1.2);
      t.mosqueton.position.x = ANCHO / 2 + 0.18 + (1 - cierre) * 0.22;
      t.mosqueton.visible = altura >= i + 0.6 || valido;
      t.eslinga.scale.y = Math.max(cierre * (X_LINEA - ANCHO / 2 - 0.18), 0.001);
      // Chispa dorada al engancharse
      const vida = t.desde;
      t.chispas.visible = !reducido && valido && vida < 0.9;
      if (t.chispas.visible) {
        const e = vida / 0.9;
        t.chispas.scale.setScalar(0.4 + e * 1.4);
        t.chispasMat.opacity = (1 - e) * 0.95;
      }
    }

    const alturaLinea = enganchados === 0 ? 0.001 : travesanos[enganchados - 1].y + 0.75;
    const linea = lineaOro.scale.y + (alturaLinea - lineaOro.scale.y) * (reducido ? 1 : 1 - Math.exp(-dt * 5));
    lineaOro.scale.y = Math.max(linea, 0.001);
    lineaOro.position.y = lineaOro.scale.y / 2;

    // La cumbre: el certificado se despliega y el halo se enciende.
    const c = suave(tramo(p, CERTIFICADO.desde, CERTIFICADO.hasta));
    certificado.visible = c > 0.001;
    certificado.scale.y = Math.max(c, 0.001);
    certificado.rotation.x = (1 - c) * -0.9;
    (halo.material as SpriteMaterial).opacity = c * 0.55;
    halo.scale.setScalar(4 + c * 1.6 + (reducido ? 0 : Math.sin(tiempo * 1.4) * 0.12 * c));

    encuadrar(p, yPersonaje, dt);
  }

  function encuadrar(p: number, yPersonaje: number, dt: number): void {
    // La cámara sube con el personaje y le da media vuelta al andamio.
    const cumbre = tramo(p, CUMBRE, 1);
    const objetivoY = Math.min(yPersonaje + 0.9, ALTO_TOTAL + 0.6) + cumbre * 1.2;
    alturaVista = reducido || dt === 0 ? objetivoY : alturaVista + (objetivoY - alturaVista) * (1 - Math.exp(-dt * 5));
    const angulo = -0.62 + p * 1.05 + incX * 0.12;
    const aspecto = anchoCss / altoCss;
    const lejos = (aspecto < 0.9 ? 9.4 : 8.8) + cumbre * 1.4 + (p < SUELO ? (1 - p / SUELO) * 1.6 : 0);
    tmpMira.set(0, alturaVista, 0);
    tmpCam.set(Math.sin(angulo) * lejos, alturaVista + 1.1 - incY * 0.3, Math.cos(angulo) * lejos);
    // En pantallas anchas el texto va a la izquierda: el andamio se corre a la derecha.
    if (aspecto > 1.25) {
      tmpDerecha.subVectors(tmpMira, tmpCam).cross(arriba).normalize();
      const corrimiento = Math.min((aspecto - 1.25) * 2.2, 2.2);
      tmpCam.addScaledVector(tmpDerecha, -corrimiento);
      tmpMira.addScaledVector(tmpDerecha, -corrimiento);
    }
    camara.position.copy(tmpCam);
    camara.lookAt(tmpMira);
  }

  function posicionar(): void {
    const avisar = op.alPosicionar;
    if (!avisar) return;
    camara.updateMatrixWorld();
    raiz.updateMatrixWorld();
    for (let i = 0; i < ORDEN_ANCLAS.length; i++) {
      const id = ORDEN_ANCLAS[i];
      if (id === 'cumbre') {
        tmpProy.set(certificado.position.x, Y_CERT + 0.95, certificado.position.z);
      } else {
        const t = travesanos[i];
        tmpProy.set(-ANCHO / 2 - 0.12, t.y + 0.5, Z_FRENTE);
      }
      tmpProy.applyMatrix4(raiz.matrixWorld).project(camara);
      const a = anclas[id];
      a.x = (tmpProy.x * 0.5 + 0.5) * anchoCss;
      a.y = (-tmpProy.y * 0.5 + 0.5) * altoCss;
      const enCuadro = tmpProy.z < 1 && a.x > 8 && a.x < anchoCss - 8 && a.y > 24 && a.y < altoCss - 24;
      a.visible = id === 'cumbre' ? certificado.visible && certificado.scale.y > 0.6 && enCuadro : enCuadro;
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

  // El personaje: se carga al final, cuando el bucle ya existe.
  {
    const img = new Image();
    img.decoding = 'async';
    let listo = false;
    const alCargar = () => {
      if (listo || destruido) return;
      listo = true;
      texturaPersonaje = new Texture(img);
      texturaPersonaje.colorSpace = SRGBColorSpace;
      texturaPersonaje.needsUpdate = true;
      personajeMat.map = texturaPersonaje;
      personajeMat.opacity = 1;
      personajeMat.needsUpdate = true;
      solicitarDibujo();
    };
    // Con el evento load, nunca con decode(): una pestaña que no pinta lo deja esperando.
    img.addEventListener('load', alCargar, { once: true });
    img.src = op.personaje;
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

    inclinar(x: number, y: number): void {
      if (destruido) return;
      incXObjetivo = limitar(Number.isFinite(x) ? x : 0, -1, 1);
      incYObjetivo = limitar(Number.isFinite(y) ? y : 0, -1, 1);
      if (reducido) solicitarDibujo();
    },

    redibujarTextos(): void {
      if (destruido) return;
      pintarCertificado();
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
      texturaPersonaje?.dispose();
      mallaTubos.dispose();
      abrazaderas.dispose();
      tablones.dispose();
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

function texturaHalo(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.4)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    // Rayos: el sol de la cumbre
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(64, 64);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-5, -64);
      ctx.lineTo(5, -64);
      ctx.closePath();
      ctx.fill();
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function texturaPapel(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 172;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 128, 172);
    ctx.fillStyle = '#b8b0a2';
    ctx.fillRect(14, 16, 64, 12);
    ctx.fillStyle = '#d6cfc2';
    for (let y = 44; y < 150; y += 14) ctx.fillRect(14, y, y % 28 === 2 ? 70 : 100, 5);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
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
