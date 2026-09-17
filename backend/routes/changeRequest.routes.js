import express from 'express';
import {
  getMyRequests,
  createChangeRequest,
  updateDraftChangeRequest,
  submitDraftChangeRequest
} from '../controllers/changeRequest.controller.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createChangeRequestSchema } from '../validations/changeRequest.validation.js';

const router = express.Router();

router.get('/my-requests', getMyRequests);
router.post('/change-requests', validate(createChangeRequestSchema), createChangeRequest);
router.patch('/change-requests/:id', updateDraftChangeRequest);
router.patch('/change-requests/:id/submit', submitDraftChangeRequest);

export default router;
