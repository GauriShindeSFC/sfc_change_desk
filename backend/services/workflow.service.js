import { Workflow } from '../models/index.js';
import { addAuditLog } from './auditLog.service.js';

const nextWorkflowId = async () => {
  const ids = (await Workflow.findAll({ attributes: ['id'], raw: true })).map(
    (r) => parseInt(String(r.id).replace(/\D/g, ''), 10) || 0
  );
  const maxId = ids.length ? Math.max(...ids) : 3;
  return `wf-${maxId + 1}`;
};

export const getWorkflowsService = async () => {
  return Workflow.findAll({ order: [['id', 'ASC']] });
};

export const getWorkflowByIdService = async (id) => {
  const wf = await Workflow.findByPk(id);
  if (!wf) {
    const err = new Error(`Workflow ${id} not found`);
    err.statusCode = 404;
    throw err;
  }
  return wf.get({ plain: true });
};

export const createWorkflowService = async (payload = {}, actorId = null) => {
  const id = await nextWorkflowId();
  const name = payload.name || 'New Approval Workflow';
  const steps = payload.steps || 'Draft → Change Manager Review → Approved → Implemented';

  const wf = await Workflow.create({
    id,
    name,
    steps
  });

  await addAuditLog({
    actorId: actorId || payload.actorId || null,
    action: 'Workflow Created',
    ref: id,
    detail: `Added new approval workflow ${id} (${name}).`
  });

  return wf.get({ plain: true });
};
