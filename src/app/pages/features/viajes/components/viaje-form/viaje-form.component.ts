import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ViajeRequest, Viaje } from '../../interfaces/viaje.interface';
import { ViajeService } from '../../services/viaje.service';
import { RutaService } from '../../../rutas/services/ruta.service';
import { BusService } from '../../../buses/services/bus.service';
import { ConductorService } from '../../../conductores/services/conductor.service';
import { Ruta } from '../../../rutas/interfaces/ruta.interface';
import { Bus } from '../../../buses/interfaces/bus.interface';
import { Conductor } from '../../../conductores/interfaces/conductor.interface';
import { MessageService } from '../../../../../core/services/message.service';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-viaje-form',
  standalone: true,
  imports: [
    CommonModule,
    ...PrimeNGModules,
    ReactiveFormsModule
  ],
  templateUrl: './viaje-form.component.html',
  styleUrl: './viaje-form.component.css'
})
export class ViajeFormComponent implements OnInit, OnDestroy {
  @Output() viajeCreado = new EventEmitter<void>();
  @Output() viajeActualizado = new EventEmitter<void>();

  viajeForm!: FormGroup;
  visible: boolean = false;
  submitted: boolean = false;
  modoEdicion: boolean = false;
  viajeId: number | null = null;

  rutas: Ruta[] = [];
  buses: Bus[] = [];
  conductores: Conductor[] = [];

