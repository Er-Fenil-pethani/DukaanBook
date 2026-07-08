import { Request, Response } from 'express';
import path from 'path';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { writeAudit } from '../services/auditLog';
import { processProductImage } from '../services/imageUpload';
import { env } from '../config/env';

async function ensureProfile() {
  let profile = await prisma.businessProfile.findFirst();
  if (!profile) {
    profile = await prisma.businessProfile.create({
      data: { name: 'My Store', currency: 'PKR', taxRate: 0 },
    });
  }
  return profile;
}

export async function getBusiness(_req: Request, res: Response) {
  const profile = await ensureProfile();
  res.json({ business: profile });
}

export async function updateBusiness(req: Request, res: Response) {
  const profile = await ensureProfile();
  const updated = await prisma.businessProfile.update({
    where: { id: profile.id },
    data: req.body,
  });
  await writeAudit({
    userId: req.user?.id,
    action: 'BUSINESS_UPDATE',
    entityType: 'BusinessProfile',
    entityId: updated.id,
    metadata: req.body,
    ipAddress: req.ip,
  });
  res.json({ business: updated });
}

export async function uploadLogo(req: Request, res: Response) {
  if (!req.file) throw AppError.badRequest('Logo file is required');
  const profile = await ensureProfile();
  const outputName = `logo-${profile.id}.jpg`;
  const outputPath = path.join(env.UPLOAD_DIR, 'products', outputName);
  await processProductImage(req.file.buffer, outputPath, 400);
  const logoUrl = `/uploads/products/${outputName}`;
  const updated = await prisma.businessProfile.update({
    where: { id: profile.id },
    data: { logoUrl },
  });
  await writeAudit({
    userId: req.user?.id,
    action: 'BUSINESS_LOGO_UPLOAD',
    entityType: 'BusinessProfile',
    entityId: updated.id,
    ipAddress: req.ip,
  });
  res.json({ business: updated });
}
