import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DateTime } from 'luxon';
import { TenantStorage } from '../common/tenant/tenant-storage';
import { ZONA_HORARIA, ahoraSantiago, formatoCLP } from '../common/utils/tiempo';
import { RegistrarPagoDto } from './dto/pago.dto';

@Injectable()
export class PagosService {
  constructor(private readonly tenant: TenantStorage) {}

  async registrar(dto: RegistrarPagoDto) {
    const tx = this.tenant.tx;
    const comiteId = this.tenant.comiteId;

    const cobro = await tx.cobro.findFirst({
      where: { id: dto.cobroId, comiteId },
      include: { socio: { select: { nombre: true, rut: true } }, ciclo: { select: { periodo: true } } },
    });
    if (!cobro) throw new NotFoundException('Cobro no encontrado');
    if (cobro.estado === 'PAGADO') throw new BadRequestException('El cobro ya está pagado');
    if (dto.montoClp > cobro.saldoPendienteClp) {
      throw new BadRequestException(
        `El monto supera el saldo pendiente (${formatoCLP(cobro.saldoPendienteClp)})`,
      );
    }

    const fechaPago = dto.fechaPago
      ? DateTime.fromISO(dto.fechaPago, { zone: ZONA_HORARIA })
      : ahoraSantiago();
    if (!fechaPago.isValid) throw new BadRequestException('fechaPago no es válida');

    const nuevoSaldo = Math.max(0, cobro.saldoPendienteClp - dto.montoClp);
    const estado = nuevoSaldo === 0 ? 'PAGADO' : 'PARCIAL';
    const comprobanteNumero = `APR-${ahoraSantiago().toFormat('yyyyMM')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const pago = await tx.pago.create({
      data: {
        comiteId,
        cobroId: cobro.id,
        socioId: cobro.socioId,
        montoClp: Math.round(dto.montoClp),
        medioPago: dto.medioPago,
        fechaPago: fechaPago.toJSDate(),
        referencia: dto.referencia?.trim() || null,
        comprobanteNumero,
      },
    });

    const cobroActualizado = await tx.cobro.update({
      where: { id: cobro.id },
      data: { saldoPendienteClp: nuevoSaldo, estado },
    });

    return {
      pago,
      cobro: cobroActualizado,
      comprobante: {
        numero: comprobanteNumero,
        fecha: fechaPago.toJSDate(),
        montoClp: pago.montoClp,
        medioPago: pago.medioPago,
        referencia: pago.referencia,
        socioNombre: cobro.socio.nombre,
        rut: cobro.socio.rut,
        periodo: cobro.ciclo.periodo,
        saldoRestanteClp: nuevoSaldo,
      },
    };
  }

  async listar(cobroId?: string) {
    return this.tenant.tx.pago.findMany({
      where: {
        comiteId: this.tenant.comiteId,
        ...(cobroId ? { cobroId } : {}),
      },
      include: {
        socio: { select: { rut: true, nombre: true } },
        cobro: { include: { ciclo: { select: { periodo: true } } } },
      },
      orderBy: { fechaPago: 'desc' },
      take: 200,
    });
  }
}
