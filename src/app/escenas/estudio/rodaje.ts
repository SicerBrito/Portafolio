/**
 * "La tira de película": la cadena del motor en 3D, de izquierda a derecha.
 * Documento → guion por escenas → Chromium que se fotografía → cinta de fotogramas → embudo FFmpeg → MP4.
 * Lo diseñado y no construido (guion, ilustraciones, voz, clase en AHDO) va en trazo de plano punteado.
 *
 * Como el motor, la escena es una función pura del progreso (0..1): el mismo scroll da siempre
 * la misma imagen. Solo la cámara se suaviza y se inclina con el mouse o el giroscopio.
 * Independiente de Angular: el anfitrión la carga con import() solo en el navegador.
 */
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Fog,
  GridHelper,
  Group,
  HemisphereLight,
  LatheGeometry,
  Line,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Scene,
  Shape,
  ShapeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three';
import { ULTIMO_FOTOGRAMA, rebote } from '../../mundos/estudio/motor';
import {
  CELDA,
  crearCinta,
  crearDiapositiva,
  crearLienzo2d,
  crearPaginaPdf,
  crearTarjeta,
  dibujarEspera,
  dibujarFotograma,
  type ColoresDibujo,
} from './dibujos';

// ---------------------------------------------------------------- contrato

export type AnclaRodaje =
  'documento' | 'guion' | 'ilustracion' | 'chromium' | 'cinta' | 'voz' | 'ffmpeg' | 'mp4' | 'ahdo';

export interface PosicionAncla {
  x: number;
  y: number;
  visible: boolean;
}

export interface ColoresRodaje extends ColoresDibujo {
  linea: string;
  superficie2: string;
}

export interface OpcionesRodaje {
  lienzo: HTMLCanvasElement;
  reducido: boolean;
  colores: ColoresRodaje;
  /** Px CSS relativos al lienzo. El objeto se reutiliza entre cuadros: léelo en el momento. */
  alPosicionar: (pos: Readonly<Record<AnclaRodaje, PosicionAncla>>) => void;
  /** El fotograma que el Chromium está fotografiando, o null fuera de la captura. */
  alFotograma: (f: number | null) => void;
}

export interface EscenaRodaje {
  progreso(p: number): void;
  inclinar(x: number, y: number): void;
  destruir(): void;
}

// ---------------------------------------------------------------- guion de la escena

/** La captura ocurre en esta franja del progreso: 300 fotogramas, 24 fogonazos visibles. */
const CAPTURA = { desde: 0.36, hasta: 0.64 };
const FOGONAZOS = 24;
const LISTA = 0.33;
/** Lo que muestra la pantalla antes de la captura (los fotogramas son 0..299). */
const ESPERA = -2;
const LISTA_PINTADA = -1;

const ANCLAS: AnclaRodaje[] = [
  'documento',
  'guion',
  'ilustracion',
  'chromium',
  'cinta',
  'voz',
  'ffmpeg',
  'mp4',
  'ahdo',
];

/** Desde qué progreso existe cada pieza (su etiqueta no se muestra antes). */
const APARECE: Record<AnclaRodaje, number> = {
  documento: 0,
  guion: 0.15,
  ilustracion: 0.3,
  chromium: 0,
  cinta: 0.4,
  voz: 0.66,
  ffmpeg: 0,
  mp4: 0.86,
  ahdo: 0.9,
};

