import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { lastValueFrom, Observable, from } from 'rxjs';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { PrismaService } from './prisma.service';
import { TenantStorage } from './tenant-storage';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Fija el tenant dentro de la transacción antes de cualquier consulta. */
export async function setTenantEnTransaccion(
  tx: Prisma.TransactionClient,
  comiteId: string,
): Promise<void> {
  if (!UUID_V4.test(comiteId)) {
    throw new BadRequestException('comiteId del token no es un UUID válido');
  }
  await tx.$executeRawUnsafe(`SET LOCAL app.current_comite_id = '${comiteId}'`);
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: TenantStorage,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const user = request.user;

    // Login y endpoints públicos no tienen tenant todavía.
    if (!user?.comiteId) return next.handle();

    const promesa = this.prisma.$transaction(async (tx) => {
      await setTenantEnTransaccion(tx, user.comiteId);
      return this.storage.run({ comiteId: user.comiteId, tx, user }, () => lastValueFrom(next.handle()));
    });

    return from(promesa);
  }
}
