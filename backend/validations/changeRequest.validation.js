import Joi from 'joi';

export const createChangeRequestSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(2).max(255).required().messages({
      'string.empty': 'Title is required',
      'any.required': 'Title is required'
    }),
    category: Joi.string().trim().allow('', null).optional(),
    subCategory: Joi.string().trim().allow('', null).optional(),
    subcategoryId: Joi.string().trim().allow('', null).optional(),
    startDate: Joi.string().trim().required().messages({
      'string.empty': 'Start Date is required',
      'any.required': 'Start Date is required'
    }),
    endDate: Joi.string().allow('', null).optional(),
    justification: Joi.string().trim().allow('', null).optional(),
    employeeName: Joi.string().trim().allow('', null).optional(),
    employeeEmail: Joi.string().trim().allow('', null).optional(),
    employeeId: Joi.string().trim().allow('', null).optional(),
    location: Joi.string().trim().allow('', null).optional(),
    managerEmail: Joi.string().trim().allow('', null).optional(),
    actionRequired: Joi.string().trim().allow('', null).optional(),
    customFieldValues: Joi.object().unknown(true).optional(),
    isDraft: Joi.boolean().default(false)
  })
};
