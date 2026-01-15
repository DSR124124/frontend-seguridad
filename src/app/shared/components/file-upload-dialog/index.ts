// Barrel exports - Punto único de entrada para FileUploadDialog

// Main Component
export { FileUploadDialogComponent } from './file-upload-dialog.component';

// Models (incluye todas las interfaces)
export * from './models';

// Services
export { FileUploadDialogService } from './services/file-upload-dialog.service';
export { FileUploadDialogStateService } from './services/file-upload-dialog-state.service';

// Child Components (por si se necesitan usar de forma independiente)
export { FileDropZoneComponent } from './components/file-drop-zone/file-drop-zone.component';
export { EditableDataTableComponent } from './components/editable-data-table/editable-data-table.component';
export { FileUploadDialogFooterComponent } from './components/dialog-footer/dialog-footer.component';
