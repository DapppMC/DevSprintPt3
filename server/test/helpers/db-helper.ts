import { PrismaClient, type Product, type Staff, type Supplier, type User } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { hashPassword, generateToken } from '../../src/lib/auth-crypto';
import { ensureDefaultPermissions } from '../../src/services/permission.service';

// Pastikan .env.test dimuat
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Guard ketat: pastikan database yang digunakan benar-benar berakhiran _test
export function assertTestDatabase(): void {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL tidak disetel!');
  }
  const url = new URL(dbUrl);
  const dbName = url.pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `PERINGATAN KEAMANAN: Database "${dbName}" tidak berakhiran "_test"! Test DITOLAK demi mencegah kerusakan data asli.`,
    );
  }
}

// Jalankan guard saat modul dimuat
assertTestDatabase();

export const testDb = new PrismaClient();

export async function resetTestDatabase(): Promise<void> {
  assertTestDatabase();

  // Urutan penghapusan sesuai relasi foreign key
  await testDb.rolePermission.deleteMany();
  await testDb.user.deleteMany();
  await testDb.goodsReceiptLine.deleteMany();
  await testDb.goodsReceipt.deleteMany();
  await testDb.purchaseOrderLine.deleteMany();
  await testDb.purchaseOrder.deleteMany();
  await testDb.staff.deleteMany();
  await testDb.supplier.deleteMany();
  await testDb.saleItem.deleteMany();
  await testDb.stockMovement.deleteMany();
  await testDb.sale.deleteMany();
  await testDb.product.deleteMany();
}

export interface TestMasterData {
  indomie: Product;
  kopi: Product;
  aqua: Product;
  gula: Product;
  udin: Staff;
  sari: Staff;
  pakHaji: Supplier;
  tokoGrosir: Supplier;
  cakRofiUser: User;
  udinUser: User;
  sariUser: User;
  ownerToken: string;
  udinToken: string;
  sariToken: string;
}

export async function seedTestMasterData(): Promise<TestMasterData> {
  assertTestDatabase();

  const indomie = await testDb.product.create({
    data: {
      sku: 'MIE-001',
      name: 'Indomie Goreng',
      category: 'Makanan Instan',
      purchasePrice: 2800,
      sellingPrice: 3500,
      stock: 0,
      isActive: true,
      baseUnit: 'bungkus',
      purchaseUnit: 'dus',
      unitsPerPurchaseUnit: 40,
    },
  });

  const kopi = await testDb.product.create({
    data: {
      sku: 'MNM-003',
      name: 'Kopi Sachet',
      category: 'Minuman',
      purchasePrice: 1100,
      sellingPrice: 1500,
      stock: 0,
      isActive: true,
      baseUnit: 'sachet',
      purchaseUnit: 'renteng',
      unitsPerPurchaseUnit: 10,
    },
  });

  const aqua = await testDb.product.create({
    data: {
      sku: 'MNM-001',
      name: 'Aqua 600 ml',
      category: 'Minuman',
      purchasePrice: 2300,
      sellingPrice: 3000,
      stock: 0,
      isActive: true,
      baseUnit: 'botol',
      purchaseUnit: 'dus',
      unitsPerPurchaseUnit: 24,
    },
  });

  const gula = await testDb.product.create({
    data: {
      sku: 'SMB-002',
      name: 'Gula 1 kg',
      category: 'Sembako',
      purchasePrice: 15500,
      sellingPrice: 17500,
      stock: 0,
      isActive: true,
      baseUnit: 'bungkus',
      purchaseUnit: 'bal',
      unitsPerPurchaseUnit: 20,
    },
  });

  const udin = await testDb.staff.create({
    data: { name: 'Udin', isActive: true },
  });

  const sari = await testDb.staff.create({
    data: { name: 'Sari', isActive: true },
  });

  const pakHaji = await testDb.supplier.create({
    data: { name: 'Pak Haji', isActive: true },
  });

  const tokoGrosir = await testDb.supplier.create({
    data: { name: 'Toko Grosir', isActive: true },
  });

  // Seed Users & Hashed PINs (C1)
  const ownerPinHash = await hashPassword('123456');
  const udinPinHash = await hashPassword('1111');
  const sariPinHash = await hashPassword('2222');

  const cakRofiUser = await testDb.user.create({
    data: {
      username: 'cakrofi',
      name: 'Cak Rofi',
      passwordHash: ownerPinHash,
      role: 'PEMILIK',
      isActive: true,
    },
  });

  const udinUser = await testDb.user.create({
    data: {
      username: 'udin',
      name: 'Udin',
      passwordHash: udinPinHash,
      role: 'STAF',
      staffId: udin.id,
      isActive: true,
    },
  });

  const sariUser = await testDb.user.create({
    data: {
      username: 'sari',
      name: 'Sari',
      passwordHash: sariPinHash,
      role: 'STAF',
      staffId: sari.id,
      isActive: true,
    },
  });

  await ensureDefaultPermissions();

  const ownerToken = generateToken({
    userId: cakRofiUser.id,
    username: cakRofiUser.username,
    role: cakRofiUser.role,
    staffId: null,
  });

  const udinToken = generateToken({
    userId: udinUser.id,
    username: udinUser.username,
    role: udinUser.role,
    staffId: udin.id,
  });

  const sariToken = generateToken({
    userId: sariUser.id,
    username: sariUser.username,
    role: sariUser.role,
    staffId: sari.id,
  });

  return {
    indomie,
    kopi,
    aqua,
    gula,
    udin,
    sari,
    pakHaji,
    tokoGrosir,
    cakRofiUser,
    udinUser,
    sariUser,
    ownerToken,
    udinToken,
    sariToken,
  };
}
