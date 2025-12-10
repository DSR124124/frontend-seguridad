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
      }
    ]
  }
];

