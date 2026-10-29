/**
 * Mapa 3D del ecosistema (portada). Estética de maqueta de planta industrial:
 * naves sobre una retícula y conductos en ángulo recto sobre el piso.
 * Independiente de Angular: el anfitrión lo carga con import() solo en el navegador.
 */
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  DynamicDrawUsage,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  HemisphereLight,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Path,
  PerspectiveCamera,
  Raycaster,
  SRGBColorSpace,
  Scene,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Intersection,
  type Object3D,
} from 'three';

// ---------------------------------------------------------------- contrato

export type Autoria = 'solida' | 'base' | 'alambre';
export type EstadoNodo = 'produccion' | 'desplegado' | 'prototipo' | 'inactivo';

export interface NodoMapa {
  id: string;
  x: number;
  z: number;
  ancho: number;
  fondo: number;
  alto: number;
  color: string;
  autoria: Autoria;
  estado: EstadoNodo;
}

export interface EnlaceMapa {
  de: string;
  a: string;
  tipo: 'activo' | 'planeado';
}

export interface ColoresMapa {
  lineaSuave: string;
  linea: string;
  tinta: string;
  tinta3: string;
  senal: string;
}

export interface PosicionEtiqueta {
  x: number;
  y: number;
  visible: boolean;
}

export interface OpcionesEcosistema {
  lienzo: HTMLCanvasElement;
  nodos: NodoMapa[];
  enlaces: EnlaceMapa[];
  colores: () => ColoresMapa;
  reducido: boolean;
  /**
   * Px CSS relativos al lienzo; ancla = centro del techo del nodo.
   * El objeto se reutiliza entre cuadros (se muta en sitio): léelo en el momento,
   * no guardes la referencia esperando que cambie de identidad.
   */
  alPosicionar: (pos: Record<string, PosicionEtiqueta>) => void;
  alPasar: (id: string | null) => void;
  alElegir: (id: string) => void;
}

export interface EscenaEcosistema {
  resaltar(id: string | null): void;
  /** -1..1. x>0 lleva la cámara a la derecha; y>0 (hacia abajo en pantalla) la baja. */
  inclinar(x: number, y: number): void;
  entrar(id: string): Promise<void>;
  refrescarColores(): void;
  destruir(): void;
}

// ---------------------------------------------------------------- composición

const GRADO = Math.PI / 180;
const FOV = 30;
const AZIMUT_BASE = 35 * GRADO;
const ELEVACION_BASE = 38 * GRADO;
const DERIVA_AMPLITUD = 4 * GRADO;
const DERIVA_PERIODO = 14;
const INCLINAR_AZIMUT = 9 * GRADO;
const INCLINAR_ELEVACION = 5 * GRADO;
const MARGEN_ENCUADRE = 0.92;
/** Espacio sobre el techo que también debe caber (baliza y arranque de la etiqueta). */
const HOLGURA_TECHO = 0.5;

const RETICULA_EXTENSION = 12;
const SUBIDA_RESALTE = 0.12;
const DURACION_ENTRADA = 0.65;

const OPACIDAD_ALAMBRE = 0.07;
const OPACIDAD_PROTOTIPO = 0.35;
const OPACIDAD_ARISTA_TINTA = 0.22;
const OPACIDAD_ARISTA_MARCA = 0.95;
const MEZCLA_INACTIVO = 0.7;

const LADO_BALIZA = 0.16;
const PERIODO_LATIDO = 1.6;
const MARGEN_HUELLA = 0.16;
const GROSOR_HUELLA = 0.045;

const ANCHO_CONDUCTO = 0.07;
const ALTO_CONDUCTO = 0.05;
const LADO_PAQUETE = 0.16;
const VELOCIDAD_PAQUETE = 1.4;
const INTERVALO_PAQUETE = 0.9;
const ESPACIO_PAQUETE = VELOCIDAD_PAQUETE * INTERVALO_PAQUETE;
/** Cada sentido va por su carril para que los paquetes no se atraviesen. */
const CARRIL = 0.085;
const DESVANECER_PAQUETE = 0.2;

// ---------------------------------------------------------------- tipos internos

interface Punto {
  x: number;
  z: number;
}

interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

interface AristaNave {
  material: LineBasicMaterial;
  /** Color de reposo; puede ser compartido (tinta) y se refresca en sitio. */
  base: Color;
  opacidad: number;
}

interface Nave {
  nodo: NodoMapa;
  grupo: Group;
  rellenos: Array<MeshLambertMaterial | MeshBasicMaterial>;
  aristas: AristaNave[];
  franja: MeshBasicMaterial | null;
  baliza: Object3D | null;
  materialBaliza: MeshBasicMaterial | null;
  huella: Object3D;
  materialHuella: MeshBasicMaterial;
  opacidadHuella: number;
  colorMarca: Color;
  colorCuerpo: Color;
  colorAclarado: Color;
  resalte: number;
  fase: number;
  etiqueta: PosicionEtiqueta;
}

interface Carril {
  x: number[];
  z: number[];
  acumulado: number[];
  largo: number;
  cantidad: number;
  fase: number;
}

interface Entrada {
  desde: Vector3;
  destino: Vector3;
  distanciaDesde: number;
  distanciaDestino: number;
  inicio: number;
  progreso: number;
  resolver: () => void;
  resuelta: boolean;
  temporizador: number;
}

