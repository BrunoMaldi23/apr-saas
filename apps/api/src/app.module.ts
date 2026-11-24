import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { CommonModule } from './common/common.module';
import { TenantInterceptor } from './common/tenant/tenant.interceptor';
import { CiclosModule } from './ciclos/ciclos.module';
import { CobrosModule } from './cobros/cobros.module';
import { ComitesModule } from './comites/comites.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LecturasModule } from './lecturas/lecturas.module';
import { MedidoresModule } from './medidores/medidores.module';
import { PagosModule } from './pagos/pagos.module';
import { SociosModule } from './socios/socios.module';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    DashboardModule,
    ComitesModule,
    SociosModule,
    MedidoresModule,
    CiclosModule,
    LecturasModule,
    CobrosModule,
    PagosModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
})
export class AppModule {}
