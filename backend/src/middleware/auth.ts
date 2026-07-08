import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { prisma } from '../config/prisma';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface JwtPayload {
  sub: string;
  role: Role;
  iat?: number;
  exp?: number;
}

export function signToken(user: { id: string; role: Role }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw AppError.unauthorized('Missing bearer token');
    }
    const token = header.slice(7);
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      throw AppError.unauthorized('Invalid or expired token');
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw AppError.unauthorized('User no longer exists');
    if (user.suspended) throw AppError.forbidden('Account suspended');
    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch (e) {
    next(e);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(AppError.unauthorized());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden('Insufficient role'));
    next();
  };
}
