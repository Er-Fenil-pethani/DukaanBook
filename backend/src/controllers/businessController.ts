import { Request, Response } from 'express';
import path from 'path';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { writeAudit } from '../services/auditLog';
import { processProductImage } from '../services/imageUpload';
import { env } from '../config/env';

async function getUserBusinessProfileId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { businessProfileId: true },
  });

  if (!user) {
    throw AppError.unauthorized('User not found');
  }

  if (!user.businessProfileId) {
    throw AppError.badRequest('Business profile not assigned to this user');
  }

  return user.businessProfileId;
}

export async function getBusiness(req: Request, res: Response) {
  const userId = req.user!.id;
  const businessProfileId = await getUserBusinessProfileId(userId);

  const profile = await prisma.businessProfile.findUnique({
    where: { id: businessProfileId },
  });

  if (!profile) {
    throw AppError.notFound('Business profile not found');
  }

  res.json({ business: profile });
}

export async function updateBusiness(req: Request, res: Response) {
  const userId = req.user!.id;
  const businessProfileId = await getUserBusinessProfileId(userId);

  const updated = await prisma.businessProfile.update({
    where: { id: businessProfileId },
    data: {
      name: req.body.name,
      address: req.body.address,
      phone: req.body.phone,
      currency: req.body.currency,
      taxRate: req.body.taxRate,
    },
  });

  await writeAudit({
    userId,
    action: 'BUSINESS_UPDATE',
    entityType: 'BusinessProfile',
    entityId: updated.id,
    metadata: req.body,
    ipAddress: req.ip,
  });

  res.json({ business: updated });
}

export async function uploadLogo(req: Request, res: Response) {
  if (!req.file) {
    throw AppError.badRequest('Logo file is required');
  }

  const userId = req.user!.id;
  const businessProfileId = await getUserBusinessProfileId(userId);

  const profile = await prisma.businessProfile.findUnique({
    where: { id: businessProfileId },
  });

  if (!profile) {
    throw AppError.notFound('Business profile not found');
  }

  const outputName = `logo-${profile.id}.jpg`;
  const outputPath = path.join(
    env.UPLOAD_DIR,
    'products',
    outputName
  );

  await processProductImage(
    req.file.buffer,
    outputPath,
    400
  );

  const logoUrl = `/uploads/products/${outputName}`;

  const updated = await prisma.businessProfile.update({
    where: { id: businessProfileId },
    data: { logoUrl },
  });

  await writeAudit({
    userId,
    action: 'BUSINESS_LOGO_UPLOAD',
    entityType: 'BusinessProfile',
    entityId: updated.id,
    ipAddress: req.ip,
  });

  res.json({ business: updated });
}