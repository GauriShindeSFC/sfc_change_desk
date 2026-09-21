import Joi from 'joi';

export const loginSchema = {
  body: Joi.object({
    email: Joi.string().email().trim().required().messages({
      'string.empty': 'Email is required',
      'string.email': 'Please enter a valid email address'
    }),
    password: Joi.string().optional().allow('', null)
  })
};

