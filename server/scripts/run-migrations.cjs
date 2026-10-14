const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log('[Migration] No DATABASE_URL found. Skipping migrations.');
    return;
  }

  // 1. Determine target schema
  let targetSchema = process.env.DB_SCHEMA || 'public';
  try {
    const parsed = new URL(databaseUrl);
    const schemaParam = parsed.searchParams.get('schema');
    if (schemaParam) {
      targetSchema = schemaParam;
    }
  } catch (err) {
    // ignore URL parse errors
  }

  console.log(`[Migration] Target database schema: "${targetSchema}"`);

  // 2. Connect via pg
  const isRemote = databaseUrl.includes('supabase.com') || databaseUrl.includes('neon.tech') || databaseUrl.includes('sslmode=require');
  const client = new Client({
    connectionString: databaseUrl,
    ssl: isRemote ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  });

  await client.connect();

  try {
    // Set schema search path
    await client.query(`SET search_path TO "${targetSchema}", public;`);

    // Create tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_applied_migrations" (
        "name" VARCHAR(255) PRIMARY KEY,
        "applied_at" TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Find migrations
    const candidates = [
      path.resolve(__dirname, '../prisma/migrations'),
      path.resolve(__dirname, '../../server/prisma/migrations'),
      path.resolve(process.cwd(), 'server/prisma/migrations'),
      path.resolve(process.cwd(), 'prisma/migrations'),
    ];
    const migrationsDir = candidates.find(p => fs.existsSync(p));

    if (migrationsDir) {
      const dirs = fs.readdirSync(migrationsDir)
        .filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory())
        .sort();

      for (const dir of dirs) {
        const check = await client.query(`SELECT name FROM "_applied_migrations" WHERE name = $1;`, [dir]);
        if (check.rows.length > 0) {
          continue;
        }

        const sqlPath = path.join(migrationsDir, dir, 'migration.sql');
        if (!fs.existsSync(sqlPath)) continue;

        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log(`[Migration] Applying ${dir}...`);
        await client.query(sql);
        await client.query(`INSERT INTO "_applied_migrations" (name) VALUES ($1);`, [dir]);
        console.log(`[Migration] ✓ Applied ${dir}`);
      }
    }

    // Check if initial users exist. If not, seed initial users & products
    const userCheck = await client.query(`SELECT COUNT(*) as count FROM "User";`);
    const count = parseInt(userCheck.rows[0].count, 10);
    if (count === 0) {
      console.log('[Migration] Database is empty. Seeding initial users and master data...');
      
      // Staff
      await client.query(`
        INSERT INTO "Staff" ("id", "name", "isActive", "createdAt", "updatedAt")
        VALUES 
          ('1882048b-3ab8-42f3-affe-b9506589b813', 'Udin', true, NOW(), NOW()),
          ('2882048b-3ab8-42f3-affe-b9506589b814', 'Sari', true, NOW(), NOW())
        ON CONFLICT ("id") DO NOTHING;
      `);

      // Users
      const hashOwner = await bcrypt.hash('123456', 10);
      const hashUdin = await bcrypt.hash('1111', 10);
      const hashSari = await bcrypt.hash('2222', 10);

      await client.query(`
        INSERT INTO "User" ("id", "username", "passwordHash", "name", "role", "staffId", "isActive", "createdAt", "updatedAt")
        VALUES
          (gen_random_uuid(), 'cakrofi', $1, 'Cak Rofi', 'PEMILIK', NULL, true, NOW(), NOW()),
          (gen_random_uuid(), 'udin', $2, 'Udin', 'STAF', '1882048b-3ab8-42f3-affe-b9506589b813', true, NOW(), NOW()),
          (gen_random_uuid(), 'sari', $3, 'Sari', 'STAF', '2882048b-3ab8-42f3-affe-b9506589b814', true, NOW(), NOW())
        ON CONFLICT ("username") DO NOTHING;
      `, [hashOwner, hashUdin, hashSari]);

      // Role Permissions
      const defaultOwnerPerms = [
        'stock:read', 'stock:adjust', 'goods_receipt:read', 'goods_receipt:create',
        'purchase_order:read', 'purchase_order:manage', 'product:read', 'product:manage',
        'cost:view', 'dashboard:financial', 'sales:manage', 'supplier:manage',
        'staff:manage', 'permission:manage'
      ];
      const defaultStaffPerms = [
        'stock:read', 'goods_receipt:read', 'goods_receipt:create',
        'purchase_order:read', 'product:read', 'sales:manage'
      ];

      for (const perm of defaultOwnerPerms) {
        await client.query(`
          INSERT INTO "RolePermission" ("id", "role", "permission", "createdAt")
          VALUES (gen_random_uuid(), 'PEMILIK', $1, NOW())
          ON CONFLICT DO NOTHING;
        `, [perm]);
      }
      for (const perm of defaultStaffPerms) {
        await client.query(`
          INSERT INTO "RolePermission" ("id", "role", "permission", "createdAt")
          VALUES (gen_random_uuid(), 'STAF', $1, NOW())
          ON CONFLICT DO NOTHING;
        `, [perm]);
      }

      // Products
      const products = [
        ['MIE-001', 'Indomie Goreng', 'Makanan Instan', 2800, 3500, 60, 'bungkus', 'dus', 40],
        ['MNM-001', 'Aqua 600 ml', 'Minuman', 2300, 3000, 48, 'botol', 'dus', 24],
        ['MNM-002', 'Teh Botol', 'Minuman', 3800, 5000, 24, 'pcs', 'pcs', 1],
        ['MNM-003', 'Kopi Sachet', 'Minuman', 1100, 1500, 40, 'sachet', 'renteng', 10],
        ['SMB-001', 'Minyak Goreng 1L', 'Sembako', 17500, 19500, 12, 'pcs', 'pcs', 1],
        ['SMB-002', 'Gula 1 kg', 'Sembako', 15500, 17500, 8, 'bungkus', 'bal', 20],
        ['RT-001', 'Sabun Mandi', 'Kebutuhan Rumah Tangga', 2800, 3500, 10, 'pcs', 'pcs', 1],
        ['SNK-001', 'Biskuit', 'Makanan Ringan', 6500, 8000, 20, 'pcs', 'pcs', 1],
        ['SMB-003', 'Beras 5 kg', 'Sembako', 62000, 68000, 3, 'pcs', 'pcs', 1],
        ['SMB-004', 'Garam Dapur', 'Sembako', 2500, 3500, 4, 'pcs', 'pcs', 1],
      ];

      for (const [sku, name, cat, purch, sell, stock, baseUnit, purchUnit, ratio] of products) {
        await client.query(`
          INSERT INTO "Product" ("id", "sku", "name", "category", "purchasePrice", "sellingPrice", "stock", "baseUnit", "purchaseUnit", "unitsPerPurchaseUnit", "isActive", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())
          ON CONFLICT ("sku") DO NOTHING;
        `, [sku, name, cat, purch, sell, stock, baseUnit, purchUnit, ratio]);
      }

      // Suppliers
      await client.query(`
        INSERT INTO "Supplier" ("id", "name", "phone", "isActive", "createdAt", "updatedAt")
        VALUES 
          ('3882048b-3ab8-42f3-affe-b9506589b815', 'Pak Haji', '08123456789', true, NOW(), NOW()),
          ('4882048b-3ab8-42f3-affe-b9506589b816', 'Toko Grosir Berkah', '08987654321', true, NOW(), NOW())
        ON CONFLICT ("id") DO NOTHING;
      `);

      console.log('[Migration] ✓ Initial seed completed successfully.');
    } else {
      console.log(`[Migration] Database already populated (${count} users found).`);
    }

    console.log('[Migration] Database migration check completed successfully.');
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
