import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
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
    FooterComponent
  ],
  templateUrl: './layout-main.component.html',
  styleUrl: './layout-main.component.css'
})
export class LayoutMainComponent implements OnInit, OnDestroy {
  config: LayoutConfig;
  private configSubscription?: Subscription;
  private resizeListener?: () => void;

  constructor(private layoutService: LayoutService) {
    this.config = this.layoutService.getConfig();
    
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
}

