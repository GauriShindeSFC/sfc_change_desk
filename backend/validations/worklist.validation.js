import Joi from 'joi';

export const worklistActionSchema = {
  body: Joi.object({
    id: Joi.string().required().messages({
      'string.empty': 'Change Request ID is required'
    }),
    action: Joi.string().valid('approve', 'reject', 'implement').required().messages({
      'any.only': 'Action must be one of: approve, reject, implement'
    }),
    rejectionReason: Joi.string().trim().allow('', null).optional(),
    comment: Joi.string().trim().allow('', null).optional()
  })
};
