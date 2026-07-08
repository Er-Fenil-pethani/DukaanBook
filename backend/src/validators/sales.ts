import { z } from 'zod';

export const saleItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
});

export const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1).max(200),
  paymentMethod: z.enum(['CASH', 'CARD']),
});

export const refundSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const productSearchQuery = z.object({
  q: z.string().default(''),
  limit: z.coerce.number().int().positive().max(50).default(20),
});
