import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ErrorService } from '../../services/error.service';
import { ErrorInfo } from '../../services/error.service';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule
  ],
  templateUrl: './error.component.html',
  styleUrl: './error.component.css'
})
export class ErrorComponent implements OnInit {
  errorInfo: ErrorInfo | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private errorService: ErrorService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      let errorType = params['type'];

      // Si no hay query params, determinar el tipo de error
      if (!errorType) {
        const token = localStorage.getItem('auth_token');
        // Si no hay token, es error de autenticación
        // Si hay token pero llegamos aquí, es un 404
        errorType = token ? '404' : 'token';
      }

      this.errorInfo = this.errorService.getErrorInfo(errorType);
    });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  refresh(): void {
    window.location.reload();
  }
}

