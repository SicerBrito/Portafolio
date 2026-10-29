import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

export interface OpcionesCoreografia {
  /** El elemento anfitrión de la portada: todo se busca y se limpia dentro de él. */
  raiz: HTMLElement;
  reducido: boolean;
}

export interface CoreografiaInicio {
  destruir(): void;
}

/**
 * Toda la animación de la portada en un solo lugar: la entrada del titular, la banda que
 * corre con la velocidad del scroll, los títulos que suben al aparecer, las cifras que
 * cuentan y la ficha que sigue al cursor sobre la lista de proyectos.
 *
 * Con movimiento reducido no se anima nada: el contenido queda quieto y completo.
 */
export function crearCoreografia(op: OpcionesCoreografia): CoreografiaInicio {
  const { raiz } = op;
  const html = document.documentElement;
  const limpiezas: Array<() => void> = [];

  if (op.reducido) {
    html.classList.remove('anima');
    return { destruir: () => undefined };
  }

  // La entrada del titular solo corre en la primera carga: al volver desde un mundo, la
  // transición de ventana ya hace de entrada.
  const primeraCarga = html.classList.contains('anima');

  const contexto = gsap.context(() => {
    if (primeraCarga) entradaHero(raiz);
    titulosAlAparecer(raiz);
    limpiezas.push(bandaConInercia(raiz));
    cifrasQueCuentan(raiz);
    progresoMetodo(raiz);
    limpiezas.push(fichaFlotante(raiz));
  }, raiz);

  // Las fuentes cambian la altura de las líneas: se recalcula cuando terminan de cargar.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  return {
    destruir() {
      limpiezas.forEach((f) => f());
      contexto.revert();
    },
  };
}

/* ---------- Entrada del titular ---------- */

function entradaHero(raiz: HTMLElement): void {
  const titulo = raiz.querySelector<HTMLElement>('.hero h1');
  if (!titulo) return;
  const html = document.documentElement;

  SplitText.create(titulo, {
    type: 'lines,words',
    mask: 'lines',
    autoSplit: true,
    onSplit(self) {
      holgura(self.masks);
      const linea = gsap.timeline({ defaults: { ease: 'expo.out' } });
      linea
        .set('[data-intro]', { autoAlpha: 1 })
        .from(self.words, { yPercent: 115, duration: 1.1, stagger: 0.045 })
        .fromTo(
          titulo.querySelectorAll('mark'),
          { '--subrayado': 0 },
          { '--subrayado': 1, duration: 0.9, stagger: 0.12 },
          '-=0.55',
        )
        .from(
          '.hero .antetitulo .label',
          { autoAlpha: 0, x: -16, duration: 0.6, stagger: 0.08 },
          0.15,
        )
        .from(
          ['.hero .bajada', '.hero .acciones', '.hero .estado-vivo'],
          { autoAlpha: 0, y: 24, duration: 0.8, stagger: 0.1 },
          '-=0.7',
        )
        .from('.hero-retrato', { autoAlpha: 0, scale: 0.92, duration: 1.2 }, 0.2)
        .add(() => html.classList.remove('anima'));
      return linea;
    },
  });
}

/**
 * Las máscaras recortan cada línea; con un interlineado tan apretado se comerían las tildes
 * de las mayúsculas (PRODUCCIÓN). Se les da aire por dentro y se compensa por fuera.
 */
function holgura(mascaras: Element[]): void {
  gsap.set(mascaras, { paddingBlock: '0.14em', marginBlock: '-0.14em' });
}

/* ---------- Títulos de sección ---------- */

function titulosAlAparecer(raiz: HTMLElement): void {
  raiz.querySelectorAll<HTMLElement>('.titulo-seccion').forEach((titulo) => {
    SplitText.create(titulo, {
      type: 'lines,words',
      mask: 'lines',
      autoSplit: true,
      onSplit(self) {
        holgura(self.masks);
        return gsap.from(self.words, {
          yPercent: 110,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.035,
          scrollTrigger: { trigger: titulo, start: 'top 85%', once: true },
        });
      },
    });
  });
}

/* ---------- Banda cinética ---------- */

/**
 * Dos cintas que corren en sentidos opuestos. El scroll les da impulso: entre más rápido
 * baja el visitante, más rápido corren y más se inclinan, y luego vuelven a su paso.
 */
