import { Global, Module } from '@nestjs/common';
import { AuthPrismaService } from './tenant/auth-prisma.service';
import { PrismaService } from './tenant/prisma.service';
import { TenantStorage } from './tenant/tenant-storage';

@Global()
@Module({
  providers: [PrismaService, AuthPrismaService, TenantStorage],
  exports: [PrismaService, AuthPrismaService, TenantStorage],
})
export class CommonModule {}
