export const validate = (schema) => (req, res, next) => {
  const targets = ['body', 'query', 'params'];

  for (const target of targets) {
    if (schema[target]) {
      const { error, value } = schema[target].validate(req[target], {
        abortEarly: false,
        // Reject unexpected keys by default. Schemas that genuinely need a dynamic map
        // (e.g. createChangeRequestSchema's customFieldValues) opt in with their own
        // `.unknown(true)` on that specific sub-object instead of a blanket allowance here.
        stripUnknown: false,
        allowUnknown: false
      });

      if (error) {
        const details = error.details.map((d) => d.message.replace(/['"]/g, ''));
        return res.status(400).json({
          success: false,
          message: `Validation Error: ${details[0]}`,
          errors: details
        });
      }

      req[target] = value;
    }
  }

  next();
};
