import { Routes } from '@angular/router';

export const layoutRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/layout-main/layout-main.component').then(m => m.LayoutMainComponent),
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        loadComponent: () => import('../../features/home/components/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'buses',
        children: [
          {
            path: 'lista-buses',
            loadComponent: () => import('../../features/buses/components/bus-list/bus-list.component').then(m => m.BusListComponent)
          },
          {
            path: 'lista-conductores',
            loadComponent: () => import('../../features/conductores/components/conductor-list/conductor-list.component').then(m => m.ConductorListComponent)
          }
        ]
      },
      {
        path: 'rutas',
        children: [
          {
            path: 'lista-rutas',
            loadComponent: () => import('../../features/rutas/components/ruta-list/ruta-list.component').then(m => m.RutaListComponent)
          }
        ]
      },
      {
        path: 'viajes',
        children: [
          {
            path: 'lista-viajes',
            loadComponent: () => import('../../features/viajes/components/viaje-list/viaje-list.component').then(m => m.ViajeListComponent)
          },
          {
            path: 'mapa-tiempo-real',
            loadComponent: () => import('../../features/viajes/components/viaje-mapa-tiempo-real/viaje-mapa-tiempo-real.component').then(m => m.ViajeMapaTiempoRealComponent)
          }
        ]
      },
      {
        path: 'notificaciones',
        children: [
          {
            path: 'mis-notificaciones-creadas',
            loadComponent: () => import('../../features/notificaciones/components/mis-notificaciones-creadas/mis-notificaciones-creadas.component').then(m => m.MisNotificacionesCreadasComponent)
          },
          {
            path: 'mis-notificaciones-asignadas',
            loadComponent: () => import('../../features/notificaciones/components/mis-notificaciones-asignadas/mis-notificaciones-asignadas.component').then(m => m.MisNotificacionesAsignadasComponent)
          }
        ]
      }
    ]
  }
];

