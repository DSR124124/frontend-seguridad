import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/**
 * Preset personalizado de Nettalco basado en Aura
 * Utiliza los colores de branding de Nettalco
 */
export const NettalcoPreset = definePreset(Aura, {
  semantic: {
    // Paleta primaria basada en navy-dark (#1c224d)
    primary: {
      50: '#e8e9f0',
      100: '#c4c7d9',
      200: '#9da2bf',
      300: '#767da5',
      400: '#586191',
      500: '#1c224d', // Navy Dark - Color principal
      600: '#161b3f',
      700: '#111530',
      800: '#0d0f22',
      900: '#080a14',
      950: '#040509'
    },
    // Color scheme para light y dark mode
    colorScheme: {
      light: {
        // Colores semánticos para modo claro
        primary: {
          color: '#1c224d', // Navy Dark
          inverseColor: '#ffffff',
          hoverColor: '#161b3f',
          activeColor: '#111530'
        },
        // Highlight (para selecciones, focus, etc.)
        highlight: {
          background: '#4a7aff', // Blue Light
          focusBackground: '#2954ff', // Blue Darker
          color: '#ffffff',
          focusColor: '#ffffff'
        },
        // Surface colors (fondos)
        surface: {
          0: '#ffffff',
          50: '#f7fafc', // Gray Light
          100: '#edf2f7', // Gray Lighter
          200: '#e6e6e6', // Light Gray
          300: '#cbd5e0',
          400: '#a0aec0',
          500: '#7a7a7a', // Gray Medium
          600: '#4a5568', // Gray Dark
          700: '#2d3748',
          800: '#1a202c',
          900: '#171923',
          950: '#0a0e1a'
        },
        // Form fields
        formField: {
          hoverBorderColor: '{primary.color}',
          focusBorderColor: '{primary.color}'
        }
      },
      dark: {
        // Colores semánticos para modo oscuro
        primary: {
          color: '#4a7aff', // Blue Light (más visible en dark)
          inverseColor: '#1c224d',
          hoverColor: '#6b8fff', // Blue Lighter
          activeColor: '#2954ff' // Blue Darker
        },
        // Highlight para modo oscuro
        highlight: {
          background: '#4a7aff',
          focusBackground: '#6b8fff',
          color: '#ffffff',
          focusColor: '#ffffff'
        },
        // Surface colors para modo oscuro
        surface: {
          0: '#1a202c', // Fondo principal oscuro
          50: '#f7fafc', // Tono claro para header/sidebar/footer
          100: '#edf2f7', // Tono claro alternativo
          200: '#e2e8f0', // Tono claro más suave
          300: '#cbd5e0',
          400: '#a0aec0',
          500: '#718096',
          600: '#4a5568',
          700: '#2d3748',
          800: '#1a202c',
          900: '#171923',
          950: '#0a0e1a'
        },
        // Form fields para modo oscuro
        formField: {
          hoverBorderColor: '{primary.color}',
          focusBorderColor: '{primary.color}'
        }
      }
    },
    // Focus ring personalizado
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.color}',
      offset: '2px'
    }
  }
});
