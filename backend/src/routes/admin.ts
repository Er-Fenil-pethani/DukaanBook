import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { upload } from '../services/imageUpload';
import {
  getBusiness,
  updateBusiness,
  uploadLogo,
} from '../controllers/businessController';
import {
  listStaff,
  createStaff,
  suspendStaff,
  unsuspendStaff,
  deleteStaff,
} from '../controllers/staffController';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
} from '../controllers/productController';
import { dashboard, listAuditLogs } from '../controllers/reportsController';
import { listSales } from '../controllers/salesController';
import {
  updateBusinessSchema,
  createStaffSchema,
  categorySchema,
  productCreateSchema,
  productUpdateSchema,
  productListQuery,
  stockAdjustSchema,
  salesListQuery,
  auditListQuery,
} from '../validators/admin';

const router = Router();

router.use(authenticate, requireRole('OWNER'));

// Business
router.get('/business', asyncHandler(getBusiness));
router.patch('/business', validateBody(updateBusinessSchema), asyncHandler(updateBusiness));
router.post('/business/logo', upload.single('logo'), asyncHandler(uploadLogo));

// Staff
router.get('/staff', asyncHandler(listStaff));
router.post('/staff', validateBody(createStaffSchema), asyncHandler(createStaff));
router.patch('/staff/:id/suspend', asyncHandler(suspendStaff));
router.patch('/staff/:id/unsuspend', asyncHandler(unsuspendStaff));
router.delete('/staff/:id', asyncHandler(deleteStaff));

// Categories
router.get('/categories', asyncHandler(listCategories));
router.post('/categories', validateBody(categorySchema), asyncHandler(createCategory));
router.patch('/categories/:id', validateBody(categorySchema), asyncHandler(updateCategory));
router.delete('/categories/:id', asyncHandler(deleteCategory));

// Products
router.get('/products', validateQuery(productListQuery), asyncHandler(listProducts));
router.get('/products/:id', asyncHandler(getProduct));
router.post(
  '/products',
  upload.single('image'),
  validateBody(productCreateSchema),
  asyncHandler(createProduct)
);
router.patch(
  '/products/:id',
  upload.single('image'),
  validateBody(productUpdateSchema),
  asyncHandler(updateProduct)
);
router.delete('/products/:id', asyncHandler(deleteProduct));
router.post('/products/:id/stock', validateBody(stockAdjustSchema), asyncHandler(adjustStock));

// Reports
router.get('/reports/dashboard', asyncHandler(dashboard));
router.get('/reports/sales', validateQuery(salesListQuery), asyncHandler(listSales));

// Audit
router.get('/audit-logs', validateQuery(auditListQuery), asyncHandler(listAuditLogs));

export default router;
