import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../config/prisma';
import { resetDb, seedFixtures } from './helpers';

const app = createApp();

const runIfDb = process.env.DATABASE_URL_TEST ? describe : describe.skip;

runIfDb('POS + Inventory API', () => {
  let ownerToken: string;
  let cashierToken: string;
  let productAId: string;
  let productBId: string;
  let categoryId: string;

  beforeAll(async () => {
    await resetDb();
    const fx = await seedFixtures();
    productAId = fx.productA.id;
    productBId = fx.productB.id;
    categoryId = fx.category.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Auth', () => {
    it('rejects invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'owner@test.local', password: 'wrong' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('logs in the owner', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'owner@test.local', password: 'Owner123!' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.role).toBe('OWNER');
      ownerToken = res.body.token;
    });

    it('logs in the cashier', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'cashier@test.local', password: 'Cashier123!' });
      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('CASHIER');
      cashierToken = res.body.token;
    });

    it('rejects suspended cashier login', async () => {
      await prisma.user.update({
        where: { email: 'cashier@test.local' },
        data: { suspended: true },
      });
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'cashier@test.local', password: 'Cashier123!' });
      expect(res.status).toBe(403);
      await prisma.user.update({
        where: { email: 'cashier@test.local' },
        data: { suspended: false },
      });
      const refresh = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'cashier@test.local', password: 'Cashier123!' });
      cashierToken = refresh.body.token;
    });

    it('returns current user via /me', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('owner@test.local');
      expect(res.body.user.password).toBeUndefined();
    });

    it('rejects /me without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });
  });

  describe('Authorization', () => {
    it('blocks cashier from admin routes', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(res.status).toBe(403);
    });

    it('allows owner on admin routes', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.products)).toBe(true);
    });
  });

  describe('Products CRUD', () => {
    let createdId: string;

    it('creates a product', async () => {
      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('sku', 'NEW-001')
        .field('name', 'New Product')
        .field('price', '500')
        .field('costPrice', '300')
        .field('stock', '20')
        .field('categoryId', categoryId);
      expect(res.status).toBe(201);
      expect(res.body.product.sku).toBe('NEW-001');
      expect(res.body.product.stock).toBe(20);
      createdId = res.body.product.id;
    });

    it('lists products with filter', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products?search=New')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      const found = res.body.products.find((p: { sku: string }) => p.sku === 'NEW-001');
      expect(found).toBeDefined();
    });

    it('flags low-stock products', async () => {
      const res = await request(app)
        .get('/api/v1/admin/products?lowStock=true')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      // productB has stock 5 vs threshold 10
      const lowB = res.body.products.find((p: { id: string }) => p.id === productBId);
      expect(lowB).toBeDefined();
    });

    it('rejects duplicate SKU', async () => {
      const res = await request(app)
        .post('/api/v1/admin/products')
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('sku', 'NEW-001')
        .field('name', 'Dup')
        .field('price', '10')
        .field('costPrice', '5')
        .field('categoryId', categoryId);
      expect(res.status).toBe(409);
    });

    it('updates a product', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/products/${createdId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .field('price', '550');
      expect(res.status).toBe(200);
      expect(Number(res.body.product.price)).toBe(550);
    });

    it('adjusts stock atomically with audit log', async () => {
      const before = await prisma.product.findUnique({ where: { id: productAId } });
      const res = await request(app)
        .post(`/api/v1/admin/products/${productAId}/stock`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ type: 'PURCHASE', quantity: 30, reason: 'Restock' });
      expect(res.status).toBe(200);
      const after = await prisma.product.findUnique({ where: { id: productAId } });
      expect(after!.stock).toBe(before!.stock + 30);

      const movement = await prisma.stockMovement.findFirst({
        where: { productId: productAId, reason: 'Restock' },
      });
      expect(movement).not.toBeNull();

      const audit = await prisma.auditLog.findFirst({
        where: { action: 'STOCK_ADJUST', entityId: productAId },
        orderBy: { createdAt: 'desc' },
      });
      expect(audit).not.toBeNull();
    });

    it('rejects stock adjustment that goes negative', async () => {
      const res = await request(app)
        .post(`/api/v1/admin/products/${productBId}/stock`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ type: 'DAMAGE', quantity: -9999, reason: 'Damage' });
      expect(res.status).toBe(400);
    });
  });

  describe('Sales (atomic) + Refunds', () => {
    let saleId: string;
    let saleNumber: string;

    it('rejects sale with insufficient stock', async () => {
      const res = await request(app)
        .post('/api/v1/pos/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ productId: productBId, quantity: 999 }],
          paymentMethod: 'CASH',
        });
      expect(res.status).toBe(400);
    });

    it('completes a sale and decrements stock', async () => {
      const before = await prisma.product.findUnique({ where: { id: productAId } });
      const res = await request(app)
        .post('/api/v1/pos/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [
            { productId: productAId, quantity: 2 },
            { productId: productBId, quantity: 1 },
          ],
          paymentMethod: 'CASH',
        });
      expect(res.status).toBe(201);
      expect(res.body.sale.saleNumber).toMatch(/^S-\d{8}-\d{5}$/);
      saleId = res.body.sale.id;
      saleNumber = res.body.sale.saleNumber;

      // taxRate is 10% on the test business profile
      // subtotal = 2*100 + 1*200 = 400, tax = 40, total = 440
      expect(Number(res.body.sale.subtotal)).toBe(400);
      expect(Number(res.body.sale.taxAmount)).toBe(40);
      expect(Number(res.body.sale.total)).toBe(440);

      const after = await prisma.product.findUnique({ where: { id: productAId } });
      expect(after!.stock).toBe(before!.stock - 2);
    });

    it('writes SALE stock movements', async () => {
      const movements = await prisma.stockMovement.findMany({
        where: { reason: `Sale ${saleNumber}` },
      });
      expect(movements.length).toBe(2);
      expect(movements.every((m) => m.type === 'SALE' && m.quantity < 0)).toBe(true);
    });

    it('generates monotonically increasing daily sale numbers', async () => {
      const r2 = await request(app)
        .post('/api/v1/pos/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          items: [{ productId: productAId, quantity: 1 }],
          paymentMethod: 'CARD',
        });
      expect(r2.status).toBe(201);
      const num1 = parseInt(saleNumber.split('-')[2], 10);
      const num2 = parseInt(r2.body.sale.saleNumber.split('-')[2], 10);
      expect(num2).toBe(num1 + 1);
    });

    it('cashier sees only own sales', async () => {
      const res = await request(app)
        .get('/api/v1/pos/sales')
        .set('Authorization', `Bearer ${cashierToken}`);
      expect(res.status).toBe(200);
      expect(res.body.sales.length).toBeGreaterThan(0);
      const otherCashier = res.body.sales.find(
        (s: { cashier: { email: string } }) => s.cashier.email !== 'cashier@test.local'
      );
      expect(otherCashier).toBeUndefined();
    });

    it('refunds a sale and restores stock', async () => {
      const before = await prisma.product.findUnique({ where: { id: productAId } });
      const res = await request(app)
        .post(`/api/v1/pos/sales/${saleId}/refund`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ reason: 'Customer changed mind' });
      expect(res.status).toBe(200);
      expect(res.body.sale.status).toBe('REFUNDED');
      const after = await prisma.product.findUnique({ where: { id: productAId } });
      expect(after!.stock).toBe(before!.stock + 2);
    });

    it('rejects double refund', async () => {
      const res = await request(app)
        .post(`/api/v1/pos/sales/${saleId}/refund`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ reason: 'Already refunded' });
      expect(res.status).toBe(400);
    });
  });

  describe('Reports', () => {
    it('returns dashboard summary', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports/dashboard')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('todaySales');
      expect(res.body).toHaveProperty('todayRevenue');
      expect(res.body.last7DaysChart).toHaveLength(7);
      expect(Array.isArray(res.body.topProducts)).toBe(true);
      expect(typeof res.body.lowStockCount).toBe('number');
    });

    it('returns audit logs (owner only)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.logs)).toBe(true);
      const hasSale = res.body.logs.some(
        (l: { action: string }) => l.action === 'SALE_CREATE'
      );
      expect(hasSale).toBe(true);
    });
  });

  describe('Staff management', () => {
    let staffId: string;

    it('creates a cashier', async () => {
      const res = await request(app)
        .post('/api/v1/admin/staff')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: 'newcashier@test.local', password: 'NewPass123!', name: 'New Cashier' });
      expect(res.status).toBe(201);
      expect(res.body.staff.role).toBe('CASHIER');
      staffId = res.body.staff.id;
    });

    it('suspends and unsuspends staff', async () => {
      const s = await request(app)
        .patch(`/api/v1/admin/staff/${staffId}/suspend`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(s.status).toBe(200);
      expect(s.body.staff.suspended).toBe(true);

      const u = await request(app)
        .patch(`/api/v1/admin/staff/${staffId}/unsuspend`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(u.status).toBe(200);
      expect(u.body.staff.suspended).toBe(false);
    });

    it('deletes a cashier with no sales', async () => {
      const res = await request(app)
        .delete(`/api/v1/admin/staff/${staffId}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });
  });

  describe('Health', () => {
    it('reports DB connectivity', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.dbConnected).toBe(true);
    });
  });
});
