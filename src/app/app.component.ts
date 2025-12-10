import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TokenHandlerService } from './core/services/token-handler.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
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
