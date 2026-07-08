import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import {
  createSale,
  listSales,
  getSale,
  refundSale,
  searchProductsForPOS,
} from '../controllers/salesController';
import { createSaleSchema, refundSchema, productSearchQuery } from '../validators/sales';
import { salesListQuery } from '../validators/admin';

const router = Router();

router.use(authenticate);

router.get('/products/search', validateQuery(productSearchQuery), asyncHandler(searchProductsForPOS));
router.post('/sales', validateBody(createSaleSchema), asyncHandler(createSale));
router.get('/sales', validateQuery(salesListQuery), asyncHandler(listSales));
router.get('/sales/:id', asyncHandler(getSale));
router.post('/sales/:id/refund', validateBody(refundSchema), asyncHandler(refundSale));

export default router;
