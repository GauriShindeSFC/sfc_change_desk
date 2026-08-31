import express from 'express';
import {
  getMyRequests,
  createChangeRequest,
  updateDraftChangeRequest,
  submitDraftChangeRequest
} from '../controllers/dashboardController.js';
import { validateChangeRequest } from '../validations/changeRequestValidation.js';

const router = express.Router();

router.get('/my-requests', getMyRequests);
router.post('/change-requests', validateChangeRequest, createChangeRequest);
router.patch('/change-requests/:id', updateDraftChangeRequest);
router.patch('/change-requests/:id/submit', submitDraftChangeRequest);

export default router;
