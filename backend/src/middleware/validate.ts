import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny } from 'zod';

export const validateBody =
  (schema: ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return next(parsed.error);
    req.body = parsed.data;
    next();
  };

export const validateQuery =
  (schema: ZodTypeAny) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) return next(parsed.error);
    (req as Request & { validatedQuery?: unknown }).validatedQuery = parsed.data;
    next();
  };
