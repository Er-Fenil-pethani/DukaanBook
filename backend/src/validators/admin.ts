import { z } from 'zod';

export const updateBusinessSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  address: z.string().max(500).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  currency: z.string().min(1).max(8).optional(),
  taxRate: z.coerce.number().min(0).max(100).optional(),
});

export const createStaffSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120),
});

export const categorySchema = z.object({
  name: z.string().min(1).max(60),
});

export const productCreateSchema = z.object({
  sku: z.string().min(1).max(60),
  barcode: z.string().max(60).optional().nullable(),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional().nullable(),
  price: z.coerce.number().nonnegative(),
  costPrice: z.coerce.number().nonnegative(),
  stock: z.coerce.number().int().nonnegative().default(0),
  lowStockThreshold: z.coerce.number().int().nonnegative().default(10),
  categoryId: z.string().uuid(),
  active: z.coerce.boolean().optional(),
});

export const productUpdateSchema = productCreateSchema.partial();

export const productListQuery = z.object({
  search: z.string().optional(),
  categoryId: z.string().uuid().optional(),
  active: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  lowStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const stockAdjustSchema = z.object({
  type: z.enum(['PURCHASE', 'RETURN', 'ADJUSTMENT', 'DAMAGE']),
  quantity: z.coerce.number().int().refine((v) => v !== 0, 'quantity must be non-zero'),
  reason: z.string().min(1).max(200),
  notes: z.string().max(500).optional().nullable(),
});

export const salesListQuery = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  cashierId: z.string().uuid().optional(),
  paymentMethod: z.enum(['CASH', 'CARD']).optional(),
  status: z.enum(['COMPLETED', 'REFUNDED']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const auditListQuery = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
});
