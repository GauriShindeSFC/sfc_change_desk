import express from 'express';
import jwt from 'jsonwebtoken';
import { ChangeRequest, Workflow, ChangeRequestApproval } from '../models/index.js';
import { serializeChangeRequest } from '../utils/serializers.js';
import {
  applyWorklistActionService,
  addAuditLog
} from '../services/dashboard.service.js';
import { IdentityResolver } from '../services/identityResolver.service.js';

const CR_INCLUDE = [
  { model: Workflow, as: 'workflow', attributes: ['id', 'name'] },
  { model: ChangeRequestApproval, as: 'approvals' }
];

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sfc-change-desk-secure-jwt-secret-key-2026';

// GET /api/public/change-request-action?token=...
router.get('/change-request-action', async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Missing action token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { crId, approverEmail, defaultAction } = decoded;

    const cr = await ChangeRequest.findByPk(crId, { include: CR_INCLUDE });
    if (!cr) {
      return res.status(404).json({ success: false, message: `Change Request ${crId} not found` });
    }

    const serialized = serializeChangeRequest(cr);

    return res.json({
      success: true,
      data: {
        cr: serialized,
        action: defaultAction || 'approve',
        approverEmail,
        isPending: serialized.status === 'Pending'
      }
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError' ? 'This action link has expired' : 'Invalid or malformed action token'
    });
  }
});

// POST /api/public/change-request-action
router.post('/change-request-action', async (req, res) => {
  const { token, action, comment } = req.body || {};

  if (!token) {
    return res.status(400).json({ success: false, message: 'Missing action token' });
  }
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action must be "approve" or "reject"' });
  }
  if (action === 'reject' && (!comment || !comment.trim())) {
    return res.status(400).json({ success: false, message: 'A rejection reason is required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { crId, approverEmail } = decoded;

    const cr = await ChangeRequest.findByPk(crId);
    if (!cr) {
      return res.status(404).json({ success: false, message: `Change Request ${crId} not found` });
    }
    if (cr.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `This Change Request has already been marked as ${cr.status}.`
      });
    }

    // Resolve approver's actorId from their email if available
    let actorId = null;
    if (approverEmail) {
      const resIdentity = await IdentityResolver.resolveByEmail(approverEmail);
      if (resIdentity?.status === 'SUCCESS' && resIdentity?.identity) {
        actorId = resIdentity.identity.id || resIdentity.identity.userKey;
      }
    }

    const actionComment = (comment || '').trim();
    const result = await applyWorklistActionService({
      id: crId,
      action,
      rejectionReason: actionComment,
      comment: actionComment,
      actorId
    });

    return res.json({
      success: true,
      message: `Change Request ${crId} has been ${action === 'approve' ? 'Approved' : 'Rejected'} successfully.`,
      data: result
    });
  } catch (err) {
    console.error('[publicActions] Action failed:', err.message);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to process approval action'
    });
  }
});

export default router;
