import express from 'express';
import { login, me } from '../controllers/authController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', requireAuth, me);

// Placeholder for the upcoming Microsoft Entra ID (Azure AD) SSO flow:
//   router.get('/microsoft', startMicrosoftLogin);
//   router.get('/microsoft/callback', handleMicrosoftCallback); // -> issueToken(user)

export default router;
