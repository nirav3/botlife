import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getCatalog } from '../controllers/exercises.controller';

const router = Router();

router.use(authenticate);

router.get('/catalog', getCatalog);

export default router;
