-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'OPERADOR');

-- CreateEnum
CREATE TYPE "EstadoCiclo" AS ENUM ('ABIERTO', 'CERRADO');

-- CreateEnum
CREATE TYPE "Incidencia" AS ENUM ('NINGUNA', 'VUELTA_MEDIDOR', 'MEDIDOR_TRABADO', 'CASA_CERRADA', 'MEDIDOR_DANADO');

-- CreateEnum
CREATE TYPE "EstadoCobro" AS ENUM ('PENDIENTE', 'PARCIAL', 'PAGADO', 'VENCIDO');

-- CreateEnum
CREATE TYPE "MedioPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'OTRO');

-- CreateTable
CREATE TABLE "comites" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(180) NOT NULL,
    "rut" VARCHAR(20),
    "comuna" VARCHAR(100) NOT NULL,
    "region" VARCHAR(100) NOT NULL,
    "direccion" VARCHAR(240),
    "cargoFijoClp" INTEGER NOT NULL,
    "tarifaM3Clp" INTEGER NOT NULL,
    "topeSubsidioM3" INTEGER NOT NULL DEFAULT 15,
    "porcentajeSubsidioDefault" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "comiteId" UUID NOT NULL,
    "rut" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'OPERADOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socios" (
    "id" UUID NOT NULL,
    "comiteId" UUID NOT NULL,
    "rut" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "direccion" VARCHAR(240) NOT NULL,
    "sector" VARCHAR(120) NOT NULL,
    "telefono" VARCHAR(30),
    "email" VARCHAR(160),
    "decretoSap" VARCHAR(60),
    "porcentajeSubsidio" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "socios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medidores" (
    "id" UUID NOT NULL,
    "comiteId" UUID NOT NULL,
    "socioId" UUID NOT NULL,
    "numero" VARCHAR(30) NOT NULL,
    "digitos" INTEGER NOT NULL DEFAULT 4,
    "lecturaInicial" INTEGER NOT NULL,
    "ordenRuta" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaInstalacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medidores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ciclos_facturacion" (
    "id" UUID NOT NULL,
    "comiteId" UUID NOT NULL,
    "periodo" VARCHAR(7) NOT NULL,
    "fechaApertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaCierre" TIMESTAMP(3),
    "estado" "EstadoCiclo" NOT NULL DEFAULT 'ABIERTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ciclos_facturacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lecturas" (
    "id" UUID NOT NULL,
    "comiteId" UUID NOT NULL,
    "cicloId" UUID NOT NULL,
    "medidorId" UUID NOT NULL,
    "clientUuid" VARCHAR(64) NOT NULL,
    "lecturaAnterior" INTEGER NOT NULL,
    "lecturaActual" INTEGER NOT NULL,
    "consumoM3" INTEGER NOT NULL,
    "incidencia" "Incidencia" NOT NULL DEFAULT 'NINGUNA',
    "observacion" VARCHAR(500),
    "esEstimada" BOOLEAN NOT NULL DEFAULT false,
    "alertaOperativa" VARCHAR(240),
    "tomadaEn" TIMESTAMP(3) NOT NULL,
    "sincronizadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lecturas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cobros" (
    "id" UUID NOT NULL,
    "comiteId" UUID NOT NULL,
    "cicloId" UUID NOT NULL,
    "socioId" UUID NOT NULL,
    "medidorId" UUID,
    "lecturaAnterior" INTEGER NOT NULL,
    "lecturaActual" INTEGER NOT NULL,
    "consumoM3" INTEGER NOT NULL,
    "cargoFijoClp" INTEGER NOT NULL,
    "consumoVariableClp" INTEGER NOT NULL,
    "subtotalClp" INTEGER NOT NULL,
    "m3Subsidiados" INTEGER NOT NULL,
    "baseSubsidiableClp" INTEGER NOT NULL,
    "porcentajeSubsidio" INTEGER NOT NULL,
    "descuentoSapClp" INTEGER NOT NULL,
    "saldoAnteriorClp" INTEGER NOT NULL,
    "totalAPagarClp" INTEGER NOT NULL,
    "saldoPendienteClp" INTEGER NOT NULL,
    "estado" "EstadoCobro" NOT NULL DEFAULT 'PENDIENTE',
    "decretoSap" VARCHAR(60),
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cobros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagos" (
    "id" UUID NOT NULL,
    "comiteId" UUID NOT NULL,
    "cobroId" UUID NOT NULL,
    "socioId" UUID NOT NULL,
    "montoClp" INTEGER NOT NULL,
    "medioPago" "MedioPago" NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referencia" VARCHAR(120),
    "comprobanteNumero" VARCHAR(40) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pagos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_comiteId_idx" ON "usuarios"("comiteId");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_comiteId_rut_key" ON "usuarios"("comiteId", "rut");

-- CreateIndex
CREATE INDEX "socios_comiteId_nombre_idx" ON "socios"("comiteId", "nombre");

-- CreateIndex
CREATE INDEX "socios_comiteId_sector_idx" ON "socios"("comiteId", "sector");

-- CreateIndex
CREATE UNIQUE INDEX "socios_comiteId_rut_key" ON "socios"("comiteId", "rut");

-- CreateIndex
CREATE INDEX "medidores_comiteId_activo_ordenRuta_idx" ON "medidores"("comiteId", "activo", "ordenRuta");

-- CreateIndex
CREATE UNIQUE INDEX "medidores_comiteId_numero_key" ON "medidores"("comiteId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "medidores_comiteId_ordenRuta_key" ON "medidores"("comiteId", "ordenRuta");

-- CreateIndex
CREATE INDEX "ciclos_facturacion_comiteId_estado_idx" ON "ciclos_facturacion"("comiteId", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "ciclos_facturacion_comiteId_periodo_key" ON "ciclos_facturacion"("comiteId", "periodo");

-- CreateIndex
CREATE INDEX "lecturas_comiteId_medidorId_tomadaEn_idx" ON "lecturas"("comiteId", "medidorId", "tomadaEn");

-- CreateIndex
CREATE UNIQUE INDEX "lecturas_comiteId_clientUuid_key" ON "lecturas"("comiteId", "clientUuid");

-- CreateIndex
CREATE UNIQUE INDEX "lecturas_comiteId_cicloId_medidorId_key" ON "lecturas"("comiteId", "cicloId", "medidorId");

-- CreateIndex
CREATE INDEX "cobros_comiteId_estado_idx" ON "cobros"("comiteId", "estado");

-- CreateIndex
CREATE INDEX "cobros_comiteId_cicloId_idx" ON "cobros"("comiteId", "cicloId");

-- CreateIndex
CREATE UNIQUE INDEX "cobros_comiteId_cicloId_socioId_key" ON "cobros"("comiteId", "cicloId", "socioId");

-- CreateIndex
CREATE INDEX "pagos_comiteId_fechaPago_idx" ON "pagos"("comiteId", "fechaPago");

-- CreateIndex
CREATE INDEX "pagos_comiteId_cobroId_idx" ON "pagos"("comiteId", "cobroId");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_comiteId_fkey" FOREIGN KEY ("comiteId") REFERENCES "comites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "socios" ADD CONSTRAINT "socios_comiteId_fkey" FOREIGN KEY ("comiteId") REFERENCES "comites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medidores" ADD CONSTRAINT "medidores_comiteId_fkey" FOREIGN KEY ("comiteId") REFERENCES "comites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medidores" ADD CONSTRAINT "medidores_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "socios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ciclos_facturacion" ADD CONSTRAINT "ciclos_facturacion_comiteId_fkey" FOREIGN KEY ("comiteId") REFERENCES "comites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturas" ADD CONSTRAINT "lecturas_comiteId_fkey" FOREIGN KEY ("comiteId") REFERENCES "comites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturas" ADD CONSTRAINT "lecturas_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "ciclos_facturacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecturas" ADD CONSTRAINT "lecturas_medidorId_fkey" FOREIGN KEY ("medidorId") REFERENCES "medidores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_comiteId_fkey" FOREIGN KEY ("comiteId") REFERENCES "comites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_cicloId_fkey" FOREIGN KEY ("cicloId") REFERENCES "ciclos_facturacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "socios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cobros" ADD CONSTRAINT "cobros_medidorId_fkey" FOREIGN KEY ("medidorId") REFERENCES "medidores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_comiteId_fkey" FOREIGN KEY ("comiteId") REFERENCES "comites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_cobroId_fkey" FOREIGN KEY ("cobroId") REFERENCES "cobros"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagos" ADD CONSTRAINT "pagos_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "socios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
