import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BusRequest, Bus } from '../../interfaces/bus.interface';
import { BusService } from '../../services/bus.service';
import { MessageService } from 'primeng/api';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-bus-form',
  standalone: true,
  imports: [
    ...PrimeNGModules,
    ReactiveFormsModule
  ],
  providers: [MessageService],
  templateUrl: './bus-form.component.html',
  styleUrl: './bus-form.component.css'
})
export class BusFormComponent implements OnInit, OnDestroy {
  @Output() busCreado = new EventEmitter<void>();
  @Output() busActualizado = new EventEmitter<void>();

  busForm!: FormGroup;
  visible: boolean = false;
  submitted: boolean = false;
  modoEdicion: boolean = false;
  busId: number | null = null;
  private subscriptions: Subscription[] = [];

  estados = [
    { label: 'Operativo', value: 'operativo' },
    { label: 'Mantenimiento', value: 'mantenimiento' },
    { label: 'Inactivo', value: 'inactivo' }
  ];

  constructor(
    private fb: FormBuilder,
    private busService: BusService,
    private messageService: MessageService,
    private loadingService: LoadingService
  ) {
    this.initForm();
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  initForm(): void {
    this.busForm = this.fb.group({
      placa: ['', [Validators.required, Validators.maxLength(10)]],
      modelo: ['', [Validators.maxLength(50)]],
      capacidad: [50, [Validators.required, Validators.min(1)]],
      imeiGps: ['', [Validators.maxLength(50)]],
      estado: ['operativo', [Validators.maxLength(20)]]
    });
  }

  showDialog(bus?: Bus): void {
    this.modoEdicion = !!bus;
    this.busId = bus?.idBus || null;
    this.visible = true;
    this.submitted = false;

    if (bus) {
      // Cargar datos del bus para editar
      this.busForm.patchValue({
        placa: bus.placa,
        modelo: bus.modelo || '',
        capacidad: bus.capacidad,
        imeiGps: bus.imeiGps || '',
        estado: bus.estado
      });
    } else {
      // Resetear formulario para crear
      this.busForm.reset({
        capacidad: 50,
        estado: 'operativo'
      });
    }
  }

  hideDialog(): void {
    this.visible = false;
    this.submitted = false;
    this.modoEdicion = false;
    this.busId = null;
    this.busForm.reset({
      capacidad: 50,
      estado: 'operativo'
    });
  }

  guardar(): void {
    this.submitted = true;

    if (this.busForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Por favor, complete todos los campos requeridos correctamente',
        life: 5000
      });
      return;
    }

    const busData: BusRequest = {
      placa: this.busForm.value.placa,
      modelo: this.busForm.value.modelo || undefined,
      capacidad: this.busForm.value.capacidad,
      imeiGps: this.busForm.value.imeiGps || undefined,
      estado: this.busForm.value.estado
    };

    this.loadingService.show();

    if (this.modoEdicion && this.busId) {
      // Actualizar bus existente
      const sub = this.busService.actualizarBus(this.busId, busData).subscribe({
        next: () => {
          this.loadingService.hide();
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Bus actualizado correctamente',
            life: 5000
          });
          this.hideDialog();
          this.busActualizado.emit();
        },
        error: (error) => {
          this.loadingService.hide();
          const errorMessage = error?.message || error?.error?.message || 'Error al actualizar el bus';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 5000
          });
        }
      });
      this.subscriptions.push(sub);
    } else {
      // Crear nuevo bus
      const sub = this.busService.crearBus(busData).subscribe({
        next: () => {
          this.loadingService.hide();
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Bus creado correctamente',
            life: 5000
          });
          this.hideDialog();
          this.busCreado.emit();
        },
        error: (error) => {
          this.loadingService.hide();
          const errorMessage = error?.message || error?.error?.message || 'Error al crear el bus';
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 5000
          });
        }
      });
      this.subscriptions.push(sub);
    }
  }

  get f() {
    return this.busForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.busForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }
}
