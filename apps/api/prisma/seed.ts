import { PrismaClient, EstadoCobro, MedioPago, Rol, EstadoCiclo, Incidencia } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DateTime } from 'luxon';
import { RutUtils } from '../src/common/utils/rut';
import { calcularCobro } from '../src/common/domain/tarifa';
import {
  ZONA_HORARIA,
  periodoActual,
  periodoAnterior,
} from '../src/common/utils/tiempo';

const prisma = new PrismaClient();

const SECTORES = [
  'Camino a Parga',
  'Sector Tegualda Centro',
  'Cruce Polizones',
  'Las Quemas',
];

const NOMBRES: Array<[string, string]> = [
  ['María Elena', 'González Ruiz'],
  ['Juan Carlos', 'Muñoz Sepúlveda'],
  ['Rosa Amelia', 'Cárcamo Vargas'],
  ['Luis Alberto', 'Bravo Figueroa'],
  ['Carmen Gloria', 'Álvarez Ríos'],
  ['Pedro Antonio', 'San Martín Neira'],
  ['Jacqueline', 'Fuentes Cortés'],
  ['Miguel Ángel', 'Oyarzún Díaz'],
  ['Patricia Irene', 'Ruiz Menchaca'],
  ['Sergio Alejandro', 'Vera Palacios'],
  ['Ana María', 'Torres Beltrán'],
  ['Jorge Luis', 'Hernández Silva'],
  ['Silvia Andrea', 'Morales Gaete'],
  ['Roberto Carlos', 'Pérez Lazo'],
  ['Marta Lucía', 'Soto Arriagada'],
  ['Fernando José', 'Valdivia Cruz'],
  ['Liliana Verónica', 'Castaño Muñoz'],
  ['Ricardo Andrés', 'Flores Sáez'],
  ['Elsa del Carmen', 'Navarro Pineda'],
  ['Claudio Marcelo', 'Rojas Campusano'],
  ['Gabriela Andrea', 'Vásquez Lira'],
  ['Héctor Manuel', 'Contreras Araya'],
  ['Yolanda Patricia', 'Ferrada Uribe'],
  ['Iván Mauricio', 'Díaz Sandoval'],
  ['Bernarda del Pilar', 'Espinoza Riquelme'],
];

async function applyRls(): Promise<void> {
  const sql = readFileSync(join(__dirname, 'rls.sql'), 'utf8');
  const sinComentarios = sql
    .split('\n')
    .filter((linea) => !linea.trimStart().startsWith('--'))
    .join('\n');

  const sentencias = sinComentarios
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const sentencia of sentencias) {
    await prisma.$executeRawUnsafe(sentencia);
  }
}

async function limpiar(): Promise<void> {
  await prisma.pago.deleteMany();
  await prisma.cobro.deleteMany();
  await prisma.lectura.deleteMany();
  await prisma.cicloFacturacion.deleteMany();
  await prisma.medidor.deleteMany();
  await prisma.socio.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.comite.deleteMany();
}

