import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { LoadingService } from '../../services/loading.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [
    CommonModule,
    ProgressSpinnerModule
  ],
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.css'
})
export class LoadingSpinnerComponent implements OnInit, OnDestroy {
  isLoading = false;
  private subscription?: Subscription;

  // Propiedades personalizables mediante Input
  @Input() message: string = '';
  @Input() size: 'small' | 'normal' | 'large' = 'normal';
  @Input() fullScreen: boolean = true;
  @Input() useService: boolean = true; // Si es false, se controla manualmente con [isLoading]
  @Input() isLoadingManual: boolean = false; // Para control manual

  constructor(private loadingService: LoadingService) {}

  ngOnInit(): void {
    if (this.useService) {
      this.subscription = this.loadingService.loading$.subscribe(
        (loading) => {
          this.isLoading = loading;
        }
      );
    } else {
      this.isLoading = this.isLoadingManual;
    }
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  get spinnerSize(): string {
    const sizes = {
      small: '30px',
      normal: '50px',
      large: '80px'
    };
    return sizes[this.size];
  }

  get showSpinner(): boolean {
    return this.useService ? this.isLoading : this.isLoadingManual;
  }
}

