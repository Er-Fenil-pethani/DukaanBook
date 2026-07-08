import { Request, Response } from 'express';
import path from 'path';
import { randomUUID } from 'crypto';
import { Prisma, StockMovementType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { writeAudit } from '../services/auditLog';
import { processProductImage, removeFileIfExists } from '../services/imageUpload';
import { env } from '../config/env';

type ValidatedReq<TQuery = unknown> = Request & { validatedQuery?: TQuery };

interface ProductListQuery {
  search?: string;
  categoryId?: string;
  active?: boolean;
  lowStock?: boolean;
  page: number;
  pageSize: number;
}

export async function listProducts(req: Request, res: Response) {
  const q = (req as ValidatedReq<ProductListQuery>).validatedQuery!;
  const where: Prisma.ProductWhereInput = {};
  if (q.search) {
    where.OR = [
      { name: { contains: q.search, mode: 'insensitive' } },
      { sku: { contains: q.search, mode: 'insensitive' } },
      { barcode: { contains: q.search, mode: 'insensitive' } },
    ];
  }
  if (q.categoryId) where.categoryId = q.categoryId;
  if (q.active !== undefined) where.active = q.active;

  let products = await prisma.product.findMany({
    where,
    include: { category: { select: { id: true, name: true, slug: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (q.page - 1) * q.pageSize,
    take: q.pageSize,
  });
  if (q.lowStock) {
    products = products.filter((p) => p.stock <= p.lowStockThreshold);
  }
  const total = await prisma.product.count({ where });
  res.json({ products, page: q.page, pageSize: q.pageSize, total });
}

export async function getProduct(req: Request, res: Response) {
  const { id } = req.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      stockMovements: {
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, name: true, email: true } } },
      },
    },
  });
  if (!product) throw AppError.notFound('Product not found');
  res.json({ product });
}

async function processUploadedFile(file: Express.Multer.File | undefined): Promise<string | undefined> {
  if (!file) return undefined;
  const filename = `${randomUUID()}.jpg`;
  const outputPath = path.join(env.UPLOAD_DIR, 'products', filename);
  await processProductImage(file.buffer, outputPath, 800);
  return `/uploads/products/${filename}`;
}

export async function createProduct(req: Request, res: Response) {
  const body = req.body as {
    sku: string;
    barcode?: string | null;
    name: string;
    description?: string | null;
    price: number;
    costPrice: number;
    stock?: number;
    lowStockThreshold?: number;
    categoryId: string;
    active?: boolean;
  };
  const imageUrl = await processUploadedFile(req.file);

  const category = await prisma.category.findUnique({ where: { id: body.categoryId } });
  if (!category) throw AppError.badRequest('Invalid categoryId');

  const product = await prisma.product.create({
    data: {
      sku: body.sku,
      barcode: body.barcode || null,
      name: body.name,
      description: body.description || null,
      price: new Prisma.Decimal(body.price),
      costPrice: new Prisma.Decimal(body.costPrice),
      stock: body.stock ?? 0,
      lowStockThreshold: body.lowStockThreshold ?? 10,
      categoryId: body.categoryId,
      imageUrl: imageUrl ?? null,
      active: body.active ?? true,
    },
  });

  if ((body.stock ?? 0) > 0) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        type: StockMovementType.PURCHASE,
        quantity: body.stock ?? 0,
        reason: 'Initial stock',
        actorId: req.user!.id,
      },
    });
  }

  await writeAudit({
    userId: req.user?.id,
    action: 'PRODUCT_CREATE',
    entityType: 'Product',
    entityId: product.id,
    metadata: { sku: product.sku, name: product.name },
    ipAddress: req.ip,
  });

  res.status(201).json({ product });
}

export async function updateProduct(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body as Partial<{
    sku: string;
    barcode: string | null;
    name: string;
    description: string | null;
    price: number;
    costPrice: number;
    lowStockThreshold: number;
    categoryId: string;
    active: boolean;
  }>;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Product not found');

  const newImageUrl = await processUploadedFile(req.file);
  if (newImageUrl && existing.imageUrl) {
    await removeFileIfExists(path.join(process.cwd(), existing.imageUrl.replace(/^\//, '')));
  }

  const data: Prisma.ProductUpdateInput = {};
  if (body.sku !== undefined) data.sku = body.sku;
  if (body.barcode !== undefined) data.barcode = body.barcode || null;
  if (body.name !== undefined) data.name = body.name;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.price !== undefined) data.price = new Prisma.Decimal(body.price);
  if (body.costPrice !== undefined) data.costPrice = new Prisma.Decimal(body.costPrice);
  if (body.lowStockThreshold !== undefined) data.lowStockThreshold = body.lowStockThreshold;
  if (body.categoryId !== undefined) data.category = { connect: { id: body.categoryId } };
  if (body.active !== undefined) data.active = body.active;
  if (newImageUrl) data.imageUrl = newImageUrl;

  const product = await prisma.product.update({ where: { id }, data });

  await writeAudit({
    userId: req.user?.id,
    action: 'PRODUCT_UPDATE',
    entityType: 'Product',
    entityId: id,
    metadata: body as Prisma.InputJsonValue,
    ipAddress: req.ip,
  });

  res.json({ product });
}

export async function deleteProduct(req: Request, res: Response) {
  const { id } = req.params;
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { _count: { select: { saleItems: true } } },
  });
  if (!existing) throw AppError.notFound('Product not found');

  if (existing._count.saleItems > 0) {
    const product = await prisma.product.update({
      where: { id },
      data: { active: false },
    });
    await writeAudit({
      userId: req.user?.id,
      action: 'PRODUCT_SOFT_DELETE',
      entityType: 'Product',
      entityId: id,
      ipAddress: req.ip,
    });
    res.json({ deleted: false, deactivated: true, product });
    return;
  }

  await prisma.stockMovement.deleteMany({ where: { productId: id } });
  await prisma.product.delete({ where: { id } });
  if (existing.imageUrl) {
    await removeFileIfExists(path.join(process.cwd(), existing.imageUrl.replace(/^\//, '')));
  }
  await writeAudit({
    userId: req.user?.id,
    action: 'PRODUCT_DELETE',
    entityType: 'Product',
    entityId: id,
    ipAddress: req.ip,
  });
  res.json({ deleted: true });
}

export async function adjustStock(req: Request, res: Response) {
  const { id } = req.params;
  const body = req.body as {
    type: 'PURCHASE' | 'RETURN' | 'ADJUSTMENT' | 'DAMAGE';
    quantity: number;
    reason: string;
    notes?: string | null;
  };
  const actorId = req.user!.id;

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id } });
    if (!product) throw AppError.notFound('Product not found');

    const newStock = product.stock + body.quantity;
    if (newStock < 0) {
      throw AppError.badRequest(
        `Adjustment would result in negative stock (${product.stock} + ${body.quantity} = ${newStock})`
      );
    }

    const updated = await tx.product.update({
      where: { id },
      data: { stock: newStock },
    });

    const movement = await tx.stockMovement.create({
      data: {
        productId: id,
        type: body.type as StockMovementType,
        quantity: body.quantity,
        reason: body.reason,
        notes: body.notes ?? null,
        actorId,
      },
    });

    await writeAudit(
      {
        userId: actorId,
        action: 'STOCK_ADJUST',
        entityType: 'Product',
        entityId: id,
        metadata: { type: body.type, quantity: body.quantity, reason: body.reason },
        ipAddress: req.ip,
      },
      tx
    );

    return { product: updated, movement };
  });

  res.json(result);
}
