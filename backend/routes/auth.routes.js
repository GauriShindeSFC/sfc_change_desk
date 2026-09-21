import express from 'express';
import { login, me, startMicrosoftLogin, handleMicrosoftCallback } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginSchema } from '../validations/auth.validation.js';

const router = express.Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, me);

// Microsoft Entra ID (Azure AD) SSO Endpoints
router.get('/microsoft', startMicrosoftLogin);
router.get('/microsoft/callback', handleMicrosoftCallback);

export default router;