  estados = [
    { label: 'Programado', value: 'programado' },
    { label: 'En Curso', value: 'en_curso' },
    { label: 'Completado', value: 'completado' },
    { label: 'Cancelado', value: 'cancelado' }
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private viajeService: ViajeService,
    private rutaService: RutaService,
    private busService: BusService,
    private conductorService: ConductorService,
    private messageService: MessageService,
    private loadingService: LoadingService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  initForm(): void {
    this.viajeForm = this.fb.group({
      idRuta: [null, [Validators.required]],
      idBus: [null, [Validators.required]],
      idConductor: [null, [Validators.required]],
      fechaInicioProgramada: [null, [Validators.required]],
      fechaFinProgramada: [null, [Validators.required]],
      estado: ['programado', [Validators.required]]
    });
  }

  cargarDatos(): void {
    this.loadingService.show();

    let cargasCompletadas = 0;
    const totalCargas = 3;

    const verificarCargaCompleta = () => {
      cargasCompletadas++;
      if (cargasCompletadas === totalCargas) {
        this.loadingService.hide();
      }
    };

    // Cargar rutas
    const subRutas = this.rutaService.listarRutas().subscribe({
      next: (rutas) => {
        this.rutas = rutas || [];
        verificarCargaCompleta();
      },
      error: (error) => {
        const errorMessage = error?.error?.message || error?.message || 'Error al cargar las rutas';
        this.messageService.error(errorMessage, 'Error', 6000);
        verificarCargaCompleta();
      }
    });

    // Cargar buses
    const subBuses = this.busService.listarBuses().subscribe({
      next: (buses) => {
        this.buses = buses || [];
        verificarCargaCompleta();
      },
      error: (error) => {
        const errorMessage = error?.error?.message || error?.message || 'Error al cargar los buses';
        this.messageService.error(errorMessage, 'Error', 6000);
        verificarCargaCompleta();
      }
    });

    // Cargar conductores
    const subConductores = this.conductorService.listarConductores().subscribe({
      next: (conductores) => {
        this.conductores = conductores || [];
        verificarCargaCompleta();
      },
      error: (error) => {
        const errorMessage = error?.error?.message || error?.message || 'Error al cargar los conductores';
        this.messageService.error(errorMessage, 'Error', 6000);
        verificarCargaCompleta();
      }
    });

    this.subscriptions.push(subRutas, subBuses, subConductores);
  }

  showDialog(viaje?: Viaje): void {
    this.modoEdicion = !!viaje;
    this.viajeId = viaje?.idViaje || null;
    this.visible = true;
    this.submitted = false;

    if (viaje) {
      // Cargar datos del viaje para editar
      let fechaInicio: Date | null = null;
      let fechaFin: Date | null = null;

      if (viaje.fechaInicioProgramada) {
        try {
          fechaInicio = new Date(viaje.fechaInicioProgramada);
          if (isNaN(fechaInicio.getTime())) {
            fechaInicio = null;
          }
        } catch {
          fechaInicio = null;
        }
      }

      if (viaje.fechaFinProgramada) {
        try {
          fechaFin = new Date(viaje.fechaFinProgramada);
          if (isNaN(fechaFin.getTime())) {
            fechaFin = null;
          }
        } catch {
          fechaFin = null;
        }
      }

      this.viajeForm.patchValue({
        idRuta: viaje.idRuta,
        idBus: viaje.idBus,
        idConductor: viaje.idConductor,
        fechaInicioProgramada: fechaInicio,
        fechaFinProgramada: fechaFin,
        estado: viaje.estado || 'programado'
      });
    } else {
      // Resetear formulario para crear
      const ahora = new Date();
      const finEstimado = new Date(ahora.getTime() + 2 * 60 * 60 * 1000); // 2 horas después

      this.viajeForm.reset({
        estado: 'programado',
        fechaInicioProgramada: ahora,
        fechaFinProgramada: finEstimado
      });
    }
  }

  hideDialog(): void {
    this.visible = false;
    this.submitted = false;
    this.modoEdicion = false;
    this.viajeId = null;
    this.viajeForm.reset({
      estado: 'programado'
    });
  }

  guardar(): void {
    this.submitted = true;

    if (this.viajeForm.invalid) {
      this.messageService.warn('Por favor, complete todos los campos requeridos correctamente', 'Validación', 5000);
      return;
    }

    // Validar que la fecha de fin sea posterior a la fecha de inicio
    const fechaInicio = this.viajeForm.value.fechaInicioProgramada;
    const fechaFin = this.viajeForm.value.fechaFinProgramada;

    if (fechaInicio && fechaFin && fechaFin <= fechaInicio) {
      this.messageService.warn('La fecha de fin debe ser posterior a la fecha de inicio', 'Validación', 5000);
      return;
    }

    const viajeData: ViajeRequest = {
      idRuta: this.viajeForm.value.idRuta,
      idBus: this.viajeForm.value.idBus,
      idConductor: this.viajeForm.value.idConductor,
      fechaInicioProgramada: fechaInicio ? fechaInicio.toISOString() : new Date().toISOString(),
      fechaFinProgramada: fechaFin ? fechaFin.toISOString() : new Date().toISOString(),
      estado: this.viajeForm.value.estado || 'programado'
    };

    this.loadingService.show();

    if (this.modoEdicion && this.viajeId) {
      const sub = this.viajeService.actualizarViaje(this.viajeId!, viajeData).subscribe({
        next: () => {
          this.loadingService.hide();
          this.messageService.success('Viaje actualizado correctamente', 'Éxito', 5000);
          this.hideDialog();
          this.viajeActualizado.emit();
        },
        error: (error) => {
          this.loadingService.hide();
          const errorMessage = error?.error?.message || error?.error?.error || error?.message || 'Error al actualizar el viaje';
          this.messageService.error(errorMessage, 'Error', 6000);
        }
      });
      this.subscriptions.push(sub);
    } else {
      const sub = this.viajeService.crearViaje(viajeData).subscribe({
        next: () => {
          this.loadingService.hide();
          this.messageService.success('Viaje creado correctamente', 'Éxito', 5000);
          this.hideDialog();
          this.viajeCreado.emit();
        },
        error: (error) => {
          this.loadingService.hide();
          const errorMessage = error?.error?.message || error?.error?.error || error?.message || 'Error al crear el viaje';
          this.messageService.error(errorMessage, 'Error', 6000);
        }
      });
      this.subscriptions.push(sub);
    }
  }

  get f() {
    return this.viajeForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.viajeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }
}

