import express from 'express';
import { login, me } from '../controllers/auth.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { loginSchema } from '../validations/auth.validation.js';

const router = express.Router();

router.post('/login', validate(loginSchema), login);
router.get('/me', requireAuth, me);

// Placeholder for the upcoming Microsoft Entra ID (Azure AD) SSO flow:
//   router.get('/microsoft', startMicrosoftLogin);
//   router.get('/microsoft/callback', handleMicrosoftCallback); // -> issueToken(user)

export default router;
