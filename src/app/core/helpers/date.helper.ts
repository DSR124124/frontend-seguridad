export function formatDateForBackend(date: any): string {
  if (!date) return '';

  // Si ya es un string, verificar si está en formato dd/mm/yyyy o ISO y convertir
  if (typeof date === 'string') {
    // Si ya está en formato dd/mm/yyyy, devolverla tal como está
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
      return date;
    }

    // Si está en formato ISO (2025-04-01T05:00:00.000Z), convertir
    if (date.includes('T') || date.includes('-')) {
      try {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
          const day = dateObj.getDate().toString().padStart(2, '0');
          const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
          const year = dateObj.getFullYear();
          return `${day}/${month}/${year}`;
        }
      } catch {
        // Si falla la conversión, continuar con la lógica genérica
      }
    }

    return date; // Devolver tal como está si no se puede convertir
  }

  // Si es un objeto Date, formatearlo
  if (date instanceof Date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  // Si es otro tipo, intentar convertir a Date
  try {
    const dateObj = new Date(date as any);
    if (!isNaN(dateObj.getTime())) {
      const day = dateObj.getDate().toString().padStart(2, '0');
      const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
      const year = dateObj.getFullYear();

      return `${day}/${month}/${year}`;
    }
  } catch {
    // Ignorar y devolver vacío
  }

  return '';
}

/**
 * Convierte una fecha a formato dd/mm/yyyy para comparación
 */
export function formatDateForComparison(date: any): string {
  if (!date) return '';

  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';

    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear().toString();

    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

/**
 * Convierte formato de fecha corto (ddmmyy o ddmm) a formato completo (dd/mm/yyyy)
 */
export function convertShortDateFormat(input: string): string {
  if (!input || input.trim() === '') {
    return input;
  }

  const cleanInput = input.trim();

  // Si el input tiene exactamente 6 dígitos, convertirlo al formato dd/mm/yyyy
  if (/^\d{6}$/.test(cleanInput)) {
    const day = cleanInput.substring(0, 2);
    const month = cleanInput.substring(2, 4);
    const year = cleanInput.substring(4, 6);

    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);

    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
      return input;
    }

    // Asumir que años 00-30 son 2000-2030, años 31-99 son 1931-1999
    const fullYear = parseInt(year, 10) <= 30 ? `20${year}` : `19${year}`;

    return `${day}/${month}/${fullYear}`;
  }

  // Si el input tiene 4 dígitos, asumir que es ddmm del año actual
  if (/^\d{4}$/.test(cleanInput)) {
    const day = cleanInput.substring(0, 2);
    const month = cleanInput.substring(2, 4);
    const currentYear = new Date().getFullYear();

    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);

    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
      return input;
    }

    return `${day}/${month}/${currentYear}`;
  }

  return input;
}

/**
 * Convierte formato de fecha corto (ddmmyy) a objeto Date
 */
export function convertShortDateToDate(dateString: string): Date | null {
  if (!dateString || dateString.length !== 6) {
    return null;
  }

  const day = parseInt(dateString.substring(0, 2), 10);
  const month = parseInt(dateString.substring(2, 4), 10) - 1; // 0-indexado
  const year = parseInt(dateString.substring(4, 6), 10);

  if (day < 1 || day > 31 || month < 0 || month > 11) {
    return null;
  }

  // Asumir que años 00-30 son 2000-2030, años 31-99 son 1931-1999
  const fullYear = year <= 30 ? 2000 + year : 1900 + year;

  const date = new Date(fullYear, month, day);

  if (date.getFullYear() !== fullYear || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return date;
}

/**
 * Función de filtro personalizado para fechas que PrimeNG puede usar
 */
export function customDateFilter(value: any, filter: string): boolean {
  if (!filter || filter.trim() === '') {
    return true;
  }

  const formattedValue = formatDateForComparison(value);
  if (!formattedValue) return false;

  const filterValue = filter.trim();

  // Convertir el valor de entrada al formato completo si es necesario
  const convertedFilter = convertShortDateFormat(filterValue);

  // 1. Coincidencia exacta con formato completo
  if (formattedValue === convertedFilter) {
    return true;
  }

  // 2. Coincidencia parcial con formato completo (contiene)
  if (convertedFilter !== filterValue && formattedValue.includes(convertedFilter)) {
    return true;
  }

  // 3. Filtros específicos según longitud
  const parts = formattedValue.split('/');
  const day = parts[0];
  const month = parts[1];
  const year = parts[2];
  const shortYear = year ? year.slice(-2) : '';

  // Para filtros de 1-2 dígitos (día específico)
  if (filterValue.length <= 2) {
    const paddedFilter = filterValue.padStart(2, '0');
    return day === paddedFilter;
  }

  // Para filtros de exactamente 4 dígitos (ddmm)
  if (filterValue.length === 4) {
    const dayMonth = `${day}${month}`;
    return dayMonth === filterValue;
  }

  // Para filtros de exactamente 6 dígitos (ddmmyy)
  if (filterValue.length === 6) {
    const dayMonthYear = `${day}${month}${shortYear}`;
    return dayMonthYear === filterValue;
  }

  return false;
}