interface ColorLeido {
  r: number;
  g: number;
  b: number;
  a: number;
}

// ---------------------------------------------------------------- escena

export function crearEcosistema(op: OpcionesEcosistema): EscenaEcosistema {
  const { lienzo, reducido } = op;
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

  // Intensidades ×π (luces físicas): techo ≈ color de marca exacto, caras laterales más oscuras.
  escena.add(new HemisphereLight(0xffffff, new Color().setRGB(0.4, 0.4, 0.4), Math.PI * 0.7));
  const luz = new DirectionalLight(0xffffff, Math.PI * 0.4);
  luz.position.set(2.5, 7.5, 6);
  escena.add(luz);

  const tinta = new Color();
  const tinta3 = new Color();
  const gris = new Color();
  const blanco = new Color(1, 1, 1);
  const hsl = { h: 0, s: 0, l: 0 };

  // ---- piso
  const matReticula = registrar(new LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
  const matReticulaMayor = registrar(
    new LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }),
  );
  escena.add(new LineSegments(registrar(geometriaReticula(false)), matReticula));
  escena.add(new LineSegments(registrar(geometriaReticula(true)), matReticulaMayor));

  // ---- naves
  const cajaSeleccion = registrar(new BoxGeometry(1, 1, 1).translate(0, 0.5, 0));
  const matSeleccion = registrar(new MeshBasicMaterial());
  const geoBaliza = registrar(new BoxGeometry(LADO_BALIZA, LADO_BALIZA, LADO_BALIZA));

  const naves: Nave[] = [];
  const porId = new Map<string, Nave>();
  const porSeleccion = new Map<Object3D, Nave>();
  const selecciones: Object3D[] = [];
  const posiciones: Record<string, PosicionEtiqueta> = {};
  const puntosEncuadre: Vector3[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let altoMax = 0;

  for (const nodo of op.nodos) {
    if (porId.has(nodo.id)) continue;
    const nave = construirNave(nodo, naves.length);
    naves.push(nave);
    porId.set(nodo.id, nave);
    posiciones[nodo.id] = nave.etiqueta;

    const mx = nodo.ancho / 2;
    const mz = nodo.fondo / 2;
    const techo = nodo.alto + HOLGURA_TECHO;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        puntosEncuadre.push(new Vector3(nodo.x + sx * mx, 0, nodo.z + sz * mz));
        puntosEncuadre.push(new Vector3(nodo.x + sx * mx, techo, nodo.z + sz * mz));
      }
    }
    minX = Math.min(minX, nodo.x - mx);
    maxX = Math.max(maxX, nodo.x + mx);
    minZ = Math.min(minZ, nodo.z - mz);
    maxZ = Math.max(maxZ, nodo.z + mz);
    altoMax = Math.max(altoMax, techo);
  }

  function construirNave(nodo: NodoMapa, indice: number): Nave {
    const grupo = new Group();
    grupo.position.set(nodo.x, 0, nodo.z);
    escena.add(grupo);

    // La huella queda fuera del grupo: no sube al resaltar.
    const materialHuella = registrar(new MeshBasicMaterial({ transparent: true, depthWrite: false }));
    const huella = new Mesh(
      registrar(marcoRect(nodo.ancho / 2 + MARGEN_HUELLA, nodo.fondo / 2 + MARGEN_HUELLA, GROSOR_HUELLA)),
      materialHuella,
    );
    huella.position.set(nodo.x, 0.004, nodo.z);
    escena.add(huella);

    const nave: Nave = {
      nodo,
      grupo,
      rellenos: [],
      aristas: [],
      franja: null,
      baliza: null,
      materialBaliza: null,
      huella,
      materialHuella,
      opacidadHuella: nodo.estado === 'inactivo' ? 0.2 : 0.3,
      colorMarca: new Color(),
      colorCuerpo: new Color(),
      colorAclarado: new Color(),
      resalte: 0,
      fase: (indice * 0.23) % 1,
      etiqueta: { x: 0, y: 0, visible: false },
    };

    const prototipo = nodo.estado === 'prototipo';

    const relleno = (alto: number, y0: number, alambre: boolean): void => {
      if (alto <= 0) return;
      const opacidad = alambre ? OPACIDAD_ALAMBRE : prototipo ? OPACIDAD_PROTOTIPO : 1;
      const transparente = opacidad < 1;
      // polygonOffset empuja las caras atrás para que las aristas no parpadeen.
      const desfase = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
      const material = registrar(
        alambre
          ? new MeshBasicMaterial({ transparent: true, opacity: opacidad, depthWrite: false, ...desfase })
          : new MeshLambertMaterial({ transparent: transparente, opacity: opacidad, depthWrite: !transparente, ...desfase }),
      );
      grupo.add(new Mesh(registrar(caja(nodo.ancho, alto, nodo.fondo, y0)), material));
      nave.rellenos.push(material);
    };

    const aristas = (alto: number, y0: number, base: Color, opacidad: number): void => {
      if (alto <= 0) return;
      const molde = caja(nodo.ancho, alto, nodo.fondo, y0);
      const geometria = registrar(new EdgesGeometry(molde));
      molde.dispose();
      const material = registrar(
        prototipo
          ? new LineDashedMaterial({ dashSize: 0.14, gapSize: 0.09, transparent: true, opacity: opacidad })
          : new LineBasicMaterial({ transparent: true, opacity: opacidad }),
      );
      const lineas = new LineSegments(geometria, material);
      if (prototipo) lineas.computeLineDistances();
      grupo.add(lineas);
      nave.aristas.push({ material, base, opacidad });
    };

    // En prototipo las aristas van discontinuas en el color de marca para leerse como plano.
    const baseSolida = prototipo ? nave.colorCuerpo : tinta;
    const opacidadSolida = prototipo ? 0.8 : OPACIDAD_ARISTA_TINTA;

    switch (nodo.autoria) {
      case 'solida':
        relleno(nodo.alto, 0, false);
        aristas(nodo.alto, 0, baseSolida, opacidadSolida);
        break;
      case 'base': {
        const bajo = nodo.alto * 0.4;
        relleno(bajo, 0, false);
        aristas(bajo, 0, baseSolida, opacidadSolida);
        aristas(nodo.alto - bajo, bajo, nave.colorCuerpo, OPACIDAD_ARISTA_MARCA);
        break;
      }
      case 'alambre':
        relleno(nodo.alto, 0, true);
        aristas(nodo.alto, 0, nave.colorCuerpo, OPACIDAD_ARISTA_MARCA);
        break;
    }

    if (nodo.estado === 'produccion' || nodo.estado === 'desplegado') {
      const material = registrar(new MeshBasicMaterial());
      const baliza = new Mesh(geoBaliza, material);
      baliza.position.y = nodo.alto + 0.06 + LADO_BALIZA / 2;
      grupo.add(baliza);
      nave.baliza = baliza;
      nave.materialBaliza = material;
    }

    if (nodo.estado === 'inactivo' && nodo.alto > 0) {
      const material = registrar(new MeshBasicMaterial());
      const franja = new Mesh(
        registrar(new BoxGeometry(nodo.ancho + 0.05, Math.min(0.07, nodo.alto * 0.2), nodo.fondo + 0.05)),
        material,
      );
      franja.position.y = nodo.alto * 0.5;
      grupo.add(franja);
      nave.franja = material;
    }

    // Caja invisible de volumen completo: en 'base' y 'alambre' el relleno no cubre toda la nave.
    const seleccion = new Mesh(cajaSeleccion, matSeleccion);
    seleccion.scale.set(Math.max(nodo.ancho, 0.01), Math.max(nodo.alto, 0.01), Math.max(nodo.fondo, 0.01));
    seleccion.visible = false;
    grupo.add(seleccion);
    selecciones.push(seleccion);
    porSeleccion.set(seleccion, nave);

    return nave;
  }

  // ---- enlaces
  const cajaConducto = registrar(new BoxGeometry(1, 1, 1));
  const matConducto = registrar(new MeshLambertMaterial());
  const matPlaneado = registrar(new LineDashedMaterial({ dashSize: 0.22, gapSize: 0.16, transparent: true }));
  const carriles: Carril[] = [];

  op.enlaces.forEach((enlace, i) => {
    const a = porId.get(enlace.de);
    const b = porId.get(enlace.a);
    if (!a || !b || a === b) return;
    const ruta = rutaOrtogonal(a.nodo, b.nodo);
    if (!ruta) return;

    if (enlace.tipo === 'activo') {
      for (let s = 0; s < ruta.length - 1; s++) {
        const p = ruta[s];
        const q = ruta[s + 1];
        const dx = Math.abs(q.x - p.x);
        const dz = Math.abs(q.z - p.z);
        if (dx + dz < 1e-6) continue;
        const tramo = new Mesh(cajaConducto, matConducto);
        // Se alarga medio ancho por lado para cerrar el codo.
        tramo.scale.set(
          dx > dz ? dx + ANCHO_CONDUCTO : ANCHO_CONDUCTO,
          ALTO_CONDUCTO,
          dx > dz ? ANCHO_CONDUCTO : dz + ANCHO_CONDUCTO,
        );
        tramo.position.set((p.x + q.x) / 2, ALTO_CONDUCTO / 2, (p.z + q.z) / 2);
        escena.add(tramo);
      }
      const fase = (i * 0.37) % 1;
      carriles.push(trazarCarril(ruta, fase), trazarCarril([...ruta].reverse(), (fase + 0.5) % 1));
    } else {
      const geometria = registrar(new BufferGeometry().setFromPoints(ruta.map((p) => new Vector3(p.x, 0.015, p.z))));
      const linea = new Line(geometria, matPlaneado);
      linea.computeLineDistances();
      escena.add(linea);
    }
  });

  let totalPaquetes = 0;
  for (const c of carriles) totalPaquetes += c.cantidad;
  const matPaquete = registrar(new MeshBasicMaterial());
  const paquetes =
    totalPaquetes > 0
      ? new InstancedMesh(registrar(new BoxGeometry(LADO_PAQUETE, LADO_PAQUETE, LADO_PAQUETE)), matPaquete, totalPaquetes)
      : null;
  if (paquetes) {
    paquetes.instanceMatrix.setUsage(DynamicDrawUsage);
    paquetes.frustumCulled = false;
    escena.add(paquetes);
    registrar(paquetes);
  }

  // ---- estado de cámara y reutilizables (cero asignaciones por cuadro)
  const centro = new Vector3();
  const objetivoActual = new Vector3();
  const direccion = new Vector3();
  const ejeX = new Vector3();
  const ejeY = new Vector3();
  const ejeZ = new Vector3();
  const relativo = new Vector3();
  const proyectado = new Vector3();
  const enCarril = new Vector3();
  const matriz = new Matrix4();
  const puntero = new Vector2();
  const raycaster = new Raycaster();
  const impactos: Intersection[] = [];

  let distancia = 20;
  let distanciaActual = 20;
  let anchoCss = 0;
  let altoCss = 0;
  let tiempo = 0;
  let incX = 0;
  let incY = 0;
  let incXObjetivo = 0;
  let incYObjetivo = 0;
  let resaltado: Nave | null = null;
  let bajoPuntero: string | null = null;
  let entrada: Entrada | null = null;

  let idBucle = 0;
  let idDibujo = 0;
  let ultimo = 0;
  let enVista = false;
  let pestanaVisible = document.visibilityState !== 'hidden';
  let destruido = false;

  // ---- encuadre automático

  function ejes(az: number, el: number): void {
    direccionDesde(az, el, ejeZ);
    ejeX.set(Math.cos(az), 0, -Math.sin(az));
    ejeY.crossVectors(ejeZ, ejeX);
  }

  /** Distancia mínima para que todos los puntos quepan con el objetivo en `centro`. */
  function distanciaAjuste(az: number, el: number, tanH: number, tanV: number): number {
    ejes(az, el);
    let d = 1;
    for (let i = 0; i < puntosEncuadre.length; i++) {
      relativo.subVectors(puntosEncuadre[i], centro);
      const a = relativo.dot(ejeZ);
      d = Math.max(
        d,
        a + Math.abs(relativo.dot(ejeX)) / (tanH * MARGEN_ENCUADRE),
        a + Math.abs(relativo.dot(ejeY)) / (tanV * MARGEN_ENCUADRE),
      );
    }
    return d;
  }

  /** Desplaza el objetivo en el plano de la cámara para centrar el contenido proyectado. */
  function recentrar(az: number, el: number, d: number, tanH: number, tanV: number): void {
    ejes(az, el);
    let nx0 = Infinity;
    let nx1 = -Infinity;
    let ny0 = Infinity;
    let ny1 = -Infinity;
    for (let i = 0; i < puntosEncuadre.length; i++) {
      relativo.subVectors(puntosEncuadre[i], centro);
      const profundidad = d - relativo.dot(ejeZ);
      if (profundidad < 1e-3) continue;
      const nx = relativo.dot(ejeX) / (profundidad * tanH);
      const ny = relativo.dot(ejeY) / (profundidad * tanV);
      nx0 = Math.min(nx0, nx);
      nx1 = Math.max(nx1, nx);
      ny0 = Math.min(ny0, ny);
      ny1 = Math.max(ny1, ny);
    }
    if (!Number.isFinite(nx0) || !Number.isFinite(ny0)) return;
    centro.addScaledVector(ejeX, ((nx0 + nx1) / 2) * tanH * d).addScaledVector(ejeY, ((ny0 + ny1) / 2) * tanV * d);
  }

  function encuadrar(): void {
    const tanV = Math.tan((FOV * GRADO) / 2);
    const tanH = tanV * camara.aspect;
    if (puntosEncuadre.length === 0) {
      centro.set(0, 0, 0);
      distancia = 20;
    } else {
      centro.set((minX + maxX) / 2, altoMax * 0.3, (minZ + maxZ) / 2);
      for (let i = 0; i < 3; i++) {
        recentrar(AZIMUT_BASE, ELEVACION_BASE, distanciaAjuste(AZIMUT_BASE, ELEVACION_BASE, tanH, tanV), tanH, tanV);
      }
      // La distancia cubre los extremos de deriva e inclinación: nada se sale del cuadro.
      const holguraAz = INCLINAR_AZIMUT + (reducido ? 0 : DERIVA_AMPLITUD);
      let d = 0;
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          d = Math.max(
            d,
            distanciaAjuste(AZIMUT_BASE + i * holguraAz, ELEVACION_BASE + j * INCLINAR_ELEVACION, tanH, tanV),
          );
        }
      }
      distancia = d;
    }
    camara.far = distancia * 3 + 40;
    camara.updateProjectionMatrix();
  }

  function posicionarCamara(): void {
    const deriva = reducido ? 0 : DERIVA_AMPLITUD * Math.sin((tiempo / DERIVA_PERIODO) * Math.PI * 2);
    const az = AZIMUT_BASE + deriva + incX * INCLINAR_AZIMUT;
    const el = ELEVACION_BASE - incY * INCLINAR_ELEVACION;
    let d = distancia;
    objetivoActual.copy(centro);
    if (entrada) {
      const p = entrada.progreso;
      const e = p * p * p; // ease-in (power2.in)
      objetivoActual.lerpVectors(entrada.desde, entrada.destino, e);
      d = entrada.distanciaDesde + (entrada.distanciaDestino - entrada.distanciaDesde) * e;
    }
    distanciaActual = d;
    direccionDesde(az, el, direccion);
    camara.position.copy(objetivoActual).addScaledVector(direccion, d);
    camara.lookAt(objetivoActual);
    camara.updateMatrixWorld();
  }

  // ---- colores

  function aplicar(destino: Color, valor: string): number {
    const c = leerColor(valor);
    destino.setRGB(c.r, c.g, c.b, SRGBColorSpace);
    return c.a;
  }

  function aplicarColores(): void {
    const c = op.colores();
    matReticula.opacity = aplicar(matReticula.color, c.lineaSuave);
    matReticulaMayor.opacity = aplicar(matReticulaMayor.color, c.linea) * 0.7;
    aplicar(tinta, c.tinta);
    const alfa3 = aplicar(tinta3, c.tinta3);
    matPlaneado.color.copy(tinta3);
    matPlaneado.opacity = alfa3 * 0.9;
    tinta3.getHSL(hsl, SRGBColorSpace);
    gris.setHSL(0, 0, limitar(hsl.l, 0.4, 0.6), SRGBColorSpace);
    aplicar(matConducto.color, c.senal);
    matPaquete.color.copy(matConducto.color);

    for (const nave of naves) {
      aplicar(nave.colorMarca, nave.nodo.color);
      nave.colorCuerpo.copy(nave.colorMarca);
      if (nave.nodo.estado === 'inactivo') nave.colorCuerpo.lerp(gris, MEZCLA_INACTIVO);
      nave.colorAclarado.copy(nave.colorCuerpo).lerp(blanco, 0.4);
      for (const material of nave.rellenos) material.color.copy(nave.colorCuerpo);
      nave.franja?.color.copy(nave.colorMarca);
      nave.materialHuella.color.copy(nave.colorCuerpo);
    }
  }

  // ---- animación

  function pulso(fase: number): number {
    const s = 0.5 - 0.5 * Math.cos((tiempo / PERIODO_LATIDO + fase) * Math.PI * 2);
    return s * s;
  }

  function actualizarNaves(dt: number): void {
    const k = reducido ? 1 : 1 - Math.exp(-dt * 12);
    for (let i = 0; i < naves.length; i++) {
      const nave = naves[i];
      nave.resalte += ((nave === resaltado ? 1 : 0) - nave.resalte) * k;
      const h = nave.resalte;
      nave.grupo.position.y = SUBIDA_RESALTE * h;

      for (let j = 0; j < nave.aristas.length; j++) {
        const arista = nave.aristas[j];
        arista.material.color.copy(arista.base).lerp(nave.colorAclarado, h * 0.85);
        arista.material.opacity = arista.opacidad + (1 - arista.opacidad) * h;
      }

      const latido = !reducido && nave.nodo.estado === 'produccion' ? pulso(nave.fase) : 0;
      if (nave.baliza && nave.materialBaliza) {
        nave.baliza.scale.setScalar(1 + 0.35 * latido + 0.2 * h);
        nave.materialBaliza.color.copy(nave.colorAclarado).lerp(blanco, 0.1 + 0.35 * latido + 0.3 * h);
      }
      nave.materialHuella.opacity = nave.opacidadHuella + 0.3 * latido + 0.25 * h;
      nave.huella.scale.setScalar(1 + 0.05 * latido);
    }
  }

  function actualizarPaquetes(): void {
    if (!paquetes) return;
    let indice = 0;
    for (let c = 0; c < carriles.length; c++) {
      const carril = carriles[c];
      const ciclo = carril.cantidad * ESPACIO_PAQUETE;
      for (let k = 0; k < carril.cantidad; k++, indice++) {
        const s = (tiempo * VELOCIDAD_PAQUETE + (k + carril.fase) * ESPACIO_PAQUETE) % ciclo;
        if (s > carril.largo) {
          matriz.makeScale(0, 0, 0);
        } else {
          // Aparece y se desvanece al salir/entrar de la nave.
          const e = limitar(Math.min(s, carril.largo - s) / DESVANECER_PAQUETE, 0, 1);
          puntoEnCarril(carril, s, enCarril);
          matriz.makeScale(e, e, e).setPosition(enCarril.x, (LADO_PAQUETE / 2) * e, enCarril.z);
        }
        paquetes.setMatrixAt(indice, matriz);
      }
    }
    paquetes.instanceMatrix.needsUpdate = true;
  }

  function actualizar(dt: number): void {
    if (!reducido) tiempo += dt;
    const k = reducido ? 1 : 1 - Math.exp(-dt * 3.5);
    incX += (incXObjetivo - incX) * k;
    incY += (incYObjetivo - incY) * k;
    actualizarNaves(dt);
    actualizarPaquetes();
  }

  /** Por reloj y no por dt: el dt acotado alargaría la entrada si caen los cuadros. */
  function avanzarEntrada(ahora: number): void {
    if (!entrada || entrada.resuelta) return;
    entrada.progreso = limitar((ahora - entrada.inicio) / (DURACION_ENTRADA * 1000), entrada.progreso, 1);
  }

  function posicionarEtiquetas(): void {
    for (let i = 0; i < naves.length; i++) {
      const nave = naves[i];
      const etiqueta = nave.etiqueta;
      proyectado.set(nave.nodo.x, nave.nodo.alto + nave.grupo.position.y, nave.nodo.z).project(camara);
      const x = (proyectado.x + 1) * 0.5 * anchoCss;
      const y = (1 - proyectado.y) * 0.5 * altoCss;
      etiqueta.x = x;
      etiqueta.y = y;
      // z fuera de [-1, 1] = detrás de la cámara o fuera del volumen de vista.
      etiqueta.visible =
        proyectado.z > -1 && proyectado.z < 1 && x >= 0 && x <= anchoCss && y >= 0 && y <= altoCss;
    }
    op.alPosicionar(posiciones);
  }

  function dibujar(): void {
    if (anchoCss < 1 || altoCss < 1) return;
    posicionarCamara();
    renderer.render(escena, camara);
    posicionarEtiquetas();
  }

  function completar(e: Entrada): void {
    if (e.resuelta) return;
    e.resuelta = true;
    window.clearTimeout(e.temporizador);
    e.resolver();
  }

  function comprobarEntrada(): void {
    if (entrada && !entrada.resuelta && entrada.progreso >= 1) completar(entrada);
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
    avanzarEntrada(ahora);
    dibujar();
    comprobarEntrada();
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

  /** Un solo cuadro a demanda (movimiento reducido o bucle en pausa). */
  function solicitarDibujo(): void {
    if (destruido || idBucle || idDibujo) return;
    idDibujo = requestAnimationFrame(dibujoUnico);
  }

  function dibujoUnico(): void {
    idDibujo = 0;
    if (destruido) return;
    actualizar(0);
    avanzarEntrada(performance.now());
    dibujar();
    comprobarEntrada();
  }

  // ---- tamaño, visibilidad e interacción

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

  function idBajo(x: number, y: number): string | null {
    const w = lienzo.clientWidth;
    const h = lienzo.clientHeight;
    if (w < 1 || h < 1 || naves.length === 0) return null;
    puntero.set((x / w) * 2 - 1, -(y / h) * 2 + 1);
    raycaster.setFromCamera(puntero, camara);
    impactos.length = 0;
    raycaster.intersectObjects(selecciones, false, impactos);
    if (impactos.length === 0) return null;
    return porSeleccion.get(impactos[0].object)?.nodo.id ?? null;
  }

  function fijarResaltado(id: string | null): void {
    const nave = id === null ? null : (porId.get(id) ?? null);
    if (nave === resaltado) return;
    resaltado = nave;
    if (reducido) solicitarDibujo();
  }

  function cambiarBajoPuntero(id: string | null): void {
    if (id === bajoPuntero) return;
    bajoPuntero = id;
    lienzo.style.cursor = id === null ? '' : 'pointer';
    fijarResaltado(id);
    op.alPasar(id);
  }

  const alMover = (e: PointerEvent): void => {
    if (e.pointerType === 'touch') return; // en táctil no hay hover; el tap elige
    cambiarBajoPuntero(idBajo(e.offsetX, e.offsetY));
  };
  const alSalir = (): void => cambiarBajoPuntero(null);
  const alClic = (e: MouseEvent): void => {
    const id = idBajo(e.offsetX, e.offsetY);
    if (id !== null) op.alElegir(id);
  };
  const alCambiarVisibilidad = (): void => {
    pestanaVisible = document.visibilityState !== 'hidden';
    evaluarBucle();
  };

  lienzo.addEventListener('pointermove', alMover);
  lienzo.addEventListener('pointerleave', alSalir);
  lienzo.addEventListener('click', alClic);
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

  // Primer cuadro síncrono para que las etiquetas tengan posición desde el inicio.
  aplicarColores();
  redimensionar(padre.clientWidth, padre.clientHeight);
  actualizar(0);
  dibujar();

  return {
    resaltar(id: string | null): void {
      if (destruido) return;
      fijarResaltado(id);
    },

    inclinar(x: number, y: number): void {
      if (destruido) return;
      incXObjetivo = limitar(Number.isFinite(x) ? x : 0, -1, 1);
      incYObjetivo = limitar(Number.isFinite(y) ? y : 0, -1, 1);
      if (reducido) solicitarDibujo();
    },

    entrar(id: string): Promise<void> {
      const nave = porId.get(id);
      if (destruido || reducido || !nave) return Promise.resolve();
      if (entrada) completar(entrada);
      resaltado = nave;
      const n = nave.nodo;
      return new Promise<void>((resolver) => {
        const nueva: Entrada = {
          desde: objetivoActual.clone(),
          destino: new Vector3(n.x, n.alto * 0.5, n.z),
          distanciaDesde: distanciaActual,
          distanciaDestino: Math.max(n.ancho, n.fondo, n.alto) * 2.4 + 0.8,
          inicio: performance.now(),
          progreso: 0,
          resolver,
          resuelta: false,
          temporizador: 0,
        };
        // Respaldo: si el bucle está en pausa (pestaña oculta, fuera de vista) la promesa igual se cumple.
        nueva.temporizador = window.setTimeout(() => {
          nueva.progreso = 1;
          completar(nueva);
          solicitarDibujo();
        }, DURACION_ENTRADA * 1000 + 250);
        entrada = nueva;
        evaluarBucle();
      });
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
      lienzo.removeEventListener('pointermove', alMover);
      lienzo.removeEventListener('pointerleave', alSalir);
      lienzo.removeEventListener('click', alClic);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      if (entrada) completar(entrada);
      if (bajoPuntero !== null) lienzo.style.cursor = '';
      for (const d of desechables) d.dispose();
      desechables.length = 0;
      escena.clear();
      renderer.dispose();
    },
  };
}

