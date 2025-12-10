import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { LayoutService } from '../../services/layout.service';
import { LayoutConfig } from '../../interfaces/layout-config.interface';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-layout-main',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    HeaderComponent,
    FooterComponent,
    BreadcrumbComponent
  ],
  templateUrl: './layout-main.component.html',
  styleUrl: './layout-main.component.css'
})
export class LayoutMainComponent implements OnInit, OnDestroy {
  config: LayoutConfig;
  hasToken: boolean = false;
  private configSubscription?: Subscription;
  private resizeListener?: () => void;

  constructor(
    private layoutService: LayoutService,
    private router: Router
  ) {
    this.config = this.layoutService.getConfig();
    this.checkToken();
    
    if (window.innerWidth <= 768) {
      this.layoutService.hideSidebar();
    }
  }

  ngOnInit() {
    this.configSubscription = this.layoutService.config$.subscribe(config => {
      this.config = config;
    });

    this.resizeListener = () => {
      if (window.innerWidth > 768) {
        this.layoutService.showSidebar();
      } else {
        this.layoutService.hideSidebar();
      }
    };
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy() {
    if (this.configSubscription) {
      this.configSubscription.unsubscribe();
    }
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  toggleSidebar() {
    this.layoutService.toggleSidebar();
  }

  private checkToken(): void {
    const token = localStorage.getItem('auth_token');
    this.hasToken = !!token;

    if (!this.hasToken) {
      this.router.navigate(['/error'], {
        queryParams: { type: 'token' }
      });
    }
  }
}

