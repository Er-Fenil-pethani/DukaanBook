import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { signToken } from '../middleware/auth';
import { AppError } from '../utils/AppError';
import { writeAudit } from '../services/auditLog';
import { LoginInput } from '../validators/auth';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw AppError.unauthorized('Invalid email or password');

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw AppError.unauthorized('Invalid email or password');

  if (user.suspended) throw AppError.forbidden('Account suspended');

  const token = signToken({ id: user.id, role: user.role });

  await writeAudit({
    userId: user.id,
    action: 'AUTH_LOGIN',
    entityType: 'User',
    entityId: user.id,
    ipAddress: req.ip,
  });

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

export async function me(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { businessProfile: true },
  });
  if (!user) throw AppError.notFound('User not found');
  const { password, ...safe } = user;
  void password;
  res.json({ user: safe });
}
