import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { writeAudit } from '../services/auditLog';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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

export async function listCategories(req: Request, res: Response) {
  const businessProfileId = await getBusinessProfileId(req.user!.id);

  const categories = await prisma.category.findMany({
    where: { businessProfileId },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  res.json({ categories });
}

export async function createCategory(req: Request, res: Response) {
  const { name } = req.body as { name: string };
  const businessProfileId = await getBusinessProfileId(req.user!.id);
  const slug = slugify(name);

  const exists = await prisma.category.findFirst({
    where: {
      businessProfileId,
      OR: [{ name }, { slug }],
    },
  });

  if (exists) {
    throw AppError.conflict('Category already exists');
  }

  const category = await prisma.category.create({
    data: {
      name,
      slug,
      businessProfileId,
    },
  });

  await writeAudit({
    userId: req.user?.id,
    action: 'CATEGORY_CREATE',
    entityType: 'Category',
    entityId: category.id,
    metadata: { name },
    ipAddress: req.ip,
  });

  res.status(201).json({ category });
}

export async function updateCategory(req: Request, res: Response) {
  const { id } = req.params;
  const { name } = req.body as { name: string };
  const businessProfileId = await getBusinessProfileId(req.user!.id);
  const slug = slugify(name);

  const existing = await prisma.category.findFirst({
    where: {
      id,
      businessProfileId,
    },
  });

  if (!existing) {
    throw AppError.notFound('Category not found');
  }

  const duplicate = await prisma.category.findFirst({
    where: {
      businessProfileId,
      id: { not: id },
      OR: [{ name }, { slug }],
    },
  });

  if (duplicate) {
    throw AppError.conflict('Category already exists');
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      name,
      slug,
    },
  });

  await writeAudit({
    userId: req.user?.id,
    action: 'CATEGORY_UPDATE',
    entityType: 'Category',
    entityId: id,
    metadata: { name },
    ipAddress: req.ip,
  });

  res.json({ category });
}

export async function deleteCategory(req: Request, res: Response) {
  const { id } = req.params;
  const businessProfileId = await getBusinessProfileId(req.user!.id);

  const category = await prisma.category.findFirst({
    where: {
      id,
      businessProfileId,
    },
  });

  if (!category) {
    throw AppError.notFound('Category not found');
  }

  const count = await prisma.product.count({
    where: {
      categoryId: id,
      businessProfileId,
    },
  });

  if (count > 0) {
    throw AppError.conflict('Category has products; reassign them first');
  }

  await prisma.category.delete({
    where: { id },
  });

  await writeAudit({
    userId: req.user?.id,
    action: 'CATEGORY_DELETE',
    entityType: 'Category',
    entityId: id,
    ipAddress: req.ip,
  });

  res.json({ deleted: true });
}