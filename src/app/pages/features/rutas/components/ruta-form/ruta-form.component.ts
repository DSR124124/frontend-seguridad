import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { RutaRequest, Ruta } from '../../interfaces/ruta.interface';
import { RutaService } from '../../services/ruta.service';
import { MessageService } from '../../../../../core/services/message.service';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ruta-form',
  standalone: true,
  imports: [
    CommonModule,
    ...PrimeNGModules,
    ReactiveFormsModule
  ],
  templateUrl: './ruta-form.component.html',
  styleUrl: './ruta-form.component.css'
})
export class RutaFormComponent implements OnInit, OnDestroy {
  @Output() rutaCreada = new EventEmitter<number>(); // Emite el ID de la ruta creada
  @Output() rutaActualizada = new EventEmitter<void>();

  rutaForm!: FormGroup;
  visible: boolean = false;
  submitted: boolean = false;
  modoEdicion: boolean = false;
  rutaId: number | null = null;
  loading: boolean = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private rutaService: RutaService,
    private messageService: MessageService,
    private loadingService: LoadingService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  initForm(): void {
    this.rutaForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]],
      colorMapa: ['#0000FF', [Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]]
    });
  }

  showDialog(ruta?: Ruta): void {
    this.modoEdicion = !!ruta;
    this.rutaId = ruta?.idRuta || null;
    this.visible = true;
    this.submitted = false;

    if (ruta) {
      // Cargar datos de la ruta para editar
      this.rutaForm.patchValue({
        nombre: ruta.nombre,
        descripcion: ruta.descripcion || '',
        colorMapa: ruta.colorMapa || '#0000FF'
      });
    } else {
      // Resetear formulario para crear
      this.rutaForm.reset({
        colorMapa: '#0000FF'
      });
    }
  }

  hideDialog(): void {
    this.visible = false;
    this.submitted = false;
    this.modoEdicion = false;
    this.rutaId = null;
    this.rutaForm.reset({
      colorMapa: '#0000FF'
    });
  }

  guardar(): void {
    this.submitted = true;

    if (this.rutaForm.invalid) {
      this.messageService.warn('Por favor, complete todos los campos requeridos correctamente', 'Validación', 5000);
      return;
    }

    const rutaData: RutaRequest = {
      nombre: this.rutaForm.value.nombre,
      descripcion: this.rutaForm.value.descripcion || undefined,
      colorMapa: this.rutaForm.value.colorMapa || '#0000FF'
    };

    this.loading = true;
    this.loadingService.show();

    if (this.modoEdicion && this.rutaId) {
      // Actualizar ruta (solo campos básicos, los puntos se gestionan por separado)
      const sub = this.rutaService.actualizarRuta(this.rutaId!, rutaData).subscribe({
        next: () => {
          this.loading = false;
          this.loadingService.hide();
          this.messageService.success('Ruta actualizada correctamente', 'Éxito', 5000);
          this.hideDialog();
          this.rutaActualizada.emit();
        },
        error: (error) => {
          this.loading = false;
          this.loadingService.hide();
          const errorMessage = error?.error?.message || error?.error?.error || error?.message || 'Error al actualizar la ruta';
          this.messageService.error(errorMessage, 'Error', 6000);
        }
      });
      this.subscriptions.push(sub);
    } else {
      // Crear nueva ruta (los puntos se agregan después usando el botón "Gestionar Puntos")
      const sub = this.rutaService.crearRuta(rutaData).subscribe({
        next: (rutaCreada) => {
          this.loading = false;
          this.loadingService.hide();
          this.messageService.success('Ruta creada correctamente. Ahora puede agregar puntos usando el botón "Gestionar Puntos".', 'Éxito', 6000);
          this.hideDialog();
          this.rutaCreada.emit(rutaCreada.idRuta);
        },
        error: (error) => {
          this.loading = false;
          this.loadingService.hide();
          const errorMessage = error?.error?.message || error?.error?.error || error?.message || 'Error al crear la ruta';
          this.messageService.error(errorMessage, 'Error', 6000);
        }
      });
      this.subscriptions.push(sub);
    }
  }

  get f() {
    return this.rutaForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.rutaForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  onFieldChange(fieldName: string): void {
    const field = this.rutaForm.get(fieldName);
    if (field) {
      field.markAsTouched();
    }
  }
}
