/**
 * "De desarrollo a producción": un interruptor grande decide qué siembra el backbone al arrancar.
 * A la izquierda, lo que sembraba el código al recibirlo: tres usuarios de prueba con claves débiles
 * y dos llaves de plataforma conectadas a todas las skills. A la derecha, lo que siembra hoy en
 * producción: los usuarios se disuelven en partículas que forman un solo administrador con candado,
 * y los cables de las llaves se recogen porque cada plataforma nace sin skills.
 * Todo el estado sale de la posición de la palanca (0..1): arrastrarla a medias deja la escena a medias.
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
  DynamicDrawUsage,
  EdgesGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
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

export type AnclaInterruptor = 'desarrollo' | 'produccion' | 'usuarios' | 'admin' | 'ahdo' | 'ocupasalud' | 'skills';

export interface PosicionAnclaInterruptor {
  x: number;
  y: number;
  visible: boolean;
}

export interface ColoresInterruptor {
  fondo: string;
  linea: string;
  lineaSuave: string;
  tinta: string;
  tinta3: string;
  senal: string;
  indigo: string;
  violeta: string;
  exito: string;
  aviso: string;
  ahdo: string;
  ocupasalud: string;
  superficie2: string;
}

export interface OpcionesInterruptor {
  lienzo: HTMLCanvasElement;
  reducido: boolean;
  colores: () => ColoresInterruptor;
  /** Px CSS relativos al lienzo. El objeto se reutiliza entre cuadros: léelo en el acto. */
  alPosicionar: (pos: Readonly<Record<AnclaInterruptor, PosicionAnclaInterruptor>>) => void;
}

export interface EscenaInterruptor {
  /** 0 = desarrollo, 1 = producción. Con `inmediato` la palanca sigue al dedo sin resorte. */
  posicion(s: number, inmediato?: boolean): void;
  inclinar(x: number, y: number): void;
  refrescarColores(): void;
  destruir(): void;
}

// ---------------------------------------------------------------- utilidades puras

const limitar = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const tramo = (p: number, a: number, b: number) => limitar((p - a) / (b - a), 0, 1);
const suave = (t: number) => t * t * (3 - 2 * t);
const meseta = (p: number, a: number, b: number, c: number, d: number) =>
  suave(tramo(p, a, b)) * (1 - suave(tramo(p, c, d)));

const PARTICULAS = 1100;
const USUARIOS = 3;
const SKILLS = 6;
const TRAMOS_CABLE = 24;
const ANGULO_PALANCA = 0.62;
/** Profundidad del interruptor: delante de las figuras, para que la palanca no las tape. */
const Z_INTERRUPTOR = 2.6;

// ---------------------------------------------------------------- escena

