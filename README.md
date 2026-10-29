# Sicer Brito · Portafolio

**🌐 [sicerbrito.dev](https://sicerbrito.dev)**

> Llevo software de la idea a producción. Y me quedo a operarlo.

Portafolio de Sicer Andrés Brito Gutiérrez, Líder de Desarrollo y desarrollador
Full Stack .NET y Angular en Bucaramanga, Colombia.

El código de los sistemas en los que trabajo es privado y pertenece a las
empresas. Este sitio cuenta lo que sí se puede mostrar de cada uno: el problema
que resuelve, cómo funciona por dentro, qué parte es mía según git, en qué estado
está y qué le falta.

## Cada proyecto es un mundo

Al entrar a un proyecto, todo el sitio cambia a la paleta de su marca, y cada uno
tiene su propia estructura, una maqueta 3D que avanza con el scroll y
demostraciones que se pueden tocar.

| Proyecto | Qué es | Mi parte |
|---|---|---|
| [AHDO](https://sicerbrito.dev/proyectos/ahdo/) | Plataforma SaaS B2B2C de formación, evaluación, certificación y facturación | Desarrollador principal |
| [Conecta](https://sicerbrito.dev/proyectos/conecta/) | Canal de WhatsApp y formularios para varias empresas del grupo | Desde cero |
| [Estudio de Video](https://sicerbrito.dev/proyectos/estudio/) | Prototipo de un motor que convierte documentos en video formativo | Desde cero |
| [Ocupasalud](https://sicerbrito.dev/proyectos/ocupasalud/) | Sistema de IPS de salud ocupacional | Participé con integraciones |
| [Cuality](https://sicerbrito.dev/proyectos/cuality/) | Estudios de puesto de trabajo | Fundé la base |
| [Prevent](https://sicerbrito.dev/proyectos/prevent/) | Centro de entrenamiento en trabajo seguro en alturas | Tomé el relevo |
| [Backbone de IA](https://sicerbrito.dev/proyectos/backbone/) | Servicio de IA del grupo, hecho por otro desarrollador | Lo endurecí y lo desplegué |

## Cómo está hecho

- **Angular 22**: componentes standalone, signals y detección de cambios sin zone.js.
- **Prerenderizado (SSG)**: cada página sale como HTML estático con todo su texto,
  así que se lee y se indexa aunque el JavaScript no llegue.
- **three.js** para las escenas 3D y **GSAP** (ScrollTrigger y SplitText) para la
  coreografía del scroll. Las dos librerías se cargan solo cuando hacen falta.
- **Un tema por mundo**: `<html data-mundo="…">` redefine los tokens de color de
  todo el sitio; cada paleta sale del código o del sitio real de su marca.
- **Para todos**: con movimiento reducido, las escenas quedan en un cuadro fijo con
  pasos; sin WebGL, hay un plano en SVG; funciona en celulares desde 375 px y con
  teclado.
- Publicado en **Cloudflare**.

Lo programé con asistencia de IA, con el mismo método que uso en el trabajo:
primero el plan escrito, después el código.

## Estructura

```
src/app/
├── inicio/       portada: retrato, mapa 3D del ecosistema, cifras, método, trayectoria
├── mundos/<id>/  la página de cada proyecto
├── escenas/      escenas three.js y canvas (sin Angular: crear → actualizar → destruir)
├── contenido/    los textos y datos de cada proyecto
├── core/         mundo activo, movimiento reducido, orientación del celular
└── ui/           cabecera, pie y sello de autoría
src/styles/mundos/  la paleta de cada mundo
public/marcas/      logos de cada empresa
```

## Correrlo en local

Requiere Node 24 (ver `.node-version`).

```bash
npm install
npm start          # http://localhost:4200
npm run build      # salida estática en dist/portafolio/browser
```

## Sobre el contenido

- Las demostraciones usan **datos ficticios** y lo dicen en pantalla.
- Las cifras de negocio y los logos de las empresas del Grupo Empresarial Prometeo
  se publican **con autorización** de la empresa.
- La autoría de cada proyecto está verificada contra el historial de git y se
  cuenta tal cual: lo que hice desde cero, lo que tomé de otro desarrollador y lo
  que solo apoyé.

Código: todos los derechos reservados. Los logos y marcas pertenecen a sus
respectivas empresas.

---

## English

**[sicerbrito.dev](https://sicerbrito.dev)** · Portfolio of Sicer Brito, Development
Lead and Full Stack .NET & Angular developer based in Colombia, open to remote work.

The code of the systems I work on is private, so this site tells each story
instead: the problem, how it works inside, what part is mine according to git,
and what is still missing. Every project is its own "world", with its brand
palette, a scroll-driven 3D model and interactive demos with fictional data.

Built with Angular 22 (standalone, signals, zoneless), static prerendering,
three.js and GSAP, with reduced-motion and no-WebGL fallbacks. Deployed on
Cloudflare.

**Contact:** [jobdevbrito@gmail.com](mailto:jobdevbrito@gmail.com) ·
[LinkedIn](https://linkedin.com/in/sicer-brito) · [GitHub](https://github.com/SicerBrito)
