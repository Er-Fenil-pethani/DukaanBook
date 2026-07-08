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

export async function listCategories(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  res.json({ categories });
}

export async function createCategory(req: Request, res: Response) {
  const { name } = req.body as { name: string };
  const slug = slugify(name);
  const exists = await prisma.category.findFirst({ where: { OR: [{ name }, { slug }] } });
  if (exists) throw AppError.conflict('Category already exists');
  const category = await prisma.category.create({ data: { name, slug } });
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
  const slug = slugify(name);
  const category = await prisma.category.update({
    where: { id },
    data: { name, slug },
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
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) throw AppError.conflict('Category has products; reassign them first');
  await prisma.category.delete({ where: { id } });
  await writeAudit({
    userId: req.user?.id,
    action: 'CATEGORY_DELETE',
    entityType: 'Category',
    entityId: id,
    ipAddress: req.ip,
  });
  res.json({ deleted: true });
}
