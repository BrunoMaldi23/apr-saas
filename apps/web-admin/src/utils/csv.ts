import type { FilaSocioImportacion } from '@/types';

export interface CsvParseado {
  encabezados: string[];
  filas: string[][];
}

function divideLinea(linea: string, delimitador: string): string[] {
  const resultado: string[] = [];
  let actual = '';
  let entreComillas = false;

  for (let i = 0; i < linea.length; i += 1) {
    const caracter = linea[i];
    if (caracter === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        actual += '"';
        i += 1;
      } else {
        entreComillas = !entreComillas;
      }
    } else if (caracter === delimitador && !entreComillas) {
      resultado.push(actual.trim());
      actual = '';
    } else {
      actual += caracter;
    }
  }
  resultado.push(actual.trim());
  return resultado;
}

/** Cuenta separadores solo fuera de comillas (incluye comillas dobles escapadas). */
function contarDelimitadores(linea: string, delimitador: string): number {
  let total = 0;
  let entreComillas = false;

  for (let i = 0; i < linea.length; i += 1) {
    const caracter = linea[i];
    if (caracter === '"') {
      if (entreComillas && linea[i + 1] === '"') {
        i += 1;
      } else {
        entreComillas = !entreComillas;
      }
    } else if (caracter === delimitador && !entreComillas) {
      total += 1;
    }
  }
  return total;
}

function detectarDelimitador(linea: string): string {
  return contarDelimitadores(linea, ';') > 0 ? ';' : ',';
}

interface LineaNumerada {
  contenido: string;
  numero: number;
}

interface CsvInterno extends CsvParseado {
  numerosLinea: number[];
}

function parsearCsvInterno(texto: string): CsvInterno {
  const lineas: LineaNumerada[] = texto
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((contenido, indice) => ({ contenido, numero: indice + 1 }))
    .filter((linea) => linea.contenido.trim().length > 0);
  if (lineas.length === 0) return { encabezados: [], filas: [], numerosLinea: [] };

  const delimitador = detectarDelimitador(lineas[0].contenido);
  const encabezados = divideLinea(lineas[0].contenido, delimitador).map((h) =>
    h.toLowerCase().replaceAll(' ', '_').replaceAll('-', '_'),
  );
  const filasConNumero = lineas.slice(1);
  return {
    encabezados,
    filas: filasConNumero.map((linea) => divideLinea(linea.contenido, delimitador)),
    numerosLinea: filasConNumero.map((linea) => linea.numero),
  };
}

export function parsearCsv(texto: string): CsvParseado {
  const { encabezados, filas } = parsearCsvInterno(texto);
  return { encabezados, filas };
}

function indice(encabezados: string[], alias: string[]): number {
  return encabezados.findIndex((h) => alias.includes(h));
}

function valor(fila: string[], idx: number): string {
  return idx >= 0 ? (fila[idx] ?? '').trim() : '';
}

export function csvAFilas(texto: string): FilaSocioImportacion[] {
  const { encabezados, filas, numerosLinea } = parsearCsvInterno(texto);
  const mapa = {
    rut: indice(encabezados, ['rut']),
    nombre: indice(encabezados, ['nombre', 'nombre_socio']),
    direccion: indice(encabezados, ['direccion']),
    sector: indice(encabezados, ['sector']),
    telefono: indice(encabezados, ['telefono', 'fono']),
    decretoSap: indice(encabezados, ['decreto_sap', 'decretosap', 'decreto']),
    porcentajeSubsidio: indice(encabezados, ['porcentaje_subsidio', 'subsidio', 'porcentaje']),
    numeroMedidor: indice(encabezados, ['numero_medidor', 'medidor', 'numero']),
    digitos: indice(encabezados, ['digitos']),
    lecturaInicial: indice(encabezados, ['lectura_inicial', 'lectura']),
    ordenRuta: indice(encabezados, ['orden_ruta', 'orden']),
  };

  return filas.map((fila, index) => {
    const filaSocio: FilaSocioImportacion = {
      fila: numerosLinea[index] ?? index + 2,
      rut: valor(fila, mapa.rut),
      nombre: valor(fila, mapa.nombre),
      direccion: valor(fila, mapa.direccion),
      sector: valor(fila, mapa.sector),
      numeroMedidor: valor(fila, mapa.numeroMedidor),
    };
    const telefono = valor(fila, mapa.telefono);
    const decreto = valor(fila, mapa.decretoSap);
    const subsidio = valor(fila, mapa.porcentajeSubsidio);
    const digitos = valor(fila, mapa.digitos);
    const lectura = valor(fila, mapa.lecturaInicial);
    const orden = valor(fila, mapa.ordenRuta);

    if (telefono) filaSocio.telefono = telefono;
    if (decreto) filaSocio.decretoSap = decreto;
    if (subsidio !== '') filaSocio.porcentajeSubsidio = Number(subsidio);
    if (digitos !== '') filaSocio.digitos = Number(digitos);
    if (lectura !== '') filaSocio.lecturaInicial = Number(lectura);
    if (orden !== '') filaSocio.ordenRuta = Number(orden);
    return filaSocio;
  });
}

