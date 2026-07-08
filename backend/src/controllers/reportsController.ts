import { Request, Response } from 'express';
import { Prisma, SaleStatus } from '@prisma/client';
import { prisma } from '../config/prisma';

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export async function dashboard(_req: Request, res: Response) {
  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const sevenDaysAgo = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const todaySales = await prisma.sale.findMany({
    where: { createdAt: { gte: todayStart }, status: SaleStatus.COMPLETED },
    select: { total: true },
  });
  const todayRevenue = todaySales.reduce(
    (sum, s) => sum.add(s.total),
    new Prisma.Decimal(0)
  );

  // Last 7 days revenue per day
  const last7DaysSales = await prisma.sale.findMany({
    where: { createdAt: { gte: sevenDaysAgo }, status: SaleStatus.COMPLETED },
    select: { createdAt: true, total: true },
  });
  const dayBuckets: Record<string, number> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayBuckets[key] = 0;
  }
  for (const s of last7DaysSales) {
    const key = s.createdAt.toISOString().slice(0, 10);
    if (key in dayBuckets) dayBuckets[key] += Number(s.total);
  }
  const last7DaysChart = Object.entries(dayBuckets).map(([date, revenue]) => ({ date, revenue }));

  // Top selling products this month (by quantity)
  const monthSaleItems = await prisma.saleItem.groupBy({
    by: ['productId'],
    where: {
      sale: { createdAt: { gte: monthStart }, status: SaleStatus.COMPLETED },
    },
    _sum: { quantity: true, lineTotal: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  });
  const productIds = monthSaleItems.map((m) => m.productId);
  const productsInfo = productIds.length
    ? await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, sku: true },
      })
    : [];
  const productMap = new Map(productsInfo.map((p) => [p.id, p]));
  const topProducts = monthSaleItems.map((m) => ({
    productId: m.productId,
    name: productMap.get(m.productId)?.name ?? 'Unknown',
    sku: productMap.get(m.productId)?.sku ?? '',
    quantity: m._sum.quantity ?? 0,
    revenue: Number(m._sum.lineTotal ?? 0),
  }));

  // Low stock count and stock value
  const allActive = await prisma.product.findMany({
    where: { active: true },
    select: { stock: true, costPrice: true, lowStockThreshold: true },
  });
  const lowStockCount = allActive.filter((p) => p.stock <= p.lowStockThreshold).length;
  const stockValue = allActive.reduce(
    (sum, p) => sum.add(p.costPrice.mul(p.stock)),
    new Prisma.Decimal(0)
  );

  const todaySalesCount = todaySales.length;
  const recentSales = await prisma.sale.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { cashier: { select: { name: true } } },
  });

  res.json({
    todaySales: todaySalesCount,
    todayRevenue: todayRevenue.toString(),
    last7DaysChart,
    topProducts,
    lowStockCount,
    stockValue: stockValue.toString(),
    recentSales,
  });
}

export async function listAuditLogs(req: Request, res: Response) {
  const q = (req as Request & {
    validatedQuery?: {
      userId?: string;
      action?: string;
      entityType?: string;
      page: number;
      pageSize: number;
    };
  }).validatedQuery!;
  const where: Prisma.AuditLogWhereInput = {};
  if (q.userId) where.userId = q.userId;
  if (q.action) where.action = q.action;
  if (q.entityType) where.entityType = q.entityType;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);
  res.json({ logs, page: q.page, pageSize: q.pageSize, total });
}
