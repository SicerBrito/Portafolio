/**
 * GSAP y ScrollTrigger se cargan diferidos, solo en el navegador y una sola vez.
 * Cada sección crea sus ScrollTrigger dentro de su propio gsap.context y los revierte al irse.
 */
type ModuloGsap = typeof import('gsap');
type ModuloScrollTrigger = typeof import('gsap/ScrollTrigger');

export interface Gsap {
  gsap: ModuloGsap['gsap'];
  ScrollTrigger: ModuloScrollTrigger['ScrollTrigger'];
}

let carga: Promise<Gsap> | null = null;

export function cargarGsap(): Promise<Gsap> {
  carga ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([g, s]) => {
    g.gsap.registerPlugin(s.ScrollTrigger);
    return { gsap: g.gsap, ScrollTrigger: s.ScrollTrigger };
  });
  return carga;
}

/**
 * Las secciones cargan en cualquier orden y la de "La vida de un pago" agrega el espacio de su pin:
 * se ordenan por posición y se recalculan todas para que las de abajo queden en su sitio.
 */
export function reordenar(st: Gsap['ScrollTrigger']): void {
  st.sort();
  st.refresh();
}

/** Alto de la cabecera fija del sitio, en px. */
export function altoCabecera(): number {
  const valor = getComputedStyle(document.documentElement).getPropertyValue('--cabecera');
  const n = parseFloat(valor);
  return Number.isFinite(n) ? n : 64;
}
