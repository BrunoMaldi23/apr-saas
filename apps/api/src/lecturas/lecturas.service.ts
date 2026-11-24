import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Incidencia, Prisma } from '@prisma/client';
import { DateTime } from 'luxon';
import { calcularConsumo, promedio3mDesdeLecturas } from '../common/domain/consumo';
import { TenantStorage } from '../common/tenant/tenant-storage';
import { ZONA_HORARIA, ahoraSantiago } from '../common/utils/tiempo';
import { SyncLecturasDto } from './dto/sync-lecturas.dto';

@Injectable()
export class LecturasService {
  constructor(private readonly tenant: TenantStorage) {}

  async sincronizar(dto: SyncLecturasDto) {
    const tx = this.tenant.tx;
    const comiteId = this.tenant.comiteId;

    const ciclo = await tx.cicloFacturacion.findFirst({
      where: { id: dto.ciclo_id, comiteId },
    });
    if (!ciclo) throw new NotFoundException('Ciclo no encontrado');
    if (ciclo.estado === 'CERRADO') {
      throw new BadRequestException('El ciclo está cerrado; no se pueden recibir lecturas');
    }

    let creadas = 0;
    let duplicados = 0;
    const errores: Array<{ client_uuid: string; mensaje: string }> = [];

    for (const lectura of dto.lecturas) {
      const existente = await tx.lectura.findUnique({
        where: { comiteId_clientUuid: { comiteId, clientUuid: lectura.client_uuid } },
        select: { id: true },
      });
      if (existente) {
        duplicados += 1;
        continue;
      }

      const yaTomada = await tx.lectura.findUnique({
        where: {
          comiteId_cicloId_medidorId: { comiteId, cicloId: ciclo.id, medidorId: lectura.medidor_id },
        },
        select: { id: true },
      });
      if (yaTomada) {
        duplicados += 1;
        continue;
      }

      const medidor = await tx.medidor.findFirst({
        where: { id: lectura.medidor_id, comiteId, activo: true },
      });
      if (!medidor) {
        errores.push({ client_uuid: lectura.client_uuid, mensaje: 'Medidor no encontrado o inactivo' });
        continue;
      }

      const fechaTomada = DateTime.fromISO(lectura.tomada_en, { zone: ZONA_HORARIA });
      if (!fechaTomada.isValid) {
        errores.push({ client_uuid: lectura.client_uuid, mensaje: 'tomada_en no es una fecha válida' });
        continue;
      }

      const ultima = await tx.lectura.findFirst({
        where: { comiteId, medidorId: medidor.id },
        orderBy: { tomadaEn: 'desc' },
        select: { lecturaActual: true },
      });
      const lecturaAnterior = ultima?.lecturaActual ?? medidor.lecturaInicial;

      const historial = await tx.lectura.findMany({
        where: { comiteId, medidorId: medidor.id },
        orderBy: { tomadaEn: 'desc' },
        take: 10,
        select: { consumoM3: true, esEstimada: true, incidencia: true },
      });
      const promedio = Math.round(
        promedio3mDesdeLecturas(
          historial.map((h) => ({
            consumoM3: h.consumoM3,
            esEstimada: h.esEstimada,
            incidencia: h.incidencia,
          })),
        ),
      );

      const incidencia = lectura.incidencia ?? Incidencia.NINGUNA;
      const calculo = calcularConsumo({
        lecturaAnterior,
        lecturaActual: lectura.lectura_actual,
        digitos: medidor.digitos,
        incidencia,
        promedio3m: promedio,
      });

      try {
        await tx.lectura.create({
          data: {
            comiteId,
            cicloId: ciclo.id,
            medidorId: medidor.id,
            clientUuid: lectura.client_uuid,
            lecturaAnterior,
            lecturaActual: lectura.lectura_actual,
            consumoM3: calculo.consumoM3,
            incidencia: calculo.incidenciaEfectiva,
            observacion: lectura.observacion?.trim() || null,
            esEstimada: calculo.esEstimada,
            alertaOperativa: calculo.alertaOperativa,
            tomadaEn: fechaTomada.toJSDate(),
            sincronizadaEn: ahoraSantiago().toJSDate(),
          },
        });
        creadas += 1;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          duplicados += 1;
        } else {
          throw error;
        }
      }
    }

    return {
      cicloId: ciclo.id,
      periodo: ciclo.periodo,
      recibidas: dto.lecturas.length,
      creadas,
      duplicados,
      errores,
    };
  }

  async porCiclo(cicloId: string) {
    return this.tenant.tx.lectura.findMany({
      where: { comiteId: this.tenant.comiteId, cicloId },
      include: {
        medidor: { select: { numero: true, ordenRuta: true, socio: { select: { nombre: true } } } },
      },
      orderBy: { tomadaEn: 'desc' },
    });
  }
}