function bandaConInercia(raiz: HTMLElement): () => void {
  const cintas = gsap.utils.toArray<HTMLElement>('.cinta-pista', raiz);
  if (!cintas.length) return () => undefined;

  const vueltas = cintas.map((pista, i) =>
    gsap.fromTo(
      pista,
      { xPercent: i % 2 ? -50 : 0 },
      { xPercent: i % 2 ? 0 : -50, duration: i % 2 ? 46 : 34, ease: 'none', repeat: -1 },
    ),
  );
  // Se arranca muy adelante en el tiempo para poder correr hacia atrás sin tocar el inicio.
  vueltas.forEach((t) => t.totalTime(t.duration() * 500));
  const inclinar = gsap.quickTo('.cinta-grande', 'skewX', { duration: 0.5, ease: 'power3.out' });
  let sentido = 1;

  const disparador = ScrollTrigger.create({
    trigger: '.banda',
    start: 'top bottom',
    end: 'bottom top',
    onUpdate(self) {
      const v = self.getVelocity();
      if (self.direction !== sentido) sentido = self.direction;
      const impulso = 1 + Math.min(Math.abs(v) / 260, 5);
      vueltas.forEach((t) =>
        gsap.to(t, { timeScale: impulso * sentido, duration: 0.2, overwrite: true }),
      );
      inclinar(gsap.utils.clamp(-12, 12, v / -180));
    },
    onToggle(self) {
      vueltas.forEach((t) => (self.isActive ? t.play() : t.pause()));
    },
  });
  if (!disparador.isActive) vueltas.forEach((t) => t.pause());

  // Cuando el scroll se detiene, las cintas recuperan su velocidad de crucero.
  const alParar = () => {
    vueltas.forEach((t) =>
      gsap.to(t, { timeScale: sentido, duration: 1.2, ease: 'power2.out', overwrite: true }),
    );
    inclinar(0);
  };
  ScrollTrigger.addEventListener('scrollEnd', alParar);

  return () => {
    ScrollTrigger.removeEventListener('scrollEnd', alParar);
    disparador.kill();
  };
}

/* ---------- Cifras ---------- */

function cifrasQueCuentan(raiz: HTMLElement): void {
  raiz.querySelectorAll<HTMLElement>('[data-contar]').forEach((el) => {
    const final = Number(el.dataset['contar']);
    const desde = Number(el.dataset['desde'] ?? 0);
    if (!Number.isFinite(final)) return;
    const estado = { n: desde };
    el.textContent = String(desde);
    gsap.to(estado, {
      n: final,
      duration: 1.8,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: () => {
        el.textContent = String(Math.round(estado.n));
      },
    });
  });

  gsap.from('.cifra', {
    autoAlpha: 0,
    y: 40,
    duration: 0.9,
    ease: 'expo.out',
    stagger: 0.1,
    scrollTrigger: { trigger: '.cifras', start: 'top 80%', once: true },
  });
}

/* ---------- Método: la línea se llena con el scroll ---------- */

function progresoMetodo(raiz: HTMLElement): void {
  const barra = raiz.querySelector('.flujo-progreso');
  if (!barra) return;
  gsap.fromTo(
    barra,
    { scaleX: 0 },
    {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: '.flujo', start: 'top 80%', end: 'bottom 55%', scrub: 0.6 },
    },
  );
  gsap.from('.flujo li', {
    autoAlpha: 0,
    y: 32,
    duration: 0.8,
    ease: 'expo.out',
    stagger: 0.12,
    scrollTrigger: { trigger: '.flujo', start: 'top 80%', once: true },
  });
}

/* ---------- Ficha que sigue al cursor ---------- */

/**
 * Sobre la lista de proyectos, una ficha con el color del proyecto sigue al cursor con
 * algo de retraso. Solo con mouse: en pantallas táctiles no hay cursor que seguir.
 */
function fichaFlotante(raiz: HTMLElement): () => void {
  const ficha = raiz.querySelector<HTMLElement>('.ficha-flotante');
  const lista = raiz.querySelector<HTMLElement>('.lista-proyectos');
  if (!ficha || !lista || !matchMedia('(hover: hover) and (pointer: fine)').matches)
    return () => undefined;

  const nombre = ficha.querySelector<HTMLElement>('.ficha-nombre')!;
  const para = ficha.querySelector<HTMLElement>('.ficha-para')!;
  const x = gsap.quickTo(ficha, 'x', { duration: 0.55, ease: 'power3.out' });
  const y = gsap.quickTo(ficha, 'y', { duration: 0.55, ease: 'power3.out' });
  const giro = gsap.quickTo(ficha, 'rotation', { duration: 0.8, ease: 'power3.out' });
  // La ficha flota arriba a la derecha del cursor: tapa la fila de encima, nunca la que se lee.
  gsap.set(ficha, { xPercent: 6, yPercent: -106, scale: 0, autoAlpha: 0, transformOrigin: '0% 100%' });
  let previa = 0;

  const mover = (e: PointerEvent) => {
    x(e.clientX);
    y(e.clientY);
    giro(gsap.utils.clamp(-14, 14, (e.clientX - previa) * 0.6));
    previa = e.clientX;
  };
  const entrar = (e: PointerEvent) => {
    const fila = (e.target as HTMLElement).closest<HTMLElement>('[data-ficha]');
    if (!fila) return;
    previa = e.clientX;
    ficha.style.setProperty('--color-ficha', fila.dataset['color'] ?? 'var(--signal)');
    nombre.textContent = fila.dataset['ficha'] ?? '';
    para.textContent = fila.dataset['para'] ?? '';
    gsap.to(ficha, {
      scale: 1,
      autoAlpha: 1,
      duration: 0.45,
      ease: 'back.out(1.6)',
      overwrite: 'auto',
    });
  };
  const salir = () =>
    gsap.to(ficha, { scale: 0, autoAlpha: 0, duration: 0.3, ease: 'power2.in', overwrite: 'auto' });

  lista.addEventListener('pointermove', mover);
  lista.addEventListener('pointerover', entrar);
  lista.addEventListener('pointerleave', salir);
  return () => {
    lista.removeEventListener('pointermove', mover);
    lista.removeEventListener('pointerover', entrar);
    lista.removeEventListener('pointerleave', salir);
  };
}
