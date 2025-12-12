import { Component, OnInit, OnDestroy, Output, EventEmitter, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NotificacionDTO, Notificacion } from '../../interfaces/notificacion.interface';
import { NotificacionService } from '../../services/notificacion.service';
import { AplicacionService } from '../../services/aplicacion.service';
import { UsuarioService } from '../../services/usuario.service';
import { AuthUserService } from '../../../../../core/services/auth-user.service';
import { MessageService } from 'primeng/api';
import { LoadingService } from '../../../../../shared/services/loading.service';
import { PrimeNGModules } from '../../../../../prime-ng/prime-ng';
import { Subscription } from 'rxjs';
import { environment } from '../../../../../../environment/environment';

@Component({
  selector: 'app-notificacion-form',
  standalone: true,
  imports: [
    ...PrimeNGModules,
    ReactiveFormsModule
  ],
  providers: [MessageService],
  templateUrl: './notificacion-form.component.html',
  styleUrl: './notificacion-form.component.css'
})
export class NotificacionFormComponent implements OnInit, OnDestroy {
  @Output() notificacionCreada = new EventEmitter<void>();
  @Output() notificacionActualizada = new EventEmitter<void>();

  notificacionForm!: FormGroup;
  visible: boolean = false;
  submitted: boolean = false;
  modoEdicion: boolean = false;
  notificacionId: number | null = null;
  idUsuario: number | null = null;
  idAplicacion: number | null = null;
  usuarios: any[] = [];
  usuariosSeleccionados: number[] = [];
  private subscriptions: Subscription[] = [];

  tiposNotificacion = [
    { label: 'Info', value: 'info' },
    { label: 'Warning', value: 'warning' },
    { label: 'Error', value: 'error' },
    { label: 'Success', value: 'success' },
    { label: 'Critical', value: 'critical' }
  ];

  prioridades = [
    { label: 'Baja', value: 'baja' },
    { label: 'Normal', value: 'normal' },
    { label: 'Alta', value: 'alta' },
    { label: 'Urgente', value: 'urgente' }
  ];

