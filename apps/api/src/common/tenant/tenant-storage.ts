import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import { JwtPayload } from '../auth/jwt-payload.interface';

export interface TenantRequestContext {
  comiteId: string;
  tx: Prisma.TransactionClient;
  user: JwtPayload;
}

@Injectable()
export class TenantStorage {
  private readonly als = new AsyncLocalStorage<TenantRequestContext>();

  run<T>(context: TenantRequestContext, callback: () => T): T {
    return this.als.run(context, callback);
  }

  getContext(): TenantRequestContext | undefined {
    return this.als.getStore();
  }

  get comiteId(): string {
    const contexto = this.als.getStore();
    if (!contexto) throw new UnauthorizedException('Contexto de tenant no disponible');
    return contexto.comiteId;
  }

  get tx(): Prisma.TransactionClient {
    const contexto = this.als.getStore();
    if (!contexto) throw new UnauthorizedException('Contexto de tenant no disponible');
    return contexto.tx;
  }

  get user(): JwtPayload {
    const contexto = this.als.getStore();
    if (!contexto) throw new UnauthorizedException('Contexto de tenant no disponible');
    return contexto.user;
  }
}
