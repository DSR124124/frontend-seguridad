import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TokenHandlerService } from './core/services/token-handler.service';
import { ToastModule } from 'primeng/toast';
import { PrimeNGModules } from './prime-ng/prime-ng';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ...PrimeNGModules, LoadingSpinnerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'frontend-seguridad';

  constructor(private tokenHandlerService: TokenHandlerService) {}

  ngOnInit(): void {
    this.tokenHandlerService.initializeTokenFromQueryParams();
  }
}
