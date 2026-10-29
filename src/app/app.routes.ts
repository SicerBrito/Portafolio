import { Routes } from '@angular/router';

/** Cada proyecto tiene su propio mundo; la lista también decide qué se prerenderiza. */
export const MUNDOS = ['ahdo', 'conecta', 'estudio', 'ocupasalud', 'cuality', 'prevent', 'backbone'] as const;

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./inicio/inicio').then((m) => m.Inicio),
    title: 'Sicer Brito · Desarrollador Full Stack .NET y Angular',
  },
  {
    path: 'proyectos/ahdo',
    loadComponent: () => import('./mundos/ahdo/ahdo').then((m) => m.MundoAhdo),
  },
  {
    path: 'proyectos/conecta',
    loadComponent: () => import('./mundos/conecta/conecta').then((m) => m.MundoConecta),
  },
  {
    path: 'proyectos/estudio',
    loadComponent: () => import('./mundos/estudio/estudio').then((m) => m.MundoEstudio),
  },
  {
    path: 'proyectos/ocupasalud',
    loadComponent: () => import('./mundos/ocupasalud/ocupasalud').then((m) => m.MundoOcupasalud),
  },
  {
    path: 'proyectos/cuality',
    loadComponent: () => import('./mundos/cuality/cuality').then((m) => m.MundoCuality),
  },
  {
    path: 'proyectos/prevent',
    loadComponent: () => import('./mundos/prevent/prevent').then((m) => m.MundoPrevent),
  },
  {
    path: 'proyectos/backbone',
    loadComponent: () => import('./mundos/backbone/backbone').then((m) => m.MundoBackbone),
  },
  { path: '**', redirectTo: '' },
];