async function main(): Promise<void> {
  console.log('→ Aplicando políticas RLS...');
  await applyRls();

  console.log('→ Limpiando datos demo anteriores...');
  await limpiar();

  console.log('→ Creando comité APR...');
  const comite = await prisma.comite.create({
    data: {
      nombre: 'Comité APR Agua Pura Tegualda',
      rut: RutUtils.normalizar(`76543210-${RutUtils.calcularDigitoVerificador('76543210')}`),
      comuna: 'Fresia',
      region: 'Los Lagos',
      direccion: 'Sector Tegualda Centro s/n, Fresia',
      cargoFijoClp: 3500,
      tarifaM3Clp: 650,
      topeSubsidioM3: 15,
      porcentajeSubsidioDefault: 50,
    },
  });

  await prisma.usuario.create({
    data: {
      comiteId: comite.id,
      rut: RutUtils.normalizar(`11111111-${RutUtils.calcularDigitoVerificador('11111111')}`),
      nombre: 'Ana María González (Tesorera)',
      email: 'admin@aprtegualda.cl',
      passwordHash: bcrypt.hashSync('Admin1234!', 10),
      rol: Rol.ADMIN,
    },
  });

  await prisma.usuario.create({
    data: {
      comiteId: comite.id,
      rut: RutUtils.normalizar(`22222222-${RutUtils.calcularDigitoVerificador('22222222')}`),
      nombre: 'Carlos Alberto Rojas (Operador)',
      email: 'operador@aprtegualda.cl',
      passwordHash: bcrypt.hashSync('Operador1234!', 10),
      rol: Rol.OPERADOR,
    },
  });

  console.log('→ Creando 25 socios y medidores con orden de ruta...');
  const sociosCreados: Array<{ id: string; medidorId: string; numero: string; lecturaInicial: number; digitos: number; porcentajeSubsidio: number; nombre: string; decretoSap: string | null }> = [];

  for (let i = 0; i < NOMBRES.length; i += 1) {
    const [nombre, apellido] = NOMBRES[i];
    const cuerpoRut = String(10_234_567 + i * 137);
    const rut = RutUtils.normalizar(`${cuerpoRut}-${RutUtils.calcularDigitoVerificador(cuerpoRut)}`);
    const porcentajeSubsidio = [0, 50, 100][i % 3];
    const sector = SECTORES[i % SECTORES.length];
    const medidorDigitos = i >= 20 ? 5 : 4;
    const lecturaInicial = medidorDigitos === 5 ? 10_000 + i * 53 : 1_200 + i * 37;

    const socio = await prisma.socio.create({
      data: {
        comiteId: comite.id,
        rut,
        nombre,
        direccion: `${sector}, casa ${i + 1}`,
        sector,
        telefono: `+56 9 ${String(81_000_000 + i * 1234)}`,
        decretoSap: porcentajeSubsidio > 0 ? `SAP-2026-${String(100 + i)}` : null,
        porcentajeSubsidio,
        activo: true,
        fechaIngreso: DateTime.now().setZone(ZONA_HORARIA).minus({ months: 18 - (i % 18) }).toJSDate(),
      },
    });

    const medidor = await prisma.medidor.create({
      data: {
        comiteId: comite.id,
        socioId: socio.id,
        numero: `APR-${String(1001 + i)}`,
        digitos: medidorDigitos,
        lecturaInicial,
        ordenRuta: i + 1,
        activo: true,
        fechaInstalacion: DateTime.now().setZone(ZONA_HORARIA).minus({ months: 17 - (i % 18) }).toJSDate(),
      },
    });

    sociosCreados.push({
      id: socio.id,
      medidorId: medidor.id,
      numero: medidor.numero,
      lecturaInicial,
      digitos: medidorDigitos,
      porcentajeSubsidio,
      nombre: `${nombre} ${apellido}`,
      decretoSap: porcentajeSubsidio > 0 ? `SAP-2026-${String(100 + i)}` : null,
    });
  }

  console.log('→ Creando 2 ciclos históricos cerrados y 1 ciclo abierto...');
  const periodo = periodoActual();
  const periodosHistoricos = [periodoAnterior(periodo, 2), periodoAnterior(periodo, 1)];

  const ciclosHistoricos = [];
  for (const per of periodosHistoricos) {
    const dt = DateTime.fromFormat(per, 'yyyy-MM', { zone: ZONA_HORARIA });
    ciclosHistoricos.push(
      await prisma.cicloFacturacion.create({
        data: {
          comiteId: comite.id,
          periodo: per,
          estado: EstadoCiclo.CERRADO,
          fechaApertura: dt.set({ day: 1 }).startOf('day').toJSDate(),
          fechaCierre: dt.endOf('month').toJSDate(),
        },
      }),
    );
  }

  const cicloActual = await prisma.cicloFacturacion.create({
    data: {
      comiteId: comite.id,
      periodo: periodo,
      estado: EstadoCiclo.ABIERTO,
      fechaApertura: DateTime.now().setZone(ZONA_HORARIA).startOf('month').toJSDate(),
    },
  });

  console.log('→ Generando lecturas y cobros históricos...');
  let lecturaAnteriorAcumulada = new Map<string, number>();

  for (let cicloIndex = 0; cicloIndex < ciclosHistoricos.length; cicloIndex += 1) {
    const ciclo = ciclosHistoricos[cicloIndex];
    const dt = DateTime.fromFormat(ciclo.periodo, 'yyyy-MM', { zone: ZONA_HORARIA });

    for (let i = 0; i < sociosCreados.length; i += 1) {
      const socio = sociosCreados[i];
      const anterior = lecturaAnteriorAcumulada.get(socio.medidorId) ?? socio.lecturaInicial;
      const consumo = cicloIndex === 0 ? 6 + (i % 6) * 2 : 7 + ((i + 2) % 7) * 2;
      const actual = anterior + consumo;

      await prisma.lectura.create({
        data: {
          comiteId: comite.id,
          cicloId: ciclo.id,
          medidorId: socio.medidorId,
          clientUuid: `seed-h${cicloIndex}-m${String(i + 1).padStart(3, '0')}`,
          lecturaAnterior: anterior,
          lecturaActual: actual,
          consumoM3: consumo,
          incidencia: Incidencia.NINGUNA,
          tomadaEn: dt.set({ day: 12 + (i % 10), hour: 9, minute: 30 }).toJSDate(),
          sincronizadaEn: dt.set({ day: 13 + (i % 10) }).toJSDate(),
        },
      });

      lecturaAnteriorAcumulada.set(socio.medidorId, actual);

      const detalle = calcularCobro({
        cargoFijoClp: comite.cargoFijoClp,
        tarifaM3Clp: comite.tarifaM3Clp,
        topeSubsidioM3: comite.topeSubsidioM3,
        porcentajeSubsidio: socio.porcentajeSubsidio,
        consumoM3: consumo,
        saldoAnteriorClp: 0,
      });

      let estado: EstadoCobro = EstadoCobro.PAGADO;
      let saldoPendiente = 0;
      let montoPago = detalle.totalAPagarClp;

      if (cicloIndex === 1) {
        if (i % 4 === 0) {
          estado = EstadoCobro.PARCIAL;
          montoPago = Math.round(detalle.totalAPagarClp * 0.5);
          saldoPendiente = detalle.totalAPagarClp - montoPago;
        } else if (i % 5 === 0) {
          estado = EstadoCobro.PENDIENTE;
          montoPago = 0;
          saldoPendiente = detalle.totalAPagarClp;
        }
      }

      await prisma.cobro.create({
        data: {
          comiteId: comite.id,
          cicloId: ciclo.id,
          socioId: socio.id,
          medidorId: socio.medidorId,
          lecturaAnterior: anterior,
          lecturaActual: actual,
          consumoM3: consumo,
          cargoFijoClp: comite.cargoFijoClp,
          consumoVariableClp: detalle.consumoVariableClp,
          subtotalClp: detalle.subtotalClp,
          m3Subsidiados: detalle.m3Subsidiados,
          baseSubsidiableClp: detalle.baseSubsidiableClp,
          porcentajeSubsidio: socio.porcentajeSubsidio,
          descuentoSapClp: detalle.descuentoSapClp,
          saldoAnteriorClp: 0,
          totalAPagarClp: detalle.totalAPagarClp,
          saldoPendienteClp: saldoPendiente,
          estado,
          decretoSap: socio.decretoSap,
          fechaEmision: dt.set({ day: 2 }).toJSDate(),
          fechaVencimiento: dt.set({ day: 20 }).endOf('day').toJSDate(),
        },
      });

      if (montoPago > 0) {
        await prisma.pago.create({
          data: {
            comiteId: comite.id,
            socioId: socio.id,
            cobroId: (await prisma.cobro.findUniqueOrThrow({
              where: { comiteId_cicloId_socioId: { comiteId: comite.id, cicloId: ciclo.id, socioId: socio.id } },
              select: { id: true },
            })).id,
            montoClp: montoPago,
            medioPago: i % 2 === 0 ? MedioPago.EFECTIVO : MedioPago.TRANSFERENCIA,
            fechaPago: dt.set({ day: 18 }).toJSDate(),
            referencia: 'Pago registrado en seed',
            comprobanteNumero: `SEED-${ciclo.periodo}-${String(i + 1).padStart(3, '0')}`,
          },
        });
      }
    }
  }

  console.log('');
  console.log('✓ Seed completado');
  console.log(`  Comité: ${comite.nombre} (${comite.comuna}, ${comite.region})`);
  console.log('  Admin:   admin@aprtegualda.cl / Admin1234!');
  console.log('  Operador: operador@aprtegualda.cl / Operador1234!');
  console.log(`  25 socios · 25 medidores · 2 ciclos cerrados · ciclo ${cicloActual.periodo} ABIERTO`);
}

main()
  .catch((error) => {
    console.error('✗ Error en seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
