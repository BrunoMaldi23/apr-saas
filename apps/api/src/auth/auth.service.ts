import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Rol } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthPrismaService } from '../common/tenant/auth-prisma.service';
import { JwtPayload } from '../common/auth/jwt-payload.interface';
import { LoginDto } from './dto/login.dto';

export interface UsuarioAutenticado {
  id: string;
  nombre: string;
  rol: Rol;
  comiteId: string;
  comiteNombre: string;
}

export interface RespuestaLogin {
  access_token: string;
  user: UsuarioAutenticado;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: AuthPrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<RespuestaLogin> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      include: { comite: { select: { nombre: true } } },
    });

    if (!usuario || !usuario.activo || !bcrypt.compareSync(dto.password, usuario.passwordHash)) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      comiteId: usuario.comiteId,
      comiteNombre: usuario.comite.nombre,
      rol: usuario.rol,
    };

    const access_token = await this.jwt.signAsync(payload, {
      expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
      secret: process.env.JWT_SECRET ?? 'apr-saas-secret-local',
    });

    return {
      access_token,
      user: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
        comiteId: usuario.comiteId,
        comiteNombre: usuario.comite.nombre,
      },
    };
  }

  async perfil(payload: JwtPayload): Promise<UsuarioAutenticado & { email: string }> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub },
      include: { comite: { select: { nombre: true } } },
    });

    if (!usuario || !usuario.activo) throw new UnauthorizedException('Usuario inactivo');

    return {
      id: usuario.id,
      nombre: usuario.nombre,
      rol: usuario.rol,
      comiteId: usuario.comiteId,
      comiteNombre: usuario.comite.nombre,
      email: usuario.email,
    };
  }
}