export function crearInterruptor(op: OpcionesInterruptor): EscenaInterruptor {
  const { lienzo, reducido } = op;
  const padre: Element = lienzo.parentElement ?? lienzo;

  const renderer = new WebGLRenderer({ canvas: lienzo, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = SRGBColorSpace;

  const escena = new Scene();
  const niebla = new Fog(0x0b0f1a, 14, 30);
  escena.fog = niebla;
  const camara = new PerspectiveCamera(38, 1, 0.1, 80);

  const desechables: Array<{ dispose(): void }> = [];
  const registrar = <T extends { dispose(): void }>(d: T): T => {
    desechables.push(d);
    return d;
  };

  escena.add(new HemisphereLight(0xffffff, 0x1a2136, Math.PI * 0.6));
  const luz = new DirectionalLight(0xffffff, Math.PI * 0.6);
  luz.position.set(-3, 9, 6);
  escena.add(luz);

  const v1 = new Vector3();
  const v2 = new Vector3();
  const c1 = new Color();
  const c2 = new Color();

  const halo = registrar(texturaHalo());
  const documento = registrar(texturaDocumento());

  // ---- piso: una rejilla que se apaga con la niebla

  const pisoGeo = registrar(new BufferGeometry());
  {
    const pos: number[] = [];
    for (let x = -7.2; x <= 7.21; x += 0.6) pos.push(x, 0, -4.2, x, 0, 4.2);
    for (let z = -4.2; z <= 4.21; z += 0.6) pos.push(-7.2, 0, z, 7.2, 0, z);
    pisoGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  }
  const matPiso = registrar(new LineBasicMaterial({ transparent: true, opacity: 0.5 }));
  escena.add(new LineSegments(pisoGeo, matPiso));

  // ---- el interruptor: base, ranura, dos lámparas y la palanca

  const interruptor = new Group();
  interruptor.position.set(0, 0, Z_INTERRUPTOR);
  escena.add(interruptor);

  const baseGeo = registrar(geometriaBase());
  const matBase = registrar(new MeshStandardMaterial({ metalness: 0.35, roughness: 0.55 }));
  interruptor.add(new Mesh(baseGeo, matBase));
  const bordesBase = registrar(new EdgesGeometry(baseGeo, 35));
  const matBordeBase = registrar(new LineBasicMaterial({ transparent: true, opacity: 0.7 }));
  interruptor.add(new LineSegments(bordesBase, matBordeBase));

  const ranuraGeo = registrar(new BoxGeometry(3.0, 0.02, 0.24));
  const matRanura = registrar(new MeshBasicMaterial());
  const ranura = new Mesh(ranuraGeo, matRanura);
  ranura.position.y = 0.41;
  interruptor.add(ranura);

  const lamparaGeo = registrar(new CylinderGeometry(0.17, 0.17, 0.06, 24));
  const matLamparaDev = registrar(new MeshBasicMaterial());
  const matLamparaProd = registrar(new MeshBasicMaterial());
  const lamparaDev = new Mesh(lamparaGeo, matLamparaDev);
  const lamparaProd = new Mesh(lamparaGeo, matLamparaProd);
  lamparaDev.position.set(-1.86, 0.43, 0.42);
  lamparaProd.position.set(1.86, 0.43, 0.42);
  interruptor.add(lamparaDev, lamparaProd);
  const matHaloDev = registrar(
    new SpriteMaterial({ map: halo, transparent: true, blending: AdditiveBlending, depthWrite: false }),
  );
  const matHaloProd = registrar(
    new SpriteMaterial({ map: halo, transparent: true, blending: AdditiveBlending, depthWrite: false }),
  );
  const haloDev = new Sprite(matHaloDev);
  const haloProd = new Sprite(matHaloProd);
  haloDev.scale.setScalar(1.1);
  haloProd.scale.setScalar(1.1);
  haloDev.position.copy(lamparaDev.position).setY(0.5);
  haloProd.position.copy(lamparaProd.position).setY(0.5);
  interruptor.add(haloDev, haloProd);

  const pivote = new Group();
  pivote.position.y = 0.41;
  interruptor.add(pivote);
  const ejeGeo = registrar(new CylinderGeometry(0.16, 0.16, 0.36, 20));
  ejeGeo.rotateX(Math.PI / 2);
  const matMetal = registrar(new MeshStandardMaterial({ metalness: 0.7, roughness: 0.3 }));
  pivote.add(new Mesh(ejeGeo, matMetal));
  const varaGeo = registrar(new CylinderGeometry(0.075, 0.1, 1.55, 16));
  varaGeo.translate(0, 0.78, 0);
  pivote.add(new Mesh(varaGeo, matMetal));
  const pomoGeo = registrar(new SphereGeometry(0.34, 28, 20));
  const matPomo = registrar(new MeshStandardMaterial({ metalness: 0.1, roughness: 0.35 }));
  const pomo = new Mesh(pomoGeo, matPomo);
  pomo.position.y = 1.66;
  pivote.add(pomo);
  const matHaloPomo = registrar(
    new SpriteMaterial({ map: halo, transparent: true, blending: AdditiveBlending, depthWrite: false }),
  );
  const haloPomo = new Sprite(matHaloPomo);
  haloPomo.scale.setScalar(1.7);
  haloPomo.position.y = 1.66;
  pivote.add(haloPomo);

  // ---- los usuarios de prueba (desarrollo) y el administrador (producción)

  const cuerpoGeo = registrar(new CapsuleGeometry(0.36, 0.66, 4, 16));
  const cabezaGeo = registrar(new SphereGeometry(0.29, 20, 16));
  const matUsuario = registrar(new MeshLambertMaterial({ transparent: true }));
  const matAdmin = registrar(new MeshLambertMaterial({ transparent: true }));

  const FILA_Z = -0.7;
  const usuarios: Group[] = [];
  // Separados de la palanca: en cada extremo el pomo queda entre dos figuras y no encima de una.
  const xUsuarios = [-2.25, 0, 2.25];
  for (let i = 0; i < USUARIOS; i++) {
    const u = new Group();
    const cuerpo = new Mesh(cuerpoGeo, matUsuario);
    cuerpo.position.y = 0.75;
    const cabeza = new Mesh(cabezaGeo, matUsuario);
    cabeza.position.y = 1.64;
    u.add(cuerpo, cabeza);
    u.position.set(xUsuarios[i], 0, FILA_Z);
    escena.add(u);
    usuarios.push(u);
  }

  // Candado abierto junto a cada usuario de prueba: la clave débil.
  const candadoCuerpoGeo = registrar(new BoxGeometry(0.3, 0.24, 0.1));
  const arcoGeo = registrar(new TorusGeometry(0.1, 0.03, 8, 20, Math.PI));
  const matCandadoDebil = registrar(new MeshBasicMaterial({ transparent: true }));
  const candadosDebiles: Group[] = [];
  for (let i = 0; i < USUARIOS; i++) {
    const c = new Group();
    const cuerpo = new Mesh(candadoCuerpoGeo, matCandadoDebil);
    const arco = new Mesh(arcoGeo, matCandadoDebil);
    // Abierto: el arco sube y gira sobre una de sus patas.
    arco.position.set(0.07, 0.24, 0);
    arco.rotation.y = 0.9;
    c.add(cuerpo, arco);
    c.position.set(xUsuarios[i] + 0.52, 0.95, FILA_Z + 0.42);
    escena.add(c);
    candadosDebiles.push(c);
  }

  const admin = new Group();
  {
    const cuerpo = new Mesh(cuerpoGeo, matAdmin);
    cuerpo.position.y = 0.75;
    const cabeza = new Mesh(cabezaGeo, matAdmin);
    cabeza.position.y = 1.64;
    admin.add(cuerpo, cabeza);
  }
  admin.scale.setScalar(1.25);
  admin.position.set(0, 0, FILA_Z);
  escena.add(admin);

  // El candado cerrado del administrador: la clave fuerte.
  const candado = new Group();
  const candadoGrandeGeo = registrar(new BoxGeometry(0.62, 0.5, 0.18));
  const arcoGrandeGeo = registrar(new TorusGeometry(0.2, 0.06, 10, 24, Math.PI));
  const matCandado = registrar(new MeshStandardMaterial({ metalness: 0.45, roughness: 0.3, transparent: true }));
  const cuerpoCandado = new Mesh(candadoGrandeGeo, matCandado);
  const arcoCandado = new Mesh(arcoGrandeGeo, matCandado);
  arcoCandado.position.y = 0.25;
  candado.add(cuerpoCandado, arcoCandado);
  const ojoGeo = registrar(new CylinderGeometry(0.05, 0.05, 0.2, 12));
  ojoGeo.rotateX(Math.PI / 2);
  const matOjo = registrar(new MeshBasicMaterial({ transparent: true }));
  candado.add(new Mesh(ojoGeo, matOjo));
  const matHaloCandado = registrar(
    new SpriteMaterial({ map: halo, transparent: true, blending: AdditiveBlending, depthWrite: false }),
  );
  const haloCandado = new Sprite(matHaloCandado);
  haloCandado.scale.setScalar(2.4);
  haloCandado.position.z = -0.15;
  candado.add(haloCandado);
  candado.position.set(0, 1.2, FILA_Z + 0.75);
  escena.add(candado);

  // ---- las partículas: de tres usuarios a un administrador

  const origen = new Float32Array(PARTICULAS * 3);
  const destino = new Float32Array(PARTICULAS * 3);
  const giro = new Float32Array(PARTICULAS * 3);
  const retraso = new Float32Array(PARTICULAS);
  {
    let s = 11;
    const azar = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < PARTICULAS; i++) {
      const o = i * 3;
      // Origen: sobre uno de los tres usuarios.
      const fx = xUsuarios[i % USUARIOS];
      puntoFigura(azar, 1, v1);
      origen[o] = fx + v1.x;
      origen[o + 1] = v1.y;
      origen[o + 2] = FILA_Z + v1.z;
      // Destino: el administrador (más grande) o su candado.
      if (azar() < 0.78) {
        puntoFigura(azar, 1.25, v1);
        destino[o] = v1.x;
        destino[o + 1] = v1.y;
        destino[o + 2] = FILA_Z + v1.z;
      } else {
        destino[o] = (azar() - 0.5) * 0.62;
        destino[o + 1] = 1.2 + (azar() - 0.5) * 0.5;
        destino[o + 2] = FILA_Z + 0.75 + (azar() - 0.5) * 0.18;
      }
      // Un remolino propio para cada partícula: así el paso no es una línea recta.
      v2.set(azar() - 0.5, azar() * 0.6, azar() - 0.5).normalize();
      giro[o] = v2.x;
      giro[o + 1] = v2.y;
      giro[o + 2] = v2.z;
      retraso[i] = azar() * 0.35;
    }
  }
  const particulasPos = new Float32Array(PARTICULAS * 3);
  const particulasGeo = registrar(new BufferGeometry());
  const atribParticulas = new BufferAttribute(particulasPos, 3);
  atribParticulas.setUsage(DynamicDrawUsage);
  particulasGeo.setAttribute('position', atribParticulas);
  const matParticulas = registrar(
    new PointsMaterial({
      size: 0.095,
      map: halo,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  const particulas = new Points(particulasGeo, matParticulas);
  particulas.frustumCulled = false;
  escena.add(particulas);

  // ---- las llaves de las plataformas y las skills, unidas por cables

  const llaveAnilloGeo = registrar(new TorusGeometry(0.26, 0.075, 10, 26));
  const llaveVaraGeo = registrar(new BoxGeometry(0.78, 0.11, 0.11));
  llaveVaraGeo.translate(0.62, 0, 0);
  const llaveDienteGeo = registrar(new BoxGeometry(0.1, 0.2, 0.11));
  const matLlaveAhdo = registrar(new MeshLambertMaterial());
  const matLlaveOcupa = registrar(new MeshLambertMaterial());
  const llaves: Group[] = [];
  for (const mat of [matLlaveAhdo, matLlaveOcupa]) {
    const l = new Group();
    l.add(new Mesh(llaveAnilloGeo, mat));
    l.add(new Mesh(llaveVaraGeo, mat));
    const d1 = new Mesh(llaveDienteGeo, mat);
    d1.position.set(0.86, -0.12, 0);
    const d2 = new Mesh(llaveDienteGeo, mat);
    d2.position.set(0.66, -0.1, 0);
    d2.scale.y = 0.7;
    l.add(d1, d2);
    escena.add(l);
    llaves.push(l);
  }

  const tarjetaGeo = registrar(new BoxGeometry(0.56, 0.74, 0.04));
  const tarjetaBordes = registrar(new EdgesGeometry(tarjetaGeo));
  const matTarjeta = registrar(new MeshLambertMaterial({ map: documento }));
  const matBordeTarjeta = registrar(new LineBasicMaterial({ transparent: true, opacity: 0.9 }));
  const tarjetas: Group[] = [];
  const alturaTarjeta = new Float32Array(SKILLS);
  for (let i = 0; i < SKILLS; i++) {
    const t = new Group();
    t.add(new Mesh(tarjetaGeo, matTarjeta), new LineSegments(tarjetaBordes, matBordeTarjeta));
    escena.add(t);
    tarjetas.push(t);
  }

  // Los cables: 2 llaves × 6 skills. Los vértices van ordenados por tramo y no por cable,
  // así un solo drawRange recoge los doce cables a la vez, desde las skills hacia las llaves.
  const CABLES = llaves.length * SKILLS;
  const cablesPos = new Float32Array(TRAMOS_CABLE * CABLES * 2 * 3);
  const cablesCol = new Float32Array(TRAMOS_CABLE * CABLES * 2 * 3);
  const cablesGeo = registrar(new BufferGeometry());
  const atribCables = new BufferAttribute(cablesPos, 3);
  const atribCablesCol = new BufferAttribute(cablesCol, 3);
  cablesGeo.setAttribute('position', atribCables);
  cablesGeo.setAttribute('color', atribCablesCol);
  const matCables = registrar(new LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.85 }));
  const cables = new LineSegments(cablesGeo, matCables);
  cables.frustumCulled = false;
  escena.add(cables);
  const puntaLlave = new Vector3();
  const puntaTarjeta = new Vector3();
  const control = new Vector3();

  // ---- disposición: se ajusta al ancho del lienzo

  let ancho = 4.4;
  function disponer(estrecho: boolean): void {
    ancho = estrecho ? 3.25 : 4.45;
    const escalaLado = estrecho ? 0.82 : 1;
    llaves[0].position.set(-ancho - 0.2, 1.75, 0);
    llaves[1].position.set(-ancho - 0.2, 0.75, 0);
    for (const l of llaves) l.scale.setScalar(escalaLado);
    for (let i = 0; i < SKILLS; i++) {
      const col = i % 2;
      const fila = Math.floor(i / 2);
      alturaTarjeta[i] = 0.5 + fila * 0.92 * escalaLado;
      tarjetas[i].position.set(ancho - 0.35 + col * 0.72 * escalaLado, alturaTarjeta[i], 0);
      tarjetas[i].scale.setScalar(escalaLado);
      tarjetas[i].rotation.y = -0.35;
    }
    // Los cables se recalculan con la nueva posición de las piezas.
    let k = 0;
    for (let tramoI = 0; tramoI < TRAMOS_CABLE; tramoI++) {
      const t0 = tramoI / TRAMOS_CABLE;
      const t1 = (tramoI + 1) / TRAMOS_CABLE;
      for (let li = 0; li < llaves.length; li++) {
        for (let si = 0; si < SKILLS; si++) {
          puntaLlave.copy(llaves[li].position).add(v1.set(1.0 * escalaLado, 0, 0));
          puntaTarjeta.copy(tarjetas[si].position).add(v1.set(-0.3 * escalaLado, 0, 0));
          control.set(
            (puntaLlave.x + puntaTarjeta.x) * 0.5,
            3.3 + li * 0.35 + si * 0.08,
            -1.9 - si * 0.12,
          );
          for (const t of [t0, t1]) {
            curva(puntaLlave, control, puntaTarjeta, t, v2);
            cablesPos[k] = v2.x;
            cablesPos[k + 1] = v2.y;
            cablesPos[k + 2] = v2.z;
            k += 3;
          }
        }
      }
    }
    atribCables.needsUpdate = true;
    cablesGeo.computeBoundingSphere();
    puntoAncla.ahdo.copy(llaves[0].position).add(v1.set(0.4, 0.5, 0));
    puntoAncla.ocupasalud.copy(llaves[1].position).add(v1.set(0.4, -0.5, 0));
    puntoAncla.skills.copy(tarjetas[SKILLS - 2].position).add(v1.set(0.36, 0.72, 0));
  }

  // ---- anclas para las etiquetas del DOM

  const anclas: Record<AnclaInterruptor, PosicionAnclaInterruptor> = {
    desarrollo: { x: 0, y: 0, visible: false },
    produccion: { x: 0, y: 0, visible: false },
    usuarios: { x: 0, y: 0, visible: false },
    admin: { x: 0, y: 0, visible: false },
    ahdo: { x: 0, y: 0, visible: false },
    ocupasalud: { x: 0, y: 0, visible: false },
    skills: { x: 0, y: 0, visible: false },
  };
  const puntoAncla: Record<AnclaInterruptor, Vector3> = {
    desarrollo: new Vector3(-1.86, 0.2, Z_INTERRUPTOR + 0.95),
    produccion: new Vector3(1.86, 0.2, Z_INTERRUPTOR + 0.95),
    usuarios: new Vector3(0, 2.35, FILA_Z),
    admin: new Vector3(0, 2.75, FILA_Z),
    ahdo: new Vector3(),
    ocupasalud: new Vector3(),
    skills: new Vector3(),
  };
  const visibles: Record<AnclaInterruptor, boolean> = {
    desarrollo: true,
    produccion: true,
    usuarios: false,
    admin: false,
    ahdo: true,
    ocupasalud: true,
    skills: true,
  };
  const nombresAncla = Object.keys(anclas) as AnclaInterruptor[];

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
    ahdo: new Color(),
    ocupasalud: new Color(),
    superficie2: new Color(),
    fondo: new Color(),
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
    col.ahdo.set(c.ahdo);
    col.ocupasalud.set(c.ocupasalud);
    col.superficie2.set(c.superficie2);
    col.fondo.set(c.fondo);
    niebla.color.copy(col.fondo);

    matPiso.color.copy(col.lineaSuave);
    matBase.color.copy(col.superficie2).lerp(col.linea, 0.35);
    matBordeBase.color.copy(col.linea);
    matRanura.color.copy(col.fondo);
    matMetal.color.copy(col.tinta3);
    matUsuario.color.copy(col.tinta3);
    matCandadoDebil.color.copy(col.aviso);
    matAdmin.color.copy(col.senal);
    matCandado.color.copy(col.tinta);
    matCandado.emissive.copy(col.indigo);
    matCandado.emissiveIntensity = 0.25;
    matOjo.color.copy(col.fondo);
    matHaloCandado.color.copy(col.exito);
    matLlaveAhdo.color.copy(col.ahdo);
    matLlaveOcupa.color.copy(col.ocupasalud);
    matBordeTarjeta.color.copy(col.linea);
    matHaloDev.color.copy(col.aviso);
    matHaloProd.color.copy(col.exito);
    matParticulas.color.copy(col.senal).lerp(col.tinta, 0.25);

    // Cada cable lleva el color de la llave de la que sale.
    let k = 0;
    for (let tramoI = 0; tramoI < TRAMOS_CABLE; tramoI++) {
      for (let li = 0; li < llaves.length; li++) {
        const base = li === 0 ? col.ahdo : col.ocupasalud;
        for (let si = 0; si < SKILLS; si++) {
          for (let e = 0; e < 2; e++) {
            cablesCol[k] = base.r;
            cablesCol[k + 1] = base.g;
            cablesCol[k + 2] = base.b;
            k += 3;
          }
        }
      }
    }
    atribCablesCol.needsUpdate = true;
  }

  // ---- estado

  let sObjetivo = 0;
  let sActual = 0;
  let velocidad = 0;
  let tiempo = 0;
  let incX = 0;
  let incY = 0;
  let incXObj = 0;
  let incYObj = 0;
  let anchoCss = 1;
  let altoCss = 1;
  let distancia = 10;
  let destruido = false;
  let enVista = false;
  let pestanaVisible = document.visibilityState !== 'hidden';
  let idBucle = 0;
  let idDibujo = 0;
  let ultimo = 0;
  const mira = new Vector3(0, 1.05, 0);
  const direccion = new Vector3(0, 2.5, 9.2).normalize();

  function actualizar(dt: number): void {
    if (reducido) {
      sActual = sObjetivo;
      velocidad = 0;
    } else {
      tiempo += dt;
      // Un resorte apenas subamortiguado: la palanca llega con un pequeño rebote, como un interruptor real.
      velocidad += (sObjetivo - sActual) * 120 * dt;
      velocidad *= Math.exp(-13 * dt);
      sActual = limitar(sActual + velocidad * dt, -0.06, 1.06);
      incX += (incXObj - incX) * (1 - Math.exp(-dt * 4));
      incY += (incYObj - incY) * (1 - Math.exp(-dt * 4));
    }
    const s = limitar(sActual, 0, 1);
    const t = suave(tramo(s, 0.12, 0.96));

    // Cámara
    camara.position.copy(mira).addScaledVector(direccion, distancia);
    camara.position.x += incX * 0.9;
    camara.position.y -= incY * 0.45;
    camara.lookAt(mira);

    // Palanca y lámparas
    pivote.rotation.z = ANGULO_PALANCA - sActual * ANGULO_PALANCA * 2;
    matPomo.color.copy(col.aviso).lerp(col.exito, s);
    matPomo.emissive.copy(matPomo.color);
    matPomo.emissiveIntensity = 0.35;
    matHaloPomo.color.copy(matPomo.color);
    matHaloPomo.opacity = 0.55 + (reducido ? 0 : 0.15 * Math.sin(tiempo * 3));
    matLamparaDev.color.copy(col.lineaSuave).lerp(col.aviso, 1 - s);
    matLamparaProd.color.copy(col.lineaSuave).lerp(col.exito, s);
    matHaloDev.opacity = (1 - s) * 0.85;
    matHaloProd.opacity = s * 0.85;

    // Usuarios de prueba: se apagan en cuanto empieza el paso
    const usuariosVisibles = 1 - suave(tramo(t, 0, 0.16));
    matUsuario.opacity = usuariosVisibles;
    matCandadoDebil.opacity = usuariosVisibles;
    for (let i = 0; i < USUARIOS; i++) {
      usuarios[i].visible = usuariosVisibles > 0.01;
      candadosDebiles[i].visible = usuariosVisibles > 0.01;
      candadosDebiles[i].rotation.z = reducido ? 0 : Math.sin(tiempo * 2 + i) * 0.12;
    }

    // Administrador y candado: aparecen cuando las partículas terminan de llegar
    const adminVisible = suave(tramo(t, 0.84, 1));
    matAdmin.opacity = adminVisible;
    admin.visible = adminVisible > 0.01;
    matCandado.opacity = adminVisible;
    matOjo.opacity = adminVisible;
    candado.visible = adminVisible > 0.01;
    candado.rotation.y = reducido ? 0 : Math.sin(tiempo * 0.9) * 0.25;
    matHaloCandado.opacity = adminVisible * (0.55 + (reducido ? 0 : 0.2 * Math.sin(tiempo * 2.4)));

    // Partículas
    const enPaso = t > 0.001 && t < 0.999;
    particulas.visible = enPaso;
    if (enPaso) {
      matParticulas.opacity = meseta(t, 0, 0.08, 0.9, 1);
      for (let i = 0; i < PARTICULAS; i++) {
        const o = i * 3;
        const e = suave(tramo(t, retraso[i], retraso[i] + 0.65));
        const arco = Math.sin(e * Math.PI);
        const ola = reducido ? 0 : Math.sin(tiempo * 3 + i) * 0.03;
        particulasPos[o] = origen[o] + (destino[o] - origen[o]) * e + giro[o] * arco * 1.4;
        particulasPos[o + 1] = origen[o + 1] + (destino[o + 1] - origen[o + 1]) * e + (giro[o + 1] + 0.5) * arco * 1.2 + ola;
        particulasPos[o + 2] = origen[o + 2] + (destino[o + 2] - origen[o + 2]) * e + giro[o + 2] * arco * 1.4;
      }
      atribParticulas.needsUpdate = true;
    }

    // Cables: se recogen hacia las llaves. Las skills se apagan cuando ya nadie las ve.
    const recogido = suave(tramo(s, 0.05, 0.85));
    const tramosVisibles = Math.round(TRAMOS_CABLE * (1 - recogido));
    cablesGeo.setDrawRange(0, tramosVisibles * CABLES * 2);
    cables.visible = tramosVisibles > 0;
    c1.copy(col.tinta).lerp(c2.copy(col.superficie2).lerp(col.linea, 0.4), s);
    matTarjeta.color.copy(c1);
    matBordeTarjeta.opacity = 0.9 - s * 0.5;
    for (let i = 0; i < SKILLS; i++) {
      tarjetas[i].position.y = alturaTarjeta[i] + (reducido ? 0 : Math.sin(tiempo * 1.4 + i) * 0.04);
    }
    for (let i = 0; i < llaves.length; i++) {
      llaves[i].rotation.y = reducido ? 0 : Math.sin(tiempo * 0.8 + i * 1.7) * 0.35;
      llaves[i].rotation.z = reducido ? 0 : Math.sin(tiempo * 0.6 + i) * 0.06;
    }

    visibles.usuarios = s < 0.3;
    visibles.admin = s > 0.85;
  }

  function posicionarAnclas(): void {
    camara.updateMatrixWorld();
    for (let i = 0; i < nombresAncla.length; i++) {
      const id = nombresAncla[i];
      const a = anclas[id];
      v1.copy(puntoAncla[id]).project(camara);
      a.x = (v1.x * 0.5 + 0.5) * anchoCss;
      a.y = (-v1.y * 0.5 + 0.5) * altoCss;
      a.visible = visibles[id] && v1.z < 1 && a.x > -40 && a.x < anchoCss + 40 && a.y > -20 && a.y < altoCss + 40;
    }
    op.alPosicionar(anclas);
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

  function redimensionar(w: number, h: number): void {
    if (w < 1 || h < 1) return;
    anchoCss = w;
    altoCss = h;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    const aspecto = w / h;
    camara.aspect = aspecto;
    camara.fov = aspecto < 1.1 ? 46 : 38;
    camara.updateProjectionMatrix();
    disponer(aspecto < 1.35);
    // Distancia para que quepan las llaves y las skills a lo ancho (y la palanca a lo alto).
    const tanV = Math.tan((camara.fov * Math.PI) / 360);
    distancia = limitar(Math.max((ancho + 1.25) / (tanV * aspecto), 3.6 / tanV), 8, 22);
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
    posicion(s: number, inmediato = false): void {
      if (destruido) return;
      sObjetivo = limitar(Number.isFinite(s) ? s : 0, 0, 1);
      if (inmediato) {
        sActual = sObjetivo;
        velocidad = 0;
      }
      if (!idBucle) solicitarDibujo();
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

/** Curva cuadrática de Bézier entre a y b con control c. */
function curva(a: Vector3, c: Vector3, b: Vector3, t: number, salida: Vector3): Vector3 {
  const u = 1 - t;
  return salida.set(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z,
  );
}

/** Un punto al azar sobre la silueta de una figura (cuerpo o cabeza), en coordenadas locales. */
function puntoFigura(azar: () => number, escala: number, salida: Vector3): Vector3 {
  const a = azar() * Math.PI * 2;
  if (azar() < 0.7) {
    const r = 0.36 * escala;
    return salida.set(Math.cos(a) * r, (0.32 + azar() * 0.86) * escala, Math.sin(a) * r);
  }
  const b = Math.acos(2 * azar() - 1);
  const r = 0.29 * escala;
  return salida.set(Math.sin(b) * Math.cos(a) * r, 1.64 * escala + Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r);
}

/** La base del interruptor: un rectángulo redondeado extruido hacia arriba, con la cara superior en y = 0,4. */
function geometriaBase(): ExtrudeGeometry {
  const w = 4.5;
  const h = 1.6;
  const r = 0.32;
  const forma = new Shape();
  forma.moveTo(-w / 2 + r, -h / 2);
  forma.lineTo(w / 2 - r, -h / 2);
  forma.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  forma.lineTo(w / 2, h / 2 - r);
  forma.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  forma.lineTo(-w / 2 + r, h / 2);
  forma.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  forma.lineTo(-w / 2, -h / 2 + r);
  forma.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new ExtrudeGeometry(forma, {
    depth: 0.32,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2,
    curveSegments: 8,
  });
  // La extrusión va en +Z: al girarla queda en +Y, con la base apoyada en el piso.
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0.04, 0);
  return geo;
}

function lienzo2d(ancho: number, alto: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  return [c, c.getContext('2d')];
}

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

/** La cara de una tarjeta de skill: título y renglones, sin texto legible. */
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
