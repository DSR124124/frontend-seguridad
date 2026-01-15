export interface ThemeDefinition {
  name: string;
  className: string; // Clase CSS que se aplicará al <html>
}

export interface ThemeColors {
  colorPrimario: string;
  textoPrimario: string;
  headerColor: string;
  textoHeader: string;
  footerColor: string;
  textoFooter: string;
  sidebarColor: string;
  textoSidebar: string;
  mainContentColor: string;
  textoContent: string;
}

export const DEFAULT_THEMES = [
  { name: 'Claro (Nettalco)', className: 'my-app-light' },
  { name: 'Oscuro', className: 'my-app-dark' },
  { name: 'Mint', className: 'my-app-mint' },
  // Pueden agregarse más dinámicamente
];

// Utilidad para obtener solo los className:
export const THEME_CLASS_NAMES = DEFAULT_THEMES.map(t => t.className);