/** Recorrido de la cámara: posición y punto mirado en cada momento. */
const CAMINO: { p: number; pos: [number, number, number]; mira: [number, number, number] }[] = [
  { p: 0, pos: [-8.6, 0.7, 6.6], mira: [-8.6, 0, 0] },
  { p: 0.14, pos: [-7.6, 0.9, 7.2], mira: [-7.4, 0, 0] },
  { p: 0.27, pos: [-4.6, 1, 7.6], mira: [-4.8, 0, 0] },
  { p: 0.36, pos: [-0.9, 1, 7], mira: [-0.6, 0, 0] },
  { p: 0.52, pos: [1.2, 0.6, 7.8], mira: [1.4, -0.4, 0] },
  { p: 0.66, pos: [4.6, 0.8, 7.6], mira: [4.8, -0.5, 0] },
  { p: 0.8, pos: [7.4, 1.1, 7.4], mira: [7.4, -0.2, 0] },
  { p: 0.9, pos: [10, 0.6, 6.6], mira: [10, -0.3, 0] },
  { p: 1, pos: [2.4, 4.4, 24.5], mira: [2.4, -0.4, 0] },
];

const acotar = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const suavizar = (t: number) => t * t * (3 - 2 * t);
const tramo = (p: number, a: number, b: number) => suavizar(acotar((p - a) / (b - a)));

// ---------------------------------------------------------------- escena

