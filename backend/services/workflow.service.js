// Deprecated: Workflow feature removed from core database schema.
// Stubs maintained for any legacy route compatibility.

export const getWorkflowsService = async () => {
  return [];
};

export const getWorkflowByIdService = async (id) => {
  return { id, name: 'Default Workflow', steps: 'Change Manager Review → Approved → Implemented' };
};

export const createWorkflowService = async (payload = {}, actorId = null) => {
  return { id: 'wf-default', name: payload.name || 'Default Workflow' };
};
