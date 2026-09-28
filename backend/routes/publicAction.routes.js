import express from 'express';
import jwt from 'jsonwebtoken';
import { ChangeRequest, ChangeRequestApproval } from '../models/index.js';
import { PreSpendRequest } from '../models/PreSpendRequest.js';
import { TravelRequest } from '../models/TravelRequest.js';
import { serializeChangeRequest } from '../utils/serializers.js';
import {
  applyWorklistActionService,
  addAuditLog
} from '../services/dashboard.service.js';
import { handlePreSpendActionService } from '../services/preSpend.service.js';
import { handleTravelActionService } from '../services/travelDesk.service.js';
import { IdentityResolver } from '../services/identityResolver.service.js';
import { publicActionRateLimiter } from '../middlewares/rateLimit.middleware.js';

const CR_INCLUDE = [
  { model: ChangeRequestApproval, as: 'approvals' }
];

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'sfc-change-desk-secure-jwt-secret-key-2026';

router.use(publicActionRateLimiter);

// GET /api/public/change-request-action?token=...&module=...
router.get('/change-request-action', async (req, res) => {
  const { token, module: modQuery } = req.query;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Missing action token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { crId, preSpendId, travelId, approverEmail, defaultAction, stage: tokenStage, approvalCycle: tokenCycle } = decoded;
    const targetModule = modQuery || (preSpendId ? 'prespend' : travelId ? 'travel' : 'cr');

    // 1. Pre-Spend Module
    if (targetModule === 'prespend' || preSpendId) {
      const psId = preSpendId || crId;
      const ps = await PreSpendRequest.findByPk(psId);
      if (!ps) {
        return res.status(404).json({ success: false, message: `Pre-Spend Request ${psId} not found` });
      }
      if (tokenCycle && ps.approvalCycle && ps.approvalCycle !== tokenCycle) {
        return res.status(409).json({ success: false, message: 'This action link has expired due to a new review cycle.' });
      }
      const isStage1 = ps.approvalStage === 'manager_review';
      const isPending = ps.status === 'Pending Approval';
      return res.json({
        success: true,
        data: {
          module: 'prespend',
          request: ps,
          action: defaultAction || 'approve',
          approverEmail,
          stage: ps.approvalStage || 'manager_review',
          stageLabel: isStage1 ? 'Waiting for manager review' : ps.status === 'Approved' ? 'Approved' : 'Pending Stage 2 Review',
          isPending,
          isApproved: ps.status === 'Approved'
        }
      });
    }

    // 2. Travel Desk Module
    if (targetModule === 'travel' || travelId) {
      const trId = travelId || crId;
      const tr = await TravelRequest.findByPk(trId);
      if (!tr) {
        return res.status(404).json({ success: false, message: `Travel Request ${trId} not found` });
      }
      if (tokenCycle && tr.approvalCycle && tr.approvalCycle !== tokenCycle) {
        return res.status(409).json({ success: false, message: 'This action link has expired due to a new review cycle.' });
      }
      const isStage1 = tr.approvalStage === 'manager_review';
      const isPending = tr.status === 'Pending Approval';
      return res.json({
        success: true,
        data: {
          module: 'travel',
          request: tr,
          action: defaultAction || 'approve',
          approverEmail,
          stage: tr.approvalStage || 'manager_review',
          stageLabel: isStage1 ? 'Waiting for manager review' : tr.status === 'Approved' ? 'Approved' : 'Pending Stage 2 Review',
          isPending,
          isApproved: tr.status === 'Approved'
        }
      });
    }

    // 3. Change Desk Module (Default)
    const cr = await ChangeRequest.findByPk(crId, { include: CR_INCLUDE });
    if (!cr) {
      return res.status(404).json({ success: false, message: `Change Request ${crId} not found` });
    }
    if (tokenCycle && cr.approvalCycle && cr.approvalCycle !== tokenCycle) {
      return res.status(409).json({ success: false, message: 'This action link has expired due to a new review cycle.' });
    }

    const serialized = serializeChangeRequest(cr);
    const isStage1 = cr.approvalStage === 'manager_review';

    return res.json({
      success: true,
      data: {
        module: 'cr',
        cr: serialized,
        request: serialized,
        action: defaultAction || 'approve',
        approverEmail,
        stage: cr.approvalStage || 'manager_review',
        stageLabel: isStage1 ? 'Waiting for manager review' : cr.status === 'Approved' ? 'Manager approved' : 'Pending Stage 2 Review',
        isPending: serialized.status === 'Pending',
        isApproved: serialized.status === 'Approved'
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
  const { token, module: modBody, action, comment } = req.body || {};

  if (!token) {
    return res.status(400).json({ success: false, message: 'Missing action token' });
  }
  if (!['approve', 'reject', 'implement'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Action must be "approve", "reject", or "implement"' });
  }

  const actionComment = (comment || '').trim();
  if (!actionComment) {
    return res.status(400).json({ success: false, message: 'A comment is required for this action.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { crId, preSpendId, travelId, approverEmail, approvalCycle: tokenCycle } = decoded;
    const targetModule = modBody || (preSpendId ? 'prespend' : travelId ? 'travel' : 'cr');

    // Resolve approver's actor identity from email
    let actor = { email: approverEmail, displayName: 'Approver' };
    if (approverEmail) {
      const resIdentity = await IdentityResolver.resolveByEmail(approverEmail);
      if (resIdentity?.status === 'SUCCESS' && resIdentity?.identity) {
        actor = {
          ...resIdentity.identity,
          id: resIdentity.identity.id || resIdentity.identity.userKey,
          userKey: resIdentity.identity.userKey,
          email: resIdentity.identity.email || approverEmail,
          roleId: resIdentity.identity.roleId,
          role: resIdentity.identity.roleName
        };
      }
    }

    // 1. Handle Pre-Spend
    if (targetModule === 'prespend' || preSpendId) {
      const psId = preSpendId || crId;
      const ps = await PreSpendRequest.findByPk(psId);
      if (!ps) {
        return res.status(404).json({ success: false, message: `Pre-Spend Request ${psId} not found` });
      }
      if (tokenCycle && ps.approvalCycle && ps.approvalCycle !== tokenCycle) {
        return res.status(409).json({ success: false, message: 'This action link has expired due to a new review cycle.' });
      }
      const result = await handlePreSpendActionService({
        id: psId,
        action,
        comment: actionComment,
        actor
      });
      const actionText = action === 'approve' ? 'Approved' : 'Rejected';
      return res.json({
        success: true,
        message: `Pre-Spend Request ${result.requestCode || psId} has been ${actionText} successfully.`,
        data: result
      });
    }

    // 2. Handle Travel Desk
    if (targetModule === 'travel' || travelId) {
      const trId = travelId || crId;
      const tr = await TravelRequest.findByPk(trId);
      if (!tr) {
        return res.status(404).json({ success: false, message: `Travel Request ${trId} not found` });
      }
      if (tokenCycle && tr.approvalCycle && tr.approvalCycle !== tokenCycle) {
        return res.status(409).json({ success: false, message: 'This action link has expired due to a new review cycle.' });
      }
      const result = await handleTravelActionService({
        id: trId,
        action,
        comment: actionComment,
        actor
      });
      const actionText = action === 'approve' ? 'Approved' : 'Rejected';
      return res.json({
        success: true,
        message: `Travel Request ${result.requestCode || trId} has been ${actionText} successfully.`,
        data: result
      });
    }

    // 3. Handle Change Request
    const cr = await ChangeRequest.findByPk(crId);
    if (!cr) {
      return res.status(404).json({ success: false, message: `Change Request ${crId} not found` });
    }
    if (tokenCycle && cr.approvalCycle && cr.approvalCycle !== tokenCycle) {
      return res.status(409).json({ success: false, message: 'This action link has expired due to a new review cycle.' });
    }

    if (action === 'implement') {
      if (cr.status === 'Implemented') {
        return res.status(400).json({
          success: false,
          message: `Change Request ${crId} has already been marked as Implemented.`
        });
      }
      if (cr.status !== 'Approved') {
        return res.status(400).json({
          success: false,
          message: `Cannot implement Change Request in "${cr.status}" status (must be Approved).`
        });
      }
    } else {
      if (cr.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: `This Change Request has already been marked as ${cr.status}.`
        });
      }
    }

    const result = await applyWorklistActionService({
      id: crId,
      action,
      rejectionReason: actionComment,
      comment: actionComment,
      actorId: actor?.id || actor?.userKey || null
    });

    const actionText = action === 'approve' ? 'Approved' : action === 'implement' ? 'Implemented' : 'Rejected';

    return res.json({
      success: true,
      message: `Change Request ${crId} has been ${actionText} successfully.`,
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