export function crearRodaje(op: OpcionesRodaje): EscenaRodaje {
  const { lienzo, reducido, colores: c } = op;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const renderer = new WebGLRenderer({
    canvas: lienzo,
    antialias: dpr < 2,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const desechables: { dispose(): void }[] = [];
  const reg = <T extends { dispose(): void }>(d: T): T => {
    desechables.push(d);
    return d;
  };
  const textura = (lienzo2d: HTMLCanvasElement): CanvasTexture => {
    const t = reg(new CanvasTexture(lienzo2d));
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };

  const escena = new Scene();
  const niebla = new Fog(new Color(c.lienzo), 18, 40);
  escena.fog = niebla;
  const camara = new PerspectiveCamera(36, 1, 0.1, 90);

  escena.add(new HemisphereLight(0xffffff, new Color(c.lienzo), 2.2));
  const sol = new DirectionalLight(0xffffff, 1.6);
  sol.position.set(4, 8, 6);
  escena.add(sol);

  const piso = new GridHelper(48, 48, new Color(c.linea), new Color(c.superficie2));
  piso.position.set(2, -2.6, 0);
  const pisoMat = piso.material as Material;
  pisoMat.transparent = true;
  pisoMat.opacity = 0.7;
  reg(piso.geometry);
  reg(pisoMat);
  escena.add(piso);

  const lila = new Color(c.lila);
  const plano = (opacidad = 0.85) =>
    reg(
      new LineDashedMaterial({
        color: lila,
        dashSize: 0.09,
        gapSize: 0.07,
        transparent: true,
        opacity: opacidad,
      }),
    );
  const borde = (geo: BufferGeometry, mat: Material): LineSegments => {
    const l = new LineSegments(reg(new EdgesGeometry(geo)), mat);
    l.computeLineDistances();
    return l;
  };
  const linea = (puntos: Vector3[], mat: Material): Line => {
    const l = new Line(reg(new BufferGeometry().setFromPoints(puntos)), mat);
    l.computeLineDistances();
    return l;
  };

  // ---------- 1. Documento: dos páginas de PDF y una diapositiva
  const documento = new Group();
  documento.position.set(-8.6, -0.1, 0);
  const texPdf = textura(crearPaginaPdf(c));
  const texPptx = textura(crearDiapositiva(c));
  const geoPagina = reg(new PlaneGeometry(1.55, 2));
  const geoDiapo = reg(new PlaneGeometry(2.3, 1.29));
  const matPdf = reg(new MeshBasicMaterial({ map: texPdf, side: DoubleSide }));
  const matPptx = reg(new MeshBasicMaterial({ map: texPptx, side: DoubleSide }));
  const paginas = [
    new Mesh(geoPagina, matPdf),
    new Mesh(geoPagina, matPdf),
    new Mesh(geoDiapo, matPptx),
  ];
  paginas.forEach((m) => documento.add(m));
  escena.add(documento);

  // ---------- 2. Guion por escenas (diseñado): tarjetas en trazo de plano
  const guion = new Group();
  guion.position.set(-4.8, 0, 0);
  const TARJETAS = [
    ['e01', 'titulo', 'Trabajo seguro en alturas'],
    ['e02', 'bullets', 'Revisa el arnés'],
    ['e03', 'bullets', 'Ancla a un punto firme'],
    ['e04', 'bullets', 'Nunca subas solo'],
    ['e05', 'titulo', 'Fin del módulo 1'],
  ] as const;
  const geoTarjeta = reg(new PlaneGeometry(2.1, 0.68));
  const tarjetas = TARJETAS.map(([id, tipo, texto], i) => {
    const g = new Group();
    const mat = reg(
      new MeshBasicMaterial({
        map: textura(crearTarjeta(c, id, tipo, texto)),
        transparent: true,
        depthWrite: false,
      }),
    );
    const matBorde = plano();
    g.add(new Mesh(geoTarjeta, mat), borde(geoTarjeta, matBorde));
    g.userData = { i, mat, matBorde };
    guion.add(g);
    return g;
  });
  const enlaceGuion = linea([new Vector3(-7.7, 0, 0), new Vector3(-5.95, 0, 0)], plano(0.7));
  escena.add(guion, enlaceGuion);

  // ---------- 3. Chromium sin ventana, con su cámara encima
  const chromium = new Group();
  chromium.position.set(-0.6, 0, 0);
  const geoCuerpo = reg(new BoxGeometry(3.7, 2.45, 0.14));
  chromium.add(
    new Mesh(geoCuerpo, reg(new MeshLambertMaterial({ color: new Color(c.inspector) }))),
  );
  chromium.add(
    borde(geoCuerpo, reg(new LineBasicMaterial({ color: lila, transparent: true, opacity: 0.55 }))),
  );
  const barraNav = new Mesh(
    reg(new PlaneGeometry(3.7, 0.3)),
    reg(new MeshBasicMaterial({ color: new Color(c.superficie2) })),
  );
  barraNav.position.set(0, 1.075, 0.071);
  chromium.add(barraNav);
  const geoPunto = reg(new CircleGeometry(0.05, 16));
  const matPunto = reg(new MeshBasicMaterial({ color: lila }));
  for (let i = 0; i < 3; i++) {
    const punto = new Mesh(geoPunto, matPunto);
    punto.position.set(-1.65 + i * 0.16, 1.075, 0.073);
    chromium.add(punto);
  }
  const direccion = new Mesh(
    reg(new PlaneGeometry(1.7, 0.15)),
    reg(new MeshBasicMaterial({ color: new Color(c.inspector) })),
  );
  direccion.position.set(0.1, 1.075, 0.073);
  chromium.add(direccion);

  const PANTALLA = { ancho: 3.4, alto: 3.4 * (9 / 16) };
  const pantalla2d = crearLienzo2d(512, 288);
  const texPantalla = textura(pantalla2d.lienzo);
  const geoPantalla = reg(new PlaneGeometry(PANTALLA.ancho, PANTALLA.alto));
  const pantalla = new Mesh(geoPantalla, reg(new MeshBasicMaterial({ map: texPantalla })));
  pantalla.position.set(0, -0.12, 0.072);
  chromium.add(pantalla);
  const matFogonazo = reg(
    new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  const fogonazo = new Mesh(geoPantalla, matFogonazo);
  fogonazo.position.set(0, -0.12, 0.076);
  chromium.add(fogonazo);

  // La cámara de Playwright: cuerpo, lente apuntando a la pantalla y bombillo que destella.
  const camaraFoto = new Group();
  camaraFoto.position.set(0.9, 1.5, 1.15);
  camaraFoto.scale.setScalar(0.85);
  camaraFoto.rotation.set(-0.55, 0.4, 0, 'YXZ');
  camaraFoto.add(
    new Mesh(
      reg(new BoxGeometry(0.62, 0.38, 0.34)),
      reg(new MeshLambertMaterial({ color: new Color(c.superficie2) })),
    ),
  );
  const lente = new Mesh(
    reg(new CylinderGeometry(0.13, 0.15, 0.24, 20)),
    reg(new MeshLambertMaterial({ color: new Color(c.inspector) })),
  );
  lente.rotation.x = Math.PI / 2;
  lente.position.set(0, 0, -0.27);
  camaraFoto.add(lente);
  const colorLila = new Color(c.lila);
  const blanco = new Color(0xffffff);
  const matBombillo = reg(new MeshBasicMaterial({ color: colorLila.clone() }));
  const bombillo = new Mesh(reg(new BoxGeometry(0.2, 0.08, 0.1)), matBombillo);
  bombillo.position.set(0.16, 0.24, 0);
  camaraFoto.add(bombillo);
  chromium.add(camaraFoto);
  escena.add(chromium);

  // Ilustraciones por escena (diseñado): un marco punteado que bajaría a la plantilla.
  const ilustracion = new Group();
  ilustracion.position.set(-2.9, 2.35, -0.6);
  const geoMarco = reg(new PlaneGeometry(1.5, 0.84));
  ilustracion.add(borde(geoMarco, plano()));
  ilustracion.add(
    linea(
      [
        new Vector3(-0.6, -0.3, 0),
        new Vector3(-0.2, 0.12, 0),
        new Vector3(0.1, -0.12, 0),
        new Vector3(0.35, 0.05, 0),
        new Vector3(0.62, -0.3, 0),
      ],
      plano(),
    ),
  );
  ilustracion.add(linea([new Vector3(0.75, -0.2, 0), new Vector3(2.0, -1.0, 0.6)], plano(0.6)));
  escena.add(ilustracion);

  // ---------- 4. La cinta: una banda que sigue una curva y se llena de fotogramas
  const curva = new CatmullRomCurve3([
    new Vector3(1.35, -0.15, 0.3),
    new Vector3(2.5, -1.35, 0.75),
    new Vector3(3.9, -1.7, 0.6),
    new Vector3(5.25, -1.05, 0.2),
    new Vector3(6.3, -0.45, 0),
    new Vector3(7.1, -0.4, 0),
  ]);
  const ANCHO_CINTA = 0.62;
  const largoCelda = ANCHO_CINTA * (CELDA.ancho / CELDA.alto);
  const FOTOS_CINTA = [45, 120, 195, 270];
  const SEGMENTOS = 180;
  const largo = curva.getLength();
  const repeticiones = largo / (largoCelda * FOTOS_CINTA.length);
  const posiciones = new Float32Array((SEGMENTOS + 1) * 2 * 3);
  const uvs = new Float32Array((SEGMENTOS + 1) * 2 * 2);
  const indices: number[] = [];
  const punto = new Vector3();
  const tangente = new Vector3();
  const lado = new Vector3();
  const frente = new Vector3(0, 0, 1);
  for (let i = 0; i <= SEGMENTOS; i++) {
    const u = i / SEGMENTOS;
    curva.getPointAt(u, punto);
    curva.getTangentAt(u, tangente);
    lado
      .crossVectors(tangente, frente)
      .normalize()
      .multiplyScalar(ANCHO_CINTA / 2);
    posiciones.set([punto.x + lado.x, punto.y + lado.y, punto.z + lado.z], i * 6);
    posiciones.set([punto.x - lado.x, punto.y - lado.y, punto.z - lado.z], i * 6 + 3);
    uvs.set([u * repeticiones, 0, u * repeticiones, 1], i * 4);
    if (i < SEGMENTOS) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geoCinta = reg(new BufferGeometry());
  geoCinta.setAttribute('position', new BufferAttribute(posiciones, 3));
  geoCinta.setAttribute('uv', new BufferAttribute(uvs, 2));
  geoCinta.setIndex(indices);
  const texCinta = textura(crearCinta(c, FOTOS_CINTA));
  texCinta.wrapS = RepeatWrapping;
  const cinta = new Mesh(geoCinta, reg(new MeshBasicMaterial({ map: texCinta, side: DoubleSide })));
  escena.add(cinta);

  // El fotograma recién tomado vuela de la pantalla al inicio de la cinta.
  const foto = new Mesh(
    geoPantalla,
    reg(new MeshBasicMaterial({ map: texPantalla, side: DoubleSide })),
  );
  escena.add(foto);
  const origenFoto = new Vector3(-0.6, -0.12, 0.1);
  const destinoFoto = curva.getPointAt(0.015);

  // ---------- 5. FFmpeg: el embudo
  const ffmpeg = new Group();
  ffmpeg.position.set(7.9, -0.4, 0);
  const perfil = [
    new Vector2(0.16, -1.15),
    new Vector2(0.18, -0.55),
    new Vector2(0.32, -0.15),
    new Vector2(0.85, 0.45),
    new Vector2(1.25, 0.95),
  ];
  const geoEmbudo = reg(new LatheGeometry(perfil, 28));
  const embudo = new Group();
  // Primero gira sobre su propio eje (y) y después se acuesta (z): orden ZYX.
  embudo.rotation.order = 'ZYX';
  embudo.rotation.z = Math.PI / 2;
  embudo.add(
    new Mesh(
      geoEmbudo,
      reg(
        new MeshLambertMaterial({
          color: new Color(c.morado),
          transparent: true,
          opacity: 0.55,
          side: DoubleSide,
          depthWrite: false,
          forceSinglePass: true,
        }),
      ),
    ),
  );
  embudo.add(
    new Mesh(
      geoEmbudo,
      reg(
        new MeshBasicMaterial({ color: lila, wireframe: true, transparent: true, opacity: 0.22 }),
      ),
    ),
  );
  ffmpeg.add(embudo);
  escena.add(ffmpeg);

  // La voz narrada (diseñado): una onda punteada que bajaría al embudo.
  const voz = new Group();
  const onda: Vector3[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    onda.push(
      new Vector3(
        5.4 + t * 2.2,
        2.25 + Math.sin(t * Math.PI * 7) * 0.22 * Math.sin(t * Math.PI),
        -0.2,
      ),
    );
  }
  voz.add(linea(onda, plano()));
  voz.add(linea([new Vector3(7.6, 2.25, -0.2), new Vector3(8.1, -0.1, 0)], plano(0.6)));
  escena.add(voz);

  // ---------- 6. El MP4 y, más allá, la clase en AHDO (diseñado)
  const mp4 = new Group();
  mp4.position.set(10.2, -0.4, 0);
  const geoArchivo = reg(new BoxGeometry(1.5, 1, 0.18));
  mp4.add(new Mesh(geoArchivo, reg(new MeshLambertMaterial({ color: new Color(c.morado) }))));
  mp4.add(borde(geoArchivo, reg(new LineBasicMaterial({ color: lila }))));
  const triangulo = new Shape();
  triangulo.moveTo(-0.16, -0.22);
  triangulo.lineTo(0.24, 0);
  triangulo.lineTo(-0.16, 0.22);
  triangulo.closePath();
  const play = new Mesh(
    reg(new ShapeGeometry(triangulo)),
    reg(new MeshBasicMaterial({ color: 0xffffff })),
  );
  play.position.z = 0.095;
  mp4.add(play);
  escena.add(mp4);

  const ahdo = new Group();
  ahdo.position.set(13.2, -0.4, 0);
  const geoClase = reg(new BoxGeometry(1.9, 1.25, 0.2));
  ahdo.add(borde(geoClase, plano()));
  ahdo.add(linea([new Vector3(-0.55, 0.25, 0.1), new Vector3(0.55, 0.25, 0.1)], plano()));
  ahdo.add(linea([new Vector3(-0.55, 0, 0.1), new Vector3(0.35, 0, 0.1)], plano()));
  ahdo.add(linea([new Vector3(-0.55, -0.25, 0.1), new Vector3(0.15, -0.25, 0.1)], plano()));
  const enlaceAhdo = linea([new Vector3(11.05, -0.4, 0), new Vector3(12.2, -0.4, 0)], plano(0.6));
  escena.add(ahdo, enlaceAhdo);

  // ---------------------------------------------------------------- anclas de las etiquetas

  const anclaMundo: Record<AnclaRodaje, Vector3> = {
    documento: new Vector3(-8.6, 1.35, 0),
    guion: new Vector3(-4.8, 2.05, 0),
    ilustracion: new Vector3(-2.9, 2.9, -0.6),
    chromium: new Vector3(-0.6, 1.45, 0),
    cinta: new Vector3(3.9, -2.15, 0.6),
    voz: new Vector3(6.5, 2.75, -0.2),
    ffmpeg: new Vector3(7.9, 1.05, 0),
    mp4: new Vector3(10.2, 0.4, 0),
    ahdo: new Vector3(13.2, 0.55, 0),
  };
  const posicion = {} as Record<AnclaRodaje, PosicionAncla>;
  for (const id of ANCLAS) posicion[id] = { x: 0, y: 0, visible: false };
  const proyectado = new Vector3();

  // ---------------------------------------------------------------- estado

  let p = 0;
  let ancho = 1;
  let alto = 1;
  /** Qué tiene pintado la pantalla del Chromium: ESPERA, LISTA o el número de fotograma. */
  let ultimoDibujo = Number.NaN;
  const posObjetivo = new Vector3();
  const miraObjetivo = new Vector3();
  const mira = new Vector3();
  const inclinacion = { x: 0, y: 0 };
  let primerCuadro = true;
  let sucio = true;

  /** El escenario completo en el progreso p. Nada aquí depende del reloj. */
  function aplicar(): void {
    // Documento: las páginas se abren en abanico.
    const abre = tramo(p, 0, 0.12);
    for (let i = 0; i < paginas.length; i++) {
      const m = paginas[i];
      const d = i - 1;
      m.position.set(d * 0.55 * abre, d * -0.05 * abre, -0.02 * i + 0.08 * abre * i);
      m.rotation.set(0, -0.25 * abre * d, d * 0.12 * abre);
    }

    // Guion: cada tarjeta sale del documento y toma su lugar.
    for (const g of tarjetas) {
      const i = g.userData['i'] as number;
      const t = tramo(p, 0.13 + i * 0.022, 0.2 + i * 0.022);
      g.position.set(-3.6 * (1 - t), (1.5 - i * 0.75) * t, 0.05 * i);
      g.scale.setScalar(0.4 + 0.6 * t);
      (g.userData['mat'] as MeshBasicMaterial).opacity = t;
      (g.userData['matBorde'] as LineDashedMaterial).opacity = 0.85 * t;
      g.visible = t > 0.001;
    }
    enlaceGuion.visible = p > 0.13;

    // Captura: la pantalla muestra el fotograma que se está fotografiando.
    const q = acotar((p - CAPTURA.desde) / (CAPTURA.hasta - CAPTURA.desde));
    const capturando = p > CAPTURA.desde && p < CAPTURA.hasta;
    const fotograma = Math.round(q * ULTIMO_FOTOGRAMA);
    // Un número y no un texto: aplicar() corre en cada paso del scroll y no debe crear cadenas.
    const clave = p < LISTA ? ESPERA : p < CAPTURA.desde ? LISTA_PINTADA : fotograma;
    if (clave !== ultimoDibujo) {
      ultimoDibujo = clave;
      if (clave === ESPERA) dibujarEspera(pantalla2d.ctx, c, 512, 288, 'cargando fuentes…');
      else if (clave === LISTA_PINTADA)
        dibujarEspera(pantalla2d.ctx, c, 512, 288, 'plantillaLista = true');
      else dibujarFotograma(pantalla2d.ctx, c, fotograma, 0, 0, 512, 288, true);
      texPantalla.needsUpdate = true;
      op.alFotograma(clave >= 0 ? fotograma : null);
    }

    const disparo = q * FOGONAZOS;
    const fase = disparo - Math.floor(disparo);
    const destello = capturando ? Math.pow(1 - fase, 6) : 0;
    matFogonazo.opacity = destello * 0.75;
    matBombillo.color.copy(colorLila).lerp(blanco, destello);

    // El fotograma vuela en arco hasta la cinta.
    foto.visible = capturando;
    if (capturando) {
      const t = suavizar(fase);
      foto.position.lerpVectors(origenFoto, destinoFoto, t);
      foto.position.y += Math.sin(Math.PI * t) * 0.7;
      foto.position.z += Math.sin(Math.PI * t) * 0.9;
      foto.scale.setScalar(1 - 0.74 * t);
      foto.rotation.set(0, 0, -0.35 * Math.sin(Math.PI * t));
    }

    // La cinta crece con cada foto y corre hacia el embudo.
    const crece = tramo(p, CAPTURA.desde, CAPTURA.hasta - 0.02);
    geoCinta.setDrawRange(0, Math.floor(crece * SEGMENTOS) * 6);
    cinta.visible = crece > 0;
    texCinta.offset.x = -p * 9;

    // FFmpeg gira mientras traga la cinta; la voz punteada aparece encima.
    embudo.rotation.y = p * 7;
    voz.visible = p > APARECE.voz;
    ilustracion.visible = p > APARECE.ilustracion;

    // Sale el MP4 con el rebote del motor; luego la clase en AHDO, en plano.
    const sale = acotar((p - 0.84) / 0.1);
    mp4.visible = sale > 0;
    mp4.position.x = 8.6 + 1.6 * suavizar(sale);
    mp4.scale.setScalar(Math.max(0.001, rebote(sale)));
    mp4.rotation.y = (1 - sale) * Math.PI;
    ahdo.visible = p > APARECE.ahdo;
    enlaceAhdo.visible = ahdo.visible;
    anclaMundo.mp4.x = mp4.position.x;

    // Cámara: tramos suaves entre los momentos del camino.
    let i = 0;
    while (i < CAMINO.length - 2 && p > CAMINO[i + 1].p) i++;
    const a = CAMINO[i];
    const b = CAMINO[i + 1];
    const t = tramo(p, a.p, b.p);
    posObjetivo.set(
      a.pos[0] + (b.pos[0] - a.pos[0]) * t,
      a.pos[1] + (b.pos[1] - a.pos[1]) * t,
      a.pos[2] + (b.pos[2] - a.pos[2]) * t,
    );
    miraObjetivo.set(
      a.mira[0] + (b.mira[0] - a.mira[0]) * t,
      a.mira[1] + (b.mira[1] - a.mira[1]) * t,
      a.mira[2] + (b.mira[2] - a.mira[2]) * t,
    );
    // En pantallas angostas la cámara retrocede para que quepa la pieza.
    const aspecto = ancho / alto;
    const lejos = acotar(1.55 / aspecto, 1, 2.2);
    posObjetivo.sub(miraObjetivo).multiplyScalar(lejos).add(miraObjetivo);
    niebla.near = 18 * lejos;
    niebla.far = 40 * lejos;
    posObjetivo.x += inclinacion.x * 0.6;
    posObjetivo.y += -inclinacion.y * 0.35;
    sucio = true;
  }

  function posicionar(): void {
    for (const id of ANCLAS) {
      const pos = posicion[id];
      proyectado.copy(anclaMundo[id]).project(camara);
      pos.x = ((proyectado.x + 1) / 2) * ancho;
      pos.y = ((1 - proyectado.y) / 2) * alto;
      pos.visible =
        p >= APARECE[id] &&
        proyectado.z < 1 &&
        pos.x > -40 &&
        pos.x < ancho + 40 &&
        pos.y > 0 &&
        pos.y < alto;
    }
    op.alPosicionar(posicion);
  }

  function dibujar(dt: number): boolean {
    const k = reducido || primerCuadro ? 1 : 1 - Math.exp(-dt * 5);
    primerCuadro = false;
    const antes =
      camara.position.distanceToSquared(posObjetivo) + mira.distanceToSquared(miraObjetivo);
    camara.position.lerp(posObjetivo, k);
    mira.lerp(miraObjetivo, k);
    camara.lookAt(mira);
    if (!sucio && antes < 1e-6) return false;
    sucio = antes > 1e-6;
    renderer.render(escena, camara);
    posicionar();
    return true;
  }

  // ---------------------------------------------------------------- bucle

  let idBucle = 0;
  let idUnico = 0;
  let enVista = false;
  let pestanaVisible = document.visibilityState === 'visible';
  let destruido = false;
  let anterior = 0;

  const debeCorrer = () => !reducido && !destruido && enVista && pestanaVisible;

  function cuadro(ahora: number): void {
    const dt = anterior ? Math.min(0.05, (ahora - anterior) / 1000) : 1 / 60;
    anterior = ahora;
    // Cuando la cámara llega a su sitio y nada cambió, el bucle se duerme hasta el próximo cambio.
    const pinto = dibujar(dt);
    idBucle = pinto && debeCorrer() ? requestAnimationFrame(cuadro) : 0;
  }

  /** Algo cambió: con el bucle disponible se despierta; si no, un solo cuadro mientras se vea. */
  function despertar(): void {
    if (debeCorrer()) arrancar();
    else if (enVista && pestanaVisible) dibujoUnico();
  }

  function arrancar(): void {
    if (debeCorrer() && !idBucle) {
      anterior = 0;
      idBucle = requestAnimationFrame(cuadro);
    }
  }

  function dibujoUnico(): void {
    if (idUnico || destruido) return;
    idUnico = requestAnimationFrame(() => {
      idUnico = 0;
      sucio = true;
      dibujar(1);
    });
  }

  function medir(): void {
    const caja = lienzo.getBoundingClientRect();
    ancho = Math.max(1, Math.round(caja.width));
    alto = Math.max(1, Math.round(caja.height));
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
    aplicar();
    primerCuadro = true;
    if (debeCorrer()) arrancar();
    else dibujoUnico();
  }

  const observadorTamano = new ResizeObserver(() => medir());
  observadorTamano.observe(lienzo);
  const observadorVista = new IntersectionObserver((entradas) => {
    enVista = entradas.some((e) => e.isIntersecting);
    if (enVista) {
      arrancar();
      if (reducido) dibujoUnico();
    }
  });
  observadorVista.observe(lienzo);
  const alCambiarPestana = () => {
    pestanaVisible = document.visibilityState === 'visible';
    arrancar();
  };
  document.addEventListener('visibilitychange', alCambiarPestana);

  medir();

  return {
    progreso(valor: number): void {
      p = acotar(valor);
      aplicar();
      despertar();
    },
    inclinar(x: number, y: number): void {
      if (reducido) return;
      inclinacion.x = x;
      inclinacion.y = y;
      aplicar();
      if (debeCorrer()) arrancar();
    },
    destruir(): void {
      destruido = true;
      if (idBucle) cancelAnimationFrame(idBucle);
      if (idUnico) cancelAnimationFrame(idUnico);
      observadorTamano.disconnect();
      observadorVista.disconnect();
      document.removeEventListener('visibilitychange', alCambiarPestana);
      for (const d of desechables) d.dispose();
      desechables.length = 0;
      renderer.dispose();
      // dispose() no suelta el contexto WebGL; el navegador admite pocos a la vez y cada
      // visita a este mundo crearía uno nuevo.
      renderer.forceContextLoss();
    },
  };
}
