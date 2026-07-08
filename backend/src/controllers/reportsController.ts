import { Request, Response } from 'express';
import { Prisma, SaleStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

function startOfUtcDay(d: Date): Date {
  return new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
}

export async function dashboard(req: Request, res: Response) {
  const userId = req.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      businessProfileId: true,
    },
  });

  if (!user?.businessProfileId) {
    throw AppError.badRequest('User is not connected to a business');
  }

  const businessProfileId = user.businessProfileId;

  const now = new Date();

  const todayStart = startOfUtcDay(now);

  const sevenDaysAgo = new Date(
    todayStart.getTime() - 6 * 24 * 60 * 60 * 1000
  );

  const monthStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1
    )
  );

  const todaySales = await prisma.sale.findMany({
    where: {
      businessProfileId,
      createdAt: {
        gte: todayStart,
      },
      status: SaleStatus.COMPLETED,
    },
    select: {
      total: true,
    },
  });

  const todayRevenue = todaySales.reduce(
    (sum, sale) => sum.add(sale.total),
    new Prisma.Decimal(0)
  );

  const last7DaysSales = await prisma.sale.findMany({
    where: {
      businessProfileId,
      createdAt: {
        gte: sevenDaysAgo,
      },
      status: SaleStatus.COMPLETED,
    },
    select: {
      createdAt: true,
      total: true,
    },
  });

  const dayBuckets: Record<string, number> = {};

  for (let i = 0; i < 7; i++) {
    const date = new Date(
      sevenDaysAgo.getTime() +
        i * 24 * 60 * 60 * 1000
    );

    const key = date.toISOString().slice(0, 10);

    dayBuckets[key] = 0;
  }

  for (const sale of last7DaysSales) {
    const key = sale.createdAt
      .toISOString()
      .slice(0, 10);

    if (key in dayBuckets) {
      dayBuckets[key] += Number(sale.total);
    }
  }

  const last7DaysChart = Object.entries(
    dayBuckets
  ).map(([date, revenue]) => ({
    date,
    revenue,
  }));

  const monthSaleItems = await prisma.saleItem.groupBy({
    by: ['productId'],

    where: {
      sale: {
        businessProfileId,

        createdAt: {
          gte: monthStart,
        },

        status: SaleStatus.COMPLETED,
      },
    },

    _sum: {
      quantity: true,
      lineTotal: true,
    },

    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },

    take: 5,
  });

  const productIds = monthSaleItems.map(
    (item) => item.productId
  );

  const productsInfo =
    productIds.length > 0
      ? await prisma.product.findMany({
          where: {
            businessProfileId,

            id: {
              in: productIds,
            },
          },

          select: {
            id: true,
            name: true,
            sku: true,
          },
        })
      : [];

  const productMap = new Map(
    productsInfo.map((product) => [
      product.id,
      product,
    ])
  );

  const topProducts = monthSaleItems.map(
    (item) => ({
      productId: item.productId,

      name:
        productMap.get(item.productId)?.name ??
        'Unknown',

      sku:
        productMap.get(item.productId)?.sku ??
        '',

      quantity:
        item._sum.quantity ?? 0,

      revenue: Number(
        item._sum.lineTotal ?? 0
      ),
    })
  );

  const allActiveProducts =
    await prisma.product.findMany({
      where: {
        businessProfileId,
        active: true,
      },

      select: {
        stock: true,
        costPrice: true,
        lowStockThreshold: true,
      },
    });

  const lowStockCount =
    allActiveProducts.filter(
      (product) =>
        product.stock <= product.lowStockThreshold
    ).length;

  const stockValue = allActiveProducts.reduce(
    (sum, product) =>
      sum.add(
        product.costPrice.mul(product.stock)
      ),

    new Prisma.Decimal(0)
  );

  const todaySalesCount = todaySales.length;

  const recentSales = await prisma.sale.findMany({
    where: {
      businessProfileId,
    },

    take: 5,

    orderBy: {
      createdAt: 'desc',
    },

    include: {
      cashier: {
        select: {
          name: true,
        },
      },
    },
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

export async function listAuditLogs(
  req: Request,
  res: Response
) {
  const userId = req.user!.id;

  const currentUser = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      businessProfileId: true,
    },
  });

  if (!currentUser?.businessProfileId) {
    throw AppError.badRequest(
      'User is not connected to a business'
    );
  }

  const businessProfileId =
    currentUser.businessProfileId;

  const q = (
    req as Request & {
      validatedQuery?: {
        userId?: string;
        action?: string;
        entityType?: string;
        page: number;
        pageSize: number;
      };
    }
  ).validatedQuery!;

  const businessUsers = await prisma.user.findMany({
    where: {
      businessProfileId,
    },

    select: {
      id: true,
    },
  });

  const businessUserIds = businessUsers.map(
    (user) => user.id
  );

  const where: Prisma.AuditLogWhereInput = {
    userId: {
      in: businessUserIds,
    },
  };

  if (q.userId) {
    if (!businessUserIds.includes(q.userId)) {
      throw AppError.forbidden(
        'User does not belong to your business'
      );
    }

    where.userId = q.userId;
  }

  if (q.action) {
    where.action = q.action;
  }

  if (q.entityType) {
    where.entityType = q.entityType;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,

      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },

      skip: (q.page - 1) * q.pageSize,

      take: q.pageSize,
    }),

    prisma.auditLog.count({
      where,
    }),
  ]);

  res.json({
    logs,
    page: q.page,
    pageSize: q.pageSize,
    total,
  });
}