export function calcularDigitoVerificador(cuerpo: string): string {
  const factores = [2, 3, 4, 5, 6, 7, 2, 3];
  let suma = 0;
  let indice = cuerpo.length - 1;
  let factor = 0;
  while (indice >= 0) {
    suma += Number(cuerpo[indice]) * factores[factor];
    indice -= 1;
    factor += 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

export function rutEsValido(rut: string): boolean {
  if (typeof rut !== 'string') return false;
  const texto = rut.trim();
  // Solo se admiten dígitos, puntos, guion y K como dígito verificador.
  if (!/^[0-9kK.-]+$/.test(texto)) return false;
  const limpio = texto.replace(/[^0-9kK]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false;
  const cuerpo = limpio.slice(0, -1);
  return limpio.slice(-1) === calcularDigitoVerificador(cuerpo);
}

export interface ErrorFila {
  fila: number;
  campo: string;
  mensaje: string;
}

export function validarFilas(filas: FilaSocioImportacion[]): ErrorFila[] {
  const errores: ErrorFila[] = [];
  const ruts = new Set<string>();
  const medidores = new Set<string>();
  const agregar = (fila: number, campo: string, mensaje: string): void => {
    errores.push({ fila, campo, mensaje });
  };

  for (const fila of filas) {
    const numero = fila.fila ?? 0;

    if (!rutEsValido(fila.rut)) {
      agregar(numero, 'RUT', 'RUT inválido (dígito verificador)');
    }
    if (ruts.has(fila.rut)) {
      agregar(numero, 'RUT', 'repetido en el archivo');
    }
    ruts.add(fila.rut);

    if (!fila.nombre?.trim()) {
      agregar(numero, 'Nombre', 'obligatorio');
    }
    if (!fila.direccion?.trim()) {
      agregar(numero, 'Dirección', 'obligatoria');
    }
    if (!fila.numeroMedidor?.trim()) {
      agregar(numero, 'N° de medidor', 'obligatorio');
    }
    if (medidores.has(fila.numeroMedidor)) {
      agregar(numero, 'N° de medidor', 'repetido en el archivo');
    }
    medidores.add(fila.numeroMedidor);

    if (!fila.sector?.trim()) {
      agregar(numero, 'Sector', 'obligatorio');
    }
    if (fila.porcentajeSubsidio !== undefined) {
      if (!Number.isFinite(fila.porcentajeSubsidio)) {
        agregar(numero, 'Subsidio (%)', 'debe ser numérico');
      } else if (fila.porcentajeSubsidio < 0 || fila.porcentajeSubsidio > 100) {
        agregar(numero, 'Subsidio (%)', 'debe estar entre 0 y 100');
      }
    }
    if (fila.digitos !== undefined) {
      if (!Number.isFinite(fila.digitos)) {
        agregar(numero, 'Dígitos', 'deben ser numéricos');
      } else if (![4, 5].includes(fila.digitos)) {
        agregar(numero, 'Dígitos', 'deben ser 4 o 5');
      }
    }
    if (fila.lecturaInicial !== undefined) {
      if (!Number.isFinite(fila.lecturaInicial)) {
        agregar(numero, 'Lectura inicial (m³)', 'debe ser numérica');
      } else if (fila.lecturaInicial < 0) {
        agregar(numero, 'Lectura inicial (m³)', 'debe ser mayor o igual a 0');
      }
    }
  }

  return errores;
}

export const PLANTILLA_CSV =
  'rut;nombre;direccion;sector;telefono;decreto_sap;porcentaje_subsidio;numero_medidor;digitos;lectura_inicial;orden_ruta\n';
