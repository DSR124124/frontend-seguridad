import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [
    CommonModule,
    BreadcrumbModule,
    RouterModule
  ],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.css'
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  items: MenuItem[] = [];
  home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router
  ) {}

  ngOnInit() {
    this.buildBreadcrumb();

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.buildBreadcrumb();
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildBreadcrumb() {
    const breadcrumbs: MenuItem[] = [];
    const currentUrl = this.router.url;
    
    const routeBreadcrumbs: { [key: string]: { parent: string; child: string; parentRoute: string } } = {
      '/home': { parent: 'Inicio', child: 'Home', parentRoute: '/home' },
      '/transporte/rutas': { parent: 'Transporte', child: 'Rutas', parentRoute: '/transporte/rutas' },
      '/transporte/buses': { parent: 'Transporte', child: 'Buses', parentRoute: '/transporte/buses' },
      '/transporte/conductores': { parent: 'Transporte', child: 'Conductores', parentRoute: '/transporte/conductores' }
    };

    if (routeBreadcrumbs[currentUrl]) {
      const routeInfo = routeBreadcrumbs[currentUrl];
      
      breadcrumbs.push({
        label: routeInfo.parent,
        routerLink: routeInfo.parentRoute
      });
      
      breadcrumbs.push({
        label: routeInfo.child,
        routerLink: currentUrl
      });
    } else {
      const urlSegments = currentUrl.split('/').filter(segment => segment !== '');

      if (urlSegments.length === 0) {
        this.items = [];
        return;
      }

      let accumulatedPath = '';
      urlSegments.forEach((segment, index) => {
        accumulatedPath += '/' + segment;
        const label = this.formatLabel(segment);
        
        breadcrumbs.push({
          label: label,
          routerLink: accumulatedPath
        });
      });
    }

    this.items = breadcrumbs;
  }

  private formatLabel(path: string): string {
    const routeLabels: { [key: string]: string } = {
      'transporte': 'Transporte',
      'rutas': 'Rutas',
      'buses': 'Buses',
      'conductores': 'Conductores',
      'home': 'Inicio'
    };

    if (routeLabels[path]) {
      return routeLabels[path];
    }

    return path
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

