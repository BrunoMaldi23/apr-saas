import { Injectable } from '@nestjs/common';
import { TenantStorage } from '../common/tenant/tenant-storage';
import { ahoraSantiago } from '../common/utils/tiempo';

@Injectable()
export class DashboardService {
  constructor(private readonly tenant: TenantStorage) {}

  async resumen() {
    const tx = this.tenant.tx;
    const comiteId = this.tenant.comiteId;
    const inicioMes = ahoraSantiago().startOf('month').toJSDate();
    const finMes = ahoraSantiago().startOf('month').plus({ months: 1 }).toJSDate();

    const ciclo = await tx.cicloFacturacion.findFirst({
      where: { comiteId, estado: 'ABIERTO' },
      orderBy: { periodo: 'desc' },
    });
    const cicloReferencia =
      ciclo ??
      (await tx.cicloFacturacion.findFirst({
        where: { comiteId },
        orderBy: { periodo: 'desc' },
      }));

    const [totalSocios, totalMedidores, lecturasTomadas, recaudacion, morosidad, cobrosCiclo] =
      await Promise.all([
        tx.socio.count({ where: { comiteId, activo: true } }),
        tx.medidor.count({ where: { comiteId, activo: true } }),
        ciclo ? tx.lectura.count({ where: { comiteId, cicloId: ciclo.id } }) : Promise.resolve(0),
        tx.pago.aggregate({
          where: { comiteId, fechaPago: { gte: inicioMes, lt: finMes } },
          _sum: { montoClp: true },
        }),
        tx.cobro.aggregate({
          where: { comiteId, saldoPendienteClp: { gt: 0 } },
          _sum: { saldoPendienteClp: true },
        }),
        cicloReferencia
          ? tx.cobro.count({ where: { comiteId, cicloId: cicloReferencia.id } })
          : Promise.resolve(0),
      ]);

    const pendientes = Math.max(0, totalMedidores - lecturasTomadas);
    const avance = totalMedidores === 0 ? 0 : Math.round((lecturasTomadas / totalMedidores) * 100);

    return {
      comite: {
        id: comiteId,
        nombre: this.tenant.user.comiteNombre,
      },
      ciclo: cicloReferencia
        ? {
            id: cicloReferencia.id,
            periodo: cicloReferencia.periodo,
            estado: cicloReferencia.estado,
            esAbierto: ciclo !== null,
          }
        : null,
      kpis: {
        totalSocios,
        totalMedidores,
        lecturasTomadas,
        lecturasPendientes: pendientes,
        avanceLecturasPct: avance,
        recaudacionMesClp: Math.round(recaudacion._sum.montoClp ?? 0),
        morosidadTotalClp: Math.round(morosidad._sum.saldoPendienteClp ?? 0),
        cobrosCiclo,
      },
    };
  }
}