  constructor(
    private fb: FormBuilder,
    private notificacionService: NotificacionService,
    private aplicacionService: AplicacionService,
    private usuarioService: UsuarioService,
    private authUserService: AuthUserService,
    private messageService: MessageService,
    private loadingService: LoadingService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.idUsuario = this.authUserService.obtenerIdUsuario();
    this.cargarAplicacion();
    this.cargarUsuarios();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  initForm(): void {
    this.notificacionForm = this.fb.group({
      titulo: ['', [Validators.required, Validators.maxLength(200)]],
      mensaje: ['', [Validators.required, Validators.maxLength(1000)]],
      tipoNotificacion: ['info', [Validators.required]],
      prioridad: ['normal', [Validators.required]],
      fechaExpiracion: [null],
      fechaEnvio: [null],
      requiereConfirmacion: [false],
      mostrarComoRecordatorio: [true],
      activo: [true]
    });
  }

  cargarAplicacion(): void {
    this.loadingService.show();
    this.aplicacionService.obtenerPorCodigo(environment.codigoSistema).subscribe({
      next: (aplicacion) => {
        this.idAplicacion = aplicacion.idAplicacion;
        this.loadingService.hide();
      },
      error: (error) => {
        this.loadingService.hide();
        const errorMessage = error?.message || error?.error?.message || 'Error al cargar la aplicación';
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: errorMessage,
          life: 5000
        });
      }
    });
  }

  cargarUsuarios(): void {
    this.usuarioService.listar().subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios
          .filter(u => u.activo)
          .map(u => ({
            label: `${u.nombreCompleto || u.username} (${u.email})`,
            value: u.idUsuario
          }));
      },
      error: (error) => {
        console.error('Error al cargar usuarios:', error);
      }
    });
  }

  showDialog(notificacion?: Notificacion): void {
    this.modoEdicion = !!notificacion;
    this.notificacionId = notificacion?.idNotificacion || null;
    this.visible = true;
    this.submitted = false;
    this.usuariosSeleccionados = [];

    if (notificacion) {
      // Cargar datos de la notificación para editar
      this.notificacionForm.patchValue({
        titulo: notificacion.titulo,
        mensaje: notificacion.mensaje,
        tipoNotificacion: notificacion.tipoNotificacion,
        prioridad: notificacion.prioridad,
        fechaExpiracion: notificacion.fechaExpiracion ? new Date(notificacion.fechaExpiracion) : null,
        fechaEnvio: notificacion.fechaEnvio ? new Date(notificacion.fechaEnvio) : null,
        requiereConfirmacion: notificacion.requiereConfirmacion,
        mostrarComoRecordatorio: notificacion.mostrarComoRecordatorio,
        activo: notificacion.activo
      });
    } else {
      // Resetear formulario para crear
      this.notificacionForm.reset({
        tipoNotificacion: 'info',
        prioridad: 'normal',
        requiereConfirmacion: false,
        mostrarComoRecordatorio: true,
        activo: true
      });
    }
  }

  hideDialog(): void {
    this.visible = false;
    this.submitted = false;
    this.modoEdicion = false;
    this.notificacionId = null;
    this.usuariosSeleccionados = [];
    this.notificacionForm.reset({
      tipoNotificacion: 'info',
      prioridad: 'normal',
      requiereConfirmacion: false,
      mostrarComoRecordatorio: true,
      activo: true
    });
  }

  guardar(): void {
    this.submitted = true;

    if (this.notificacionForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Por favor, complete todos los campos requeridos correctamente',
        life: 5000
      });
      return;
    }

    if (!this.idUsuario || !this.idAplicacion) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo obtener el usuario o la aplicación',
        life: 5000
      });
      return;
    }

    if (this.usuariosSeleccionados.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validación',
        detail: 'Debe seleccionar al menos un usuario destinatario',
        life: 5000
      });
      return;
    }

    const formValue = this.notificacionForm.value;
    const notificacionDTO: NotificacionDTO = {
      titulo: formValue.titulo,
      mensaje: formValue.mensaje,
      tipoNotificacion: formValue.tipoNotificacion,
      prioridad: formValue.prioridad,
      idAplicacion: this.idAplicacion,
      creadoPor: this.idUsuario,
      fechaExpiracion: formValue.fechaExpiracion ? formValue.fechaExpiracion.toISOString() : null,
      fechaEnvio: formValue.fechaEnvio ? formValue.fechaEnvio.toISOString() : null,
      requiereConfirmacion: formValue.requiereConfirmacion || false,
      mostrarComoRecordatorio: formValue.mostrarComoRecordatorio !== false,
      activo: formValue.activo !== false,
      idUsuarios: this.usuariosSeleccionados
    };

    this.loadingService.show();

    if (this.modoEdicion && this.notificacionId) {
      // Actualizar notificación existente
      const sub = this.notificacionService.actualizar(this.notificacionId, notificacionDTO).subscribe({
        next: () => {
          this.loadingService.hide();
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Notificación actualizada correctamente',
            life: 5000
          });
          this.hideDialog();
          this.notificacionActualizada.emit();
        },
        error: (error) => {
          this.loadingService.hide();
          const errorMessage = error?.message || error?.error?.message || 'Error al actualizar la notificación';
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
      // Crear nueva notificación
      const sub = this.notificacionService.crear(notificacionDTO).subscribe({
        next: () => {
          this.loadingService.hide();
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Notificación creada correctamente',
            life: 5000
          });
          this.hideDialog();
          this.notificacionCreada.emit();
        },
        error: (error) => {
          this.loadingService.hide();
          const errorMessage = error?.message || error?.error?.message || 'Error al crear la notificación';
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
    return this.notificacionForm.controls;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.notificacionForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }
}

