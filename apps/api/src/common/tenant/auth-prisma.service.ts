import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Cliente privilegiado usado SOLAMENTE para autenticación.
 * El login debe poder buscar un usuario por email antes de conocer el comite_id,
 * por lo que no puede ejecutarse bajo RLS. Nunca se expone a controladores de dominio.
 */
@Injectable()
export class AuthPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
