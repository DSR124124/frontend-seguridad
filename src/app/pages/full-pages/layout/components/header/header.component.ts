import { Component, Output, EventEmitter, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { Subscription } from 'rxjs';
import { NotificacionCounterService } from '../../../features/notificaciones/services/notificacion-counter.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    BadgeModule,
    TooltipModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Output() toggleSidebar = new EventEmitter<void>();

  private notificacionCounterService = inject(NotificacionCounterService);
  private router = inject(Router);
  private subscription?: Subscription;

  unreadCount: number = 0;

  ngOnInit(): void {
    // Inicializar el servicio de contador
    this.notificacionCounterService.initialize();

    // Suscribirse a los cambios del contador
    this.subscription = this.notificacionCounterService.getUnreadCount().subscribe({
      next: (count) => {
        this.unreadCount = count;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  onToggleSidebar() {
    this.toggleSidebar.emit();
  }

  onNotificationClick() {
    // Navegar a la página de notificaciones asignadas
    this.router.navigate(['/notificaciones/mis-notificaciones-asignadas']);
  }
}

