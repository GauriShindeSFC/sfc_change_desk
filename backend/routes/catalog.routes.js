import express from 'express';
import {
  getCatalog,
  getCatalogCategories,
  getCatalogSubcategories,
  getSubcategoryFields,
  createCatalogSubcategory
} from '../controllers/catalog.controller.js';
import { requireRole } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/catalog', getCatalog);
router.get('/catalog/categories', getCatalogCategories);
router.post('/catalog/subcategories', requireRole(['Super Admin', 'role-1']), createCatalogSubcategory);
router.get('/catalog/categories/:id/subcategories', getCatalogSubcategories);
router.get('/catalog/subcategories/:id/fields', getSubcategoryFields);

export default router;
