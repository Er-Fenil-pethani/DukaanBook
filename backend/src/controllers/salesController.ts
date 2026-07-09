import { Request, Response } from 'express';
import {
  Prisma,
  Role,
  SaleStatus,
  StockMovementType,
} from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { writeAudit } from '../services/auditLog';

interface CreateSaleBody {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  paymentMethod: 'CASH' | 'CARD';
}

function dayKey(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');

  return `${yyyy}${mm}${dd}`;
}

function startOfDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );
}

function endOfDay(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );
}

async function getBusinessProfileId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { businessProfileId: true },
  });

  if (!user?.businessProfileId) {
    throw AppError.badRequest('Business profile not found');
  }

  return user.businessProfileId;
}

async function getBusinessTaxRate(
  businessProfileId: string
): Promise<number> {
  const profile = await prisma.businessProfile.findUnique({
    where: {
      id: businessProfileId,
    },
    select: {
      taxRate: true,
    },
  });

  if (!profile) {
    return 0;
  }

  return Number(profile.taxRate);
}

export async function createSale(req: Request, res: Response) {
  const body = req.body as CreateSaleBody;
  const cashierId = req.user!.id;
  const businessProfileId = await getBusinessProfileId(cashierId);
  const taxRatePct = await getBusinessTaxRate(businessProfileId);
  const taxMultiplier = taxRatePct / 100;

  const result = await prisma.$transaction(
    async (tx) => {
      const now = new Date();
      const dKey = dayKey(now);
      const lockKey = Number(dKey);

      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock(${lockKey})`
      );

      const ids = body.items.map((item) => item.productId);

      await tx.$queryRawUnsafe(
        `SELECT id FROM "Product" WHERE id IN (${ids
          .map((_, index) => `$${index + 1}`)
          .join(',')}) AND "businessProfileId" = $${ids.length + 1} FOR UPDATE`,
        ...ids,
        businessProfileId
      );

      const products = await tx.product.findMany({
        where: {
          id: {
            in: ids,
          },
          businessProfileId,
        },
      });

      const productMap = new Map(
        products.map((product) => [product.id, product])
      );

      let subtotal = new Prisma.Decimal(0);

      const itemsToCreate: Array<{
        productId: string;
        productName: string;
        productPrice: Prisma.Decimal;
        quantity: number;
        lineTotal: Prisma.Decimal;
      }> = [];

      for (const item of body.items) {
        const product = productMap.get(item.productId);

        if (!product) {
          throw AppError.badRequest(
            `Product not found: ${item.productId}`
          );
        }

        if (!product.active) {
          throw AppError.badRequest(
            `Product inactive: ${product.name}`
          );
        }

        if (product.stock < item.quantity) {
          throw AppError.badRequest(
            `Insufficient stock for "${product.name}" (have ${product.stock}, need ${item.quantity})`
          );
        }

        const lineTotal = product.price.mul(item.quantity);
        subtotal = subtotal.add(lineTotal);

        itemsToCreate.push({
          productId: product.id,
          productName: product.name,
          productPrice: product.price,
          quantity: item.quantity,
          lineTotal,
        });
      }

      const taxAmount = subtotal.mul(taxMultiplier);
      const total = subtotal.add(taxAmount);

      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);

      const todayCount = await tx.sale.count({
        where: {
          businessProfileId,
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      });

      const saleNumber = `S-${dKey}-${String(
        todayCount + 1
      ).padStart(5, '0')}`;

      const sale = await tx.sale.create({
        data: {
          businessProfileId,
          saleNumber,
          cashierId,
          subtotal,
          taxAmount,
          total,
          paymentMethod: body.paymentMethod,
          status: SaleStatus.COMPLETED,
          items: {
            create: itemsToCreate,
          },
        },
        include: {
          items: true,
          cashier: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      for (const item of body.items) {
        await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.SALE,
            quantity: -item.quantity,
            reason: `Sale ${saleNumber}`,
            actorId: cashierId,
          },
        });
      }

      await writeAudit(
        {
          userId: cashierId,
          action: 'SALE_CREATE',
          entityType: 'Sale',
          entityId: sale.id,
          metadata: {
            saleNumber,
            total: total.toString(),
            itemCount: body.items.length,
          },
          ipAddress: req.ip,
        },
        tx
      );

      return sale;
    },
    {
      isolationLevel:
        Prisma.TransactionIsolationLevel.Serializable,
      timeout: 15000,
    }
  );

  res.status(201).json({
    sale: result,
  });
}

export async function listSales(req: Request, res: Response) {
  const q = (
    req as Request & {
      validatedQuery?: {
        from?: string;
        to?: string;
        cashierId?: string;
        paymentMethod?: 'CASH' | 'CARD';
        status?: 'COMPLETED' | 'REFUNDED';
        page: number;
        pageSize: number;
      };
    }
  ).validatedQuery!;

  const businessProfileId = await getBusinessProfileId(req.user!.id);

  const where: Prisma.SaleWhereInput = {
    businessProfileId,
  };

  if (req.user!.role === Role.CASHIER) {
    where.cashierId = req.user!.id;
  }

  if (
    q.cashierId &&
    req.user!.role === Role.OWNER
  ) {
    where.cashierId = q.cashierId;
  }

  if (q.paymentMethod) {
    where.paymentMethod = q.paymentMethod;
  }

  if (q.status) {
    where.status = q.status;
  }

  if (q.from || q.to) {
    where.createdAt = {};

    if (q.from) {
      where.createdAt.gte = new Date(q.from);
    }

    if (q.to) {
      where.createdAt.lte = new Date(q.to);
    }
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        cashier: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),

    prisma.sale.count({
      where,
    }),
  ]);

  res.json({
    sales,
    page: q.page,
    pageSize: q.pageSize,
    total,
  });
}

export async function getSale(req: Request, res: Response) {
  const { id } = req.params;
  const businessProfileId = await getBusinessProfileId(req.user!.id);

  const sale = await prisma.sale.findFirst({
    where: {
      id,
      businessProfileId,
    },
    include: {
      cashier: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      },
    },
  });

  if (!sale) {
    throw AppError.notFound('Sale not found');
  }

  if (
    req.user!.role === Role.CASHIER &&
    sale.cashierId !== req.user!.id
  ) {
    throw AppError.forbidden('Not your sale');
  }

  res.json({ sale });
}

export async function refundSale(req: Request, res: Response) {
  const { id } = req.params;
  const { reason } = req.body as { reason: string };
  const actor = req.user!;
  const businessProfileId = await getBusinessProfileId(actor.id);

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findFirst({
      where: {
        id,
        businessProfileId,
      },
      include: {
        items: true,
      },
    });

    if (!sale) {
      throw AppError.notFound('Sale not found');
    }

    if (sale.status !== SaleStatus.COMPLETED) {
      throw AppError.badRequest('Sale already refunded');
    }

    if (actor.role === Role.CASHIER) {
      if (sale.cashierId !== actor.id) {
        throw AppError.forbidden('Not your sale');
      }

      const today = new Date();

      if (
        sale.createdAt < startOfDay(today) ||
        sale.createdAt > endOfDay(today)
      ) {
        throw AppError.forbidden(
          'Cashier may only refund same-day sales'
        );
      }
    }

    for (const item of sale.items) {
      await tx.product.update({
        where: {
          id: item.productId,
        },
        data: {
          stock: {
            increment: item.quantity,
          },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: StockMovementType.RETURN,
          quantity: item.quantity,
          reason: `Refund ${sale.saleNumber}: ${reason}`,
          actorId: actor.id,
        },
      });
    }

    const updated = await tx.sale.update({
      where: {
        id,
      },
      data: {
        status: SaleStatus.REFUNDED,
        refundedAt: new Date(),
        refundReason: reason,
      },
      include: {
        items: true,
      },
    });

    await writeAudit(
      {
        userId: actor.id,
        action: 'SALE_REFUND',
        entityType: 'Sale',
        entityId: sale.id,
        metadata: {
          saleNumber: sale.saleNumber,
          reason,
        },
        ipAddress: req.ip,
      },
      tx
    );

    return updated;
  });

  res.json({
    sale: result,
  });
}

export async function searchProductsForPOS(
  req: Request,
  res: Response
) {
  const q = (
    req as Request & {
      validatedQuery?: {
        q: string;
        limit: number;
      };
    }
  ).validatedQuery!;

  const businessProfileId = await getBusinessProfileId(req.user!.id);
  const trimmed = q.q.trim();

  const where: Prisma.ProductWhereInput = {
    businessProfileId,
    active: true,
  };

  if (trimmed) {
    where.OR = [
      {
        name: {
          contains: trimmed,
          mode: 'insensitive',
        },
      },
      {
        sku: {
          contains: trimmed,
          mode: 'insensitive',
        },
      },
      {
        barcode: {
          contains: trimmed,
          mode: 'insensitive',
        },
      },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    take: q.limit,
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      sku: true,
      barcode: true,
      name: true,
      price: true,
      stock: true,
      imageUrl: true,
      lowStockThreshold: true,
    },
  });

  res.json({ products });
}