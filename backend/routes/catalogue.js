import express from 'express';
import {
  getCatalog,
  getCatalogCategories,
  getCatalogSubcategories,
  getSubcategoryFields,
  getCatalogueManagement,
  createCatalogSubcategory,
  createWorkflow
} from '../controllers/dashboardController.js';
import { requireRole } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/catalog', getCatalog);
router.get('/catalog/categories', getCatalogCategories);
router.post('/catalog/subcategories', requireRole(['Admin', 'Change Manager', 'Super Admin']), createCatalogSubcategory);
router.get('/catalog/categories/:id/subcategories', getCatalogSubcategories);
router.get('/catalog/subcategories/:id/fields', getSubcategoryFields);
router.get('/catalogue-management', getCatalogueManagement);
router.post('/workflows', requireRole(['Admin', 'Change Manager']), createWorkflow);

export default router;
