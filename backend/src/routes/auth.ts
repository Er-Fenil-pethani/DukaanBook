import { Router } from 'express';
import { login, me, register } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { loginSchema, registerSchema } from '../validators/auth';
import { authLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post(
  '/register',
  authLimiter,
  validateBody(registerSchema),
  asyncHandler(register)
);

router.post(
  '/login',
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(login)
);

router.get(
  '/me',
  authenticate,
  asyncHandler(me)
);

export default router;