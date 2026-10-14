import type { Supplier } from '@prisma/client';
import { db } from '../lib/db';
import { ConflictError, NotFoundError } from '../lib/errors';
import { hasPrismaCode } from '../lib/prisma-errors';
import type { SupplierDto } from '../types/dto';

export interface CreateSupplierInput {
  name: string;
  phone?: string | null;
  isActive?: boolean;
}

export interface UpdateSupplierInput {
  name?: string;
  phone?: string | null;
  isActive?: boolean;
}

export function toSupplierDto(supplier: Supplier): SupplierDto {
  return {
    id: supplier.id,
    name: supplier.name,
    phone: supplier.phone,
    isActive: supplier.isActive,
    createdAt: supplier.createdAt.toISOString(),
  };
}

export async function listSuppliers(): Promise<SupplierDto[]> {
  const suppliers = await db.supplier.findMany({
    orderBy: { name: 'asc' },
  });
  return suppliers.map(toSupplierDto);
}

export async function getSupplier(id: string): Promise<SupplierDto> {
  const supplier = await db.supplier.findUnique({ where: { id } });
  if (!supplier) throw new NotFoundError('Supplier tidak ditemukan.');
  return toSupplierDto(supplier);
}

export async function createSupplier(input: CreateSupplierInput): Promise<SupplierDto> {
  try {
    const supplier = await db.supplier.create({
      data: {
        name: input.name,
        phone: input.phone ?? null,
        isActive: input.isActive ?? true,
      },
    });
    return toSupplierDto(supplier);
  } catch (error) {
    if (hasPrismaCode(error, 'P2002')) {
      throw new ConflictError('Nama supplier sudah digunakan.');
    }
    throw error;
  }
}

export async function updateSupplier(id: string, input: UpdateSupplierInput): Promise<SupplierDto> {
  try {
    const supplier = await db.supplier.update({
      where: { id },
      data: input,
    });
    return toSupplierDto(supplier);
  } catch (error) {
    if (hasPrismaCode(error, 'P2025')) {
      throw new NotFoundError('Supplier tidak ditemukan.');
    }
    if (hasPrismaCode(error, 'P2002')) {
      throw new ConflictError('Nama supplier sudah digunakan.');
    }
    throw error;
  }
}
