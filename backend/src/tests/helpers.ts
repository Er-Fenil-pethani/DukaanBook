import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';

export async function resetDb() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.stockMovement.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
    prisma.businessProfile.deleteMany(),
  ]);
}

export async function seedFixtures() {
  const business = await prisma.businessProfile.create({
    data: { name: 'Test Store', currency: 'PKR', taxRate: 10 },
  });
  const owner = await prisma.user.create({
    data: {
      email: 'owner@test.local',
      password: await bcrypt.hash('Owner123!', 6),
      name: 'Test Owner',
      role: Role.OWNER,
      businessProfileId: business.id,
    },
  });
  const cashier = await prisma.user.create({
    data: {
      email: 'cashier@test.local',
      password: await bcrypt.hash('Cashier123!', 6),
      name: 'Test Cashier',
      role: Role.CASHIER,
      businessProfileId: business.id,
    },
  });
  const category = await prisma.category.create({
    data: { name: 'Beverages', slug: 'beverages' },
  });
  const productA = await prisma.product.create({
    data: {
      sku: 'TEST-A',
      name: 'Cola',
      price: 100,
      costPrice: 60,
      stock: 50,
      lowStockThreshold: 10,
      categoryId: category.id,
    },
  });
  const productB = await prisma.product.create({
    data: {
      sku: 'TEST-B',
      name: 'Juice',
      price: 200,
      costPrice: 130,
      stock: 5,
      lowStockThreshold: 10,
      categoryId: category.id,
    },
  });
  return { business, owner, cashier, category, productA, productB };
}
