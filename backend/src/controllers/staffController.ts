import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { writeAudit } from '../services/auditLog';

const safeSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  suspended: true,
  createdAt: true,
} as const;

async function getBusinessProfileId(userId?: string) {
  if (!userId) {
    throw AppError.badRequest('Authenticated user is required');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { businessProfileId: true },
  });

  if (!user?.businessProfileId) {
    throw AppError.badRequest('Business profile not found');
  }

  return user.businessProfileId;
}

export async function listStaff(req: Request, res: Response) {
  const businessProfileId = await getBusinessProfileId(req.user?.id);

  const staff = await prisma.user.findMany({
    where: {
      role: Role.CASHIER,
      businessProfileId,
    },
    select: safeSelect,
    orderBy: { createdAt: 'desc' },
  });

  res.json({ staff });
}

export async function createStaff(req: Request, res: Response) {
  const businessProfileId = await getBusinessProfileId(req.user?.id);

  const { email, password, name } = req.body as {
    email: string;
    password: string;
    name: string;
  };

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw AppError.conflict('Email already in use');
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name,
      role: Role.CASHIER,
      businessProfileId,
    },
    select: safeSelect,
  });

  await writeAudit({
    userId: req.user?.id,
    action: 'STAFF_CREATE',
    entityType: 'User',
    entityId: user.id,
    metadata: {
      email: user.email,
      name: user.name,
    },
    ipAddress: req.ip,
  });

  res.status(201).json({ staff: user });
}

async function setSuspended(
  req: Request,
  suspended: boolean
) {
  const businessProfileId = await getBusinessProfileId(req.user?.id);
  const { id } = req.params;

  const target = await prisma.user.findFirst({
    where: {
      id,
      role: Role.CASHIER,
      businessProfileId,
    },
  });

  if (!target) {
    throw AppError.notFound('Cashier not found');
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { suspended },
    select: safeSelect,
  });

  await writeAudit({
    userId: req.user?.id,
    action: suspended ? 'STAFF_SUSPEND' : 'STAFF_UNSUSPEND',
    entityType: 'User',
    entityId: id,
    ipAddress: req.ip,
  });

  return updated;
}

export async function suspendStaff(
  req: Request,
  res: Response
) {
  const updated = await setSuspended(req, true);

  res.json({ staff: updated });
}

export async function unsuspendStaff(
  req: Request,
  res: Response
) {
  const updated = await setSuspended(req, false);

  res.json({ staff: updated });
}

export async function deleteStaff(
  req: Request,
  res: Response
) {
  const businessProfileId = await getBusinessProfileId(req.user?.id);
  const { id } = req.params;

  const target = await prisma.user.findFirst({
    where: {
      id,
      role: Role.CASHIER,
      businessProfileId,
    },
  });

  if (!target) {
    throw AppError.notFound('Cashier not found');
  }

  const refCount = await prisma.sale.count({
    where: {
      cashierId: id,
      businessProfileId,
    },
  });

  if (refCount > 0) {
    await prisma.user.update({
      where: { id },
      data: { suspended: true },
    });

    await writeAudit({
      userId: req.user?.id,
      action: 'STAFF_SOFT_DELETE',
      entityType: 'User',
      entityId: id,
      metadata: {
        reason: 'has sales references',
        refCount,
      },
      ipAddress: req.ip,
    });

    res.json({
      deleted: false,
      suspended: true,
      message: 'Suspended (sales history retained)',
    });

    return;
  }

  await prisma.user.delete({
    where: { id },
  });

  await writeAudit({
    userId: req.user?.id,
    action: 'STAFF_DELETE',
    entityType: 'User',
    entityId: id,
    ipAddress: req.ip,
  });

  res.json({ deleted: true });
}