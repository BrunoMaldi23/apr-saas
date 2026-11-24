import { Rol } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  comiteId: string;
  comiteNombre: string;
  rol: Rol;
  iat?: number;
  exp?: number;
}

export interface RequestConUsuario {
  user: JwtPayload;
  headers: Record<string, string | string[] | undefined>;
}
