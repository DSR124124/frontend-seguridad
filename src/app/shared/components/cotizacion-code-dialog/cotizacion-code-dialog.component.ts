import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { PrimeNGModules } from '../../../prime-ng/prime-ng';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface CotizacionCodeDialogData {
  targetModule: string;      // Nombre del módulo destino (ej: "General", "Colores")
  targetRoute: string[];     // Ruta base del módulo
  targetQueryParams?: { [key: string]: string }; // Query params adicionales
}

export interface CotizacionCodeDialogResult {
  action: 'navigate' | 'cancel';
  code?: string;
  route?: string[];
  queryParams?: { [key: string]: string };
}

@Component({
  selector: 'app-cotizacion-code-dialog',
  standalone: true,
  templateUrl: './cotizacion-code-dialog.component.html',
  styleUrl: './cotizacion-code-dialog.component.css',
  imports: [
    ...PrimeNGModules,
    ReactiveFormsModule,
    CommonModule
  ]
})
export class CotizacionCodeDialogComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('codeInput') codeInput!: ElementRef<HTMLInputElement>;

  cotizacionCode: string = '';
  targetModule: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  // Historial de códigos recientes (almacenado en localStorage)
  recentCodes: string[] = [];
  private readonly RECENT_CODES_KEY = 'cotizaciones_recent_codes';
  private readonly MAX_RECENT_CODES = 5;

  constructor(
    public ref: DynamicDialogRef,
    public config: DynamicDialogConfig
  ) {}

  ngOnInit(): void {
    if (this.config.data) {
      this.targetModule = this.config.data.targetModule || 'Detalle';
    }
    this.loadRecentCodes();

    // Listener para Enter
    document.addEventListener('keydown', this.handleKeyDown);
  }

  ngAfterViewInit(): void {
    // Enfocar el input después de que el view se inicialice
    setTimeout(() => {
      if (this.codeInput) {
        this.codeInput.nativeElement.focus();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter' && this.cotizacionCode.trim()) {
      event.preventDefault();
      this.navigate();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancel();
    }
  };

  /**
   * Carga códigos recientes desde localStorage
   */
  private loadRecentCodes(): void {
    try {
      const stored = localStorage.getItem(this.RECENT_CODES_KEY);
      if (stored) {
        this.recentCodes = JSON.parse(stored);
      }
    } catch {
      this.recentCodes = [];
    }
  }

  /**
   * Guarda un código en el historial de recientes
   */
  private saveRecentCode(code: string): void {
    // Eliminar si ya existe
    this.recentCodes = this.recentCodes.filter(c => c !== code);
    // Agregar al inicio
    this.recentCodes.unshift(code);
    // Limitar cantidad
    this.recentCodes = this.recentCodes.slice(0, this.MAX_RECENT_CODES);
    // Guardar
    localStorage.setItem(this.RECENT_CODES_KEY, JSON.stringify(this.recentCodes));
  }

  /**
   * Selecciona un código reciente
   */
  selectRecentCode(code: string): void {
    this.cotizacionCode = code;
    this.errorMessage = '';
    // Focus en el input
    if (this.codeInput) {
      this.codeInput.nativeElement.focus();
    }
  }

  /**
   * Navega al módulo con el código ingresado
   */
  navigate(): void {
    const code = this.cotizacionCode.trim().toUpperCase();

    if (!code) {
      this.errorMessage = 'Por favor ingresa un código de cotización';
      return;
    }

    // Validación básica del formato (puedes ajustar según tu formato de código)
    if (code.length < 3) {
      this.errorMessage = 'El código debe tener al menos 3 caracteres';
      return;
    }

    this.errorMessage = '';
    this.saveRecentCode(code);

    // Construir la ruta con el código
    const result: CotizacionCodeDialogResult = {
      action: 'navigate',
      code: code,
      route: [...this.config.data.targetRoute, code],
      queryParams: this.config.data.targetQueryParams
    };

    this.ref.close(result);
  }

  /**
   * Cancela el diálogo
   */
  cancel(): void {
    const result: CotizacionCodeDialogResult = {
      action: 'cancel'
    };
    this.ref.close(result);
  }

  /**
   * Limpia el input
   */
  clearInput(): void {
    this.cotizacionCode = '';
    this.errorMessage = '';
    if (this.codeInput) {
      this.codeInput.nativeElement.focus();
    }
  }
}
