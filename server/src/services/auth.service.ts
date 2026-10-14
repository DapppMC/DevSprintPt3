import { db } from '../lib/db';
import { UnauthorizedError, NotFoundError } from '../lib/errors';
import { comparePassword, generateToken } from '../lib/auth-crypto';
import type { LoginInput } from '../validators/auth.validator';
import type { AuthResponseDto, UserDto } from '../types/dto';
import type { User } from '@prisma/client';
import { getRolePermissions } from './permission.service';

export function toUserDto(user: User, permissions?: string[]): UserDto {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    permissions,
    staffId: user.staffId,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function login(input: LoginInput): Promise<AuthResponseDto> {
  const user = await db.user.findFirst({
    where: {
      username: { equals: input.username, mode: 'insensitive' },
    },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Username atau password salah.');
  }

  const isValid = await comparePassword(input.password, user.passwordHash);
  if (!isValid) {
    throw new UnauthorizedError('Username atau password salah.');
  }

  const token = generateToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    staffId: user.staffId,
  });

  const permissions = await getRolePermissions(user.role);

  return {
    token,
    user: toUserDto(user, permissions),
  };
}

export async function getMe(userId: string): Promise<UserDto> {
  const user = await db.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('Pengguna tidak ditemukan.');
  }

  const permissions = await getRolePermissions(user.role);
  return toUserDto(user, permissions);
}