// ---------------------------------------------------------------- utilidades

function limitar(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function direccionDesde(az: number, el: number, destino: Vector3): Vector3 {
  const c = Math.cos(el);
  return destino.set(c * Math.sin(az), Math.sin(el), c * Math.cos(az));
}

/** Caja con la base apoyada en y0 (no centrada). */
function caja(ancho: number, alto: number, fondo: number, y0: number): BoxGeometry {
  const g = new BoxGeometry(ancho, alto, fondo);
  g.translate(0, y0 + alto / 2, 0);
  return g;
}

/** Retícula con desvanecido radial por alfa de vértice; el color lo pone el material. */
function geometriaReticula(mayores: boolean): BufferGeometry {
  const E = RETICULA_EXTENSION;
  const posiciones: number[] = [];
  const colores: number[] = [];
  const alfa = (x: number, z: number): number => {
    const t = limitar((E - Math.hypot(x, z)) / (E * 0.5), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const tramo = (x0: number, z0: number, x1: number, z1: number): void => {
    posiciones.push(x0, 0, z0, x1, 0, z1);
    colores.push(1, 1, 1, alfa(x0, z0), 1, 1, 1, alfa(x1, z1));
  };
  for (let i = -E; i <= E; i++) {
    if ((i % 4 === 0) !== mayores) continue;
    // Segmentada por celda para que el alfa varíe a lo largo de la línea.
    for (let j = -E; j < E; j++) {
      tramo(i, j, i, j + 1);
      tramo(j, i, j + 1, i);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(posiciones, 3));
  g.setAttribute('color', new Float32BufferAttribute(colores, 4));
  return g;
}

/** Marco rectangular plano sobre el piso (huella de la nave). */
function marcoRect(mx: number, mz: number, grosor: number): ShapeGeometry {
  const forma = new Shape();
  forma.moveTo(-mx, -mz);
  forma.lineTo(mx, -mz);
  forma.lineTo(mx, mz);
  forma.lineTo(-mx, mz);
  forma.closePath();
  const ix = Math.max(mx - grosor, 0.01);
  const iz = Math.max(mz - grosor, 0.01);
  const hueco = new Path();
  hueco.moveTo(-ix, -iz);
  hueco.lineTo(-ix, iz);
  hueco.lineTo(ix, iz);
  hueco.lineTo(ix, -iz);
  hueco.closePath();
  forma.holes.push(hueco);
  const g = new ShapeGeometry(forma);
  g.rotateX(-Math.PI / 2);
  return g;
}

// ---- ruteo de conductos

function rectDe(n: NodoMapa): Rect {
  return { x0: n.x - n.ancho / 2, x1: n.x + n.ancho / 2, z0: n.z - n.fondo / 2, z1: n.z + n.fondo / 2 };
}

function dentro(p: Punto, r: Rect): boolean {
  const e = 1e-6;
  return p.x >= r.x0 - e && p.x <= r.x1 + e && p.z >= r.z0 - e && p.z <= r.z1 + e;
}

function largoTramo(p: Punto, q: Punto): number {
  return Math.abs(q.x - p.x) + Math.abs(q.z - p.z); // tramos ortogonales
}

function largoRuta(ruta: Punto[]): number {
  let total = 0;
  for (let i = 0; i < ruta.length - 1; i++) total += largoTramo(ruta[i], ruta[i + 1]);
  return total;
}

/** Distancia recorrida desde el inicio hasta salir del rectángulo (el inicio está dentro). */
function salidaDe(ruta: Punto[], r: Rect): number {
  let acumulado = 0;
  for (let i = 0; i < ruta.length - 1; i++) {
    const p = ruta[i];
    const q = ruta[i + 1];
    if (dentro(q, r)) {
      acumulado += largoTramo(p, q);
      continue;
    }
    if (q.x !== p.x) return acumulado + Math.abs((q.x > p.x ? r.x1 : r.x0) - p.x);
    return acumulado + Math.abs((q.z > p.z ? r.z1 : r.z0) - p.z);
  }
  return acumulado;
}

function puntoEnRuta(ruta: Punto[], d: number): Punto {
  let acumulado = 0;
  for (let i = 0; i < ruta.length - 1; i++) {
    const p = ruta[i];
    const q = ruta[i + 1];
    const largo = largoTramo(p, q);
    if (d <= acumulado + largo || i === ruta.length - 2) {
      const t = largo > 0 ? limitar((d - acumulado) / largo, 0, 1) : 0;
      return { x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t };
    }
    acumulado += largo;
  }
  return { x: ruta[0].x, z: ruta[0].z };
}

/** Ruta en ángulo recto (primero en x, luego en z), recortada a las caras de ambas naves. */
function rutaOrtogonal(a: NodoMapa, b: NodoMapa): Punto[] | null {
  const bruta: Punto[] = [{ x: a.x, z: a.z }];
  if (a.x !== b.x && a.z !== b.z) bruta.push({ x: b.x, z: a.z });
  bruta.push({ x: b.x, z: b.z });
  const total = largoRuta(bruta);
  if (total < 1e-6) return null;
  const d0 = salidaDe(bruta, rectDe(a));
  const d1 = total - salidaDe([...bruta].reverse(), rectDe(b));
  if (d1 - d0 < 0.1) return null;

  const ruta: Punto[] = [puntoEnRuta(bruta, d0)];
  let acumulado = 0;
  for (let i = 1; i < bruta.length - 1; i++) {
    acumulado += largoTramo(bruta[i - 1], bruta[i]);
    if (acumulado > d0 + 1e-6 && acumulado < d1 - 1e-6) ruta.push({ x: bruta[i].x, z: bruta[i].z });
  }
  ruta.push(puntoEnRuta(bruta, d1));
  return ruta;
}

/** Carril desplazado a la derecha del sentido de marcha; en el codo, inglete a 90°. */
function trazarCarril(ruta: Punto[], fase: number): Carril {
  const n = ruta.length;
  const x: number[] = [];
  const z: number[] = [];
  const normal = (p: Punto, q: Punto): Punto => {
    const largo = Math.hypot(q.x - p.x, q.z - p.z);
    return largo > 0 ? { x: -(q.z - p.z) / largo, z: (q.x - p.x) / largo } : { x: 0, z: 0 };
  };
  for (let i = 0; i < n; i++) {
    let ox = 0;
    let oz = 0;
    if (i > 0) {
      const m = normal(ruta[i - 1], ruta[i]);
      ox += m.x;
      oz += m.z;
    }
    if (i < n - 1) {
      const m = normal(ruta[i], ruta[i + 1]);
      ox += m.x;
      oz += m.z;
    }
    x.push(ruta[i].x + ox * CARRIL);
    z.push(ruta[i].z + oz * CARRIL);
  }
  const acumulado: number[] = [0];
  for (let i = 1; i < n; i++) acumulado.push(acumulado[i - 1] + Math.hypot(x[i] - x[i - 1], z[i] - z[i - 1]));
  const largo = acumulado[n - 1];
  return { x, z, acumulado, largo, cantidad: Math.max(1, Math.ceil(largo / ESPACIO_PAQUETE)), fase };
}

function puntoEnCarril(c: Carril, s: number, destino: Vector3): Vector3 {
  const ultimo = c.x.length - 1;
  for (let i = 0; i < ultimo; i++) {
    if (s <= c.acumulado[i + 1] || i === ultimo - 1) {
      const largo = c.acumulado[i + 1] - c.acumulado[i];
      const t = largo > 0 ? limitar((s - c.acumulado[i]) / largo, 0, 1) : 0;
      return destino.set(c.x[i] + (c.x[i + 1] - c.x[i]) * t, 0, c.z[i] + (c.z[i + 1] - c.z[i]) * t);
    }
  }
  return destino.set(c.x[0], 0, c.z[0]);
}

// ---- lectura de colores CSS

/**
 * Convierte cualquier color CSS (hex, rgb, oklch, color-mix, var(--token)…) a sRGB + alfa
 * apoyándose en un canvas 2D, porque Color.setStyle de three no entiende la sintaxis moderna.
 */
function crearLectorColor(referencia: Element): (valor: string) => ColorLeido {
  const cache = new Map<string, ColorLeido>();
  const auxiliar = document.createElement('canvas');
  auxiliar.width = 1;
  auxiliar.height = 1;
  const ctx = auxiliar.getContext('2d', { willReadFrequently: true });
  const negro: ColorLeido = { r: 0, g: 0, b: 0, a: 1 };

  return (valor: string): ColorLeido => {
    const css = resolverVariable(valor.trim(), referencia);
    const previo = cache.get(css);
    if (previo) return previo;
    let leido = negro;
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = css;
      const serializado = ctx.fillStyle;
      if (typeof serializado === 'string') leido = deSerializado(serializado) ?? dePixel(ctx);
    }
    cache.set(css, leido);
    return leido;
  };
}

function resolverVariable(valor: string, referencia: Element): string {
  const m = /^var\(\s*(--[^,\s)]+)\s*(?:,\s*(.*))?\)$/.exec(valor) ?? /^(--[\w-]+)$/.exec(valor);
  if (!m) return valor;
  const resuelto = getComputedStyle(referencia).getPropertyValue(m[1]).trim();
  return resuelto || (m[2] ?? '').trim();
}

function deSerializado(s: string): ColorLeido | null {
  if (/^#[0-9a-f]{6}$/i.test(s)) {
    const n = parseInt(s.slice(1), 16);
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 };
  }
  const m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(s);
  if (!m) return null;
  return { r: Number(m[1]) / 255, g: Number(m[2]) / 255, b: Number(m[3]) / 255, a: m[4] ? Number(m[4]) : 1 };
}

/** Último recurso (espacios de color que el canvas serializa tal cual, p. ej. oklch). */
function dePixel(ctx: CanvasRenderingContext2D): ColorLeido {
  ctx.globalCompositeOperation = 'copy';
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return { r: (d[0] ?? 0) / 255, g: (d[1] ?? 0) / 255, b: (d[2] ?? 0) / 255, a: (d[3] ?? 255) / 255 };
}
