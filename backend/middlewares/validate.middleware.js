export const validate = (schema) => (req, res, next) => {
  const targets = ['body', 'query', 'params'];

  for (const target of targets) {
    if (schema[target]) {
      const { error, value } = schema[target].validate(req[target], {
        abortEarly: false,
        stripUnknown: false, // Never strip dynamic custom fields
        allowUnknown: true
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
