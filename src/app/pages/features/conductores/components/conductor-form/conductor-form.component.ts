import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ConductorRequest, Conductor } from '../../interfaces/conductor.interface';
import { ConductorService } from '../../services/conductor.service';
import { UsuarioGestionService, UsuarioGestion } from '../../services/usuario-gestion.service';
import { MessageService } from '../../../../../core/services/message.service';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-conductor-form',
  standalone: true,
  imports: [
    ...PrimeNGModules,
    ReactiveFormsModule
  ],
  templateUrl: './conductor-form.component.html',
  styleUrl: './conductor-form.component.css'
})
export class ConductorFormComponent implements OnInit, OnDestroy {
  @Output() conductorCreado = new EventEmitter<void>();
  @Output() conductorActualizado = new EventEmitter<void>();

  conductorForm!: FormGroup;
  visible: boolean = false;
  submitted: boolean = false;
  modoEdicion: boolean = false;
  conductorId: number | null = null;
  usuariosDisponibles: UsuarioGestion[] = [];
  loading: boolean = false;
  private subscriptions: Subscription[] = [];

  estados = [
    { label: 'Activo', value: 'activo' },
    { label: 'Inactivo', value: 'inactivo' },
    { label: 'Suspendido', value: 'suspendido' }
  ];

  categorias = [
    { label: 'A', value: 'A' },
    { label: 'B', value: 'B' },
    { label: 'C', value: 'C' },
    { label: 'D', value: 'D' }
  ];

  constructor(
    private fb: FormBuilder,
    private conductorService: ConductorService,
    private usuarioGestionService: UsuarioGestionService,
    private messageService: MessageService,
    private loadingService: LoadingService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    // No cargar usuarios aquí, se cargarán cuando se abra el diálogo
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  initForm(): void {
    this.conductorForm = this.fb.group({
      idUsuarioGestion: [null, [Validators.required]],
      licenciaNumero: ['', [Validators.required, Validators.maxLength(20)]],
      categoria: ['', [Validators.maxLength(10)]],
      telefonoContacto: ['', [Validators.maxLength(20)]],
      estado: ['activo', [Validators.maxLength(20)]]
    });
  }

  cargarUsuariosConductores(): void {
    this.loadingService.show();

    // Si estamos en modo edición, cargar todos los usuarios (para mostrar el actual)
    // Si estamos en modo creación, cargar solo los disponibles (no registrados)
    const observable = this.modoEdicion 
      ? this.usuarioGestionService.obtenerUsuariosPorRol('Conductor')
      : this.conductorService.obtenerUsuariosConductoresDisponibles();

    const sub = observable.subscribe({
      next: (usuarios) => {
        this.usuariosDisponibles = usuarios || [];
        this.loadingService.hide();
        if (!usuarios || usuarios.length === 0) {
          const mensaje = this.modoEdicion
            ? 'No se encontraron usuarios con rol "Conductor" activos.'
            : 'No hay usuarios conductores disponibles para registrar. Todos los conductores ya están registrados.';
          this.messageService.warn(mensaje, 'Sin usuarios disponibles', 6000);
        }
      },
      error: (error) => {
        this.loadingService.hide();
        const statusCode = error?.status || '';

        let detailMessage = '';
        if (statusCode === 403) {
          detailMessage = 'Acceso denegado. El token puede haber expirado o no ser válido. Por favor, inicie sesión nuevamente desde el sistema de gestión.';
        } else if (statusCode === 401) {
          detailMessage = 'No autorizado. El token ha expirado. Por favor, inicie sesión nuevamente.';
        } else {
          const errorMessage = error?.error?.mensaje || error?.error?.message || error?.message || 'Error desconocido';
          detailMessage = `Error al cargar usuarios: ${errorMessage}`;
        }

        this.messageService.error(detailMessage, `Error ${statusCode ? `(${statusCode})` : ''}`, 8000);
      }
    });
    this.subscriptions.push(sub);
  }

  showDialog(conductor?: Conductor): void {
    this.modoEdicion = !!conductor;
    this.conductorId = conductor?.idUsuarioGestion || null;
    this.visible = true;
    this.submitted = false;

    if (conductor) {
      // Cargar datos del conductor para editar
      this.conductorForm.patchValue({
        idUsuarioGestion: conductor.idUsuarioGestion,
        licenciaNumero: conductor.licenciaNumero,
        categoria: conductor.categoria || '',
        telefonoContacto: conductor.telefonoContacto || '',
        estado: conductor.estado
      });

      // Deshabilitar el campo de usuario en modo edición
      this.conductorForm.get('idUsuarioGestion')?.disable();
      
      // Cargar todos los usuarios (para mostrar el actual en modo edición)
      this.cargarUsuariosConductores();
    } else {
      // Resetear formulario para crear
      this.conductorForm.reset({
        estado: 'activo'
      });
      this.conductorForm.get('idUsuarioGestion')?.enable();
      
      // Cargar solo usuarios disponibles (no registrados) para crear
      this.cargarUsuariosConductores();
    }
  }

  hideDialog(): void {
    this.visible = false;
    this.submitted = false;
    this.modoEdicion = false;
    this.conductorId = null;
    this.conductorForm.reset({
      estado: 'activo'
    });
    this.conductorForm.get('idUsuarioGestion')?.enable();
  }

  guardar(): void {
    this.submitted = true;

    if (this.conductorForm.invalid) {
      this.messageService.warn('Por favor, complete todos los campos requeridos correctamente', 'Validación', 5000);
      return;
    }

    const conductorData: ConductorRequest = {
      idUsuarioGestion: this.conductorForm.value.idUsuarioGestion,
      licenciaNumero: this.conductorForm.value.licenciaNumero,
      categoria: this.conductorForm.value.categoria || undefined,
      telefonoContacto: this.conductorForm.value.telefonoContacto || undefined,
      estado: this.conductorForm.value.estado
    };

    this.loading = true;
    this.loadingService.show();

    if (this.modoEdicion && this.conductorId) {
      // Actualizar conductor existente
      const sub = this.conductorService.actualizarConductor(this.conductorId, conductorData).subscribe({
        next: () => {
          this.loading = false;
          this.loadingService.hide();
          this.messageService.success('Conductor actualizado correctamente', 'Éxito', 5000);
          this.hideDialog();
          this.conductorActualizado.emit();
        },
        error: (error) => {
          this.loading = false;
          this.loadingService.hide();
          const errorMessage = error?.error?.message || error?.message || 'Error al actualizar el conductor';
          this.messageService.error(errorMessage, 'Error', 6000);
        }
      });
      this.subscriptions.push(sub);
    } else {
      // Crear nuevo conductor
      const sub = this.conductorService.crearConductor(conductorData).subscribe({
        next: () => {
          this.loading = false;
          this.loadingService.hide();
          this.messageService.success('Conductor registrado correctamente', 'Registro exitoso', 5000);
          this.hideDialog();
          this.conductorCreado.emit();
        },
        error: (error) => {
          this.loading = false;
          this.loadingService.hide();
          const errorMessage = error?.error?.message || error?.message || 'Error al crear el conductor';
          this.messageService.error(errorMessage, 'Error', 6000);
        }
      });
      this.subscriptions.push(sub);
    }
  }

  get f() {
    return this.conductorForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.conductorForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  getUsuarioLabel(usuario: UsuarioGestion): string {
    return usuario.nombreCompleto || usuario.username || usuario.email || '';
  }

  onFieldChange(fieldName: string): void {
    const field = this.conductorForm.get(fieldName);
    if (field) {
      field.markAsTouched();
    }
  }
}

