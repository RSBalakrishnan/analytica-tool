const Joi = require('joi');

/**
 * Validation Middleware
 * @param {Object} schema - Joi schema object containing params, query, or body keys
 * @returns {Function} Express middleware function
 */
const validate = (schema) => (req, res, next) => {
  const validations = [];

  if (schema.params) {
    validations.push(schema.params.validate(req.params));
  }
  if (schema.query) {
    validations.push(schema.query.validate(req.query));
  }
  if (schema.body) {
    validations.push(schema.body.validate(req.body));
  }

  const errors = validations
    .filter(v => v.error)
    .map(v => v.error.details.map(d => d.message).join(', '));

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation Failed',
      messages: errors
    });
  }

  // Update request objects with validated/sanitized values
  validations.forEach((v, index) => {
    const keys = Object.keys(schema);
    const key = keys[index];
    if (key === 'params') req.params = v.value;
    if (key === 'query') req.query = v.value;
    if (key === 'body') req.body = v.value;
  });

  next();
};

module.exports = validate;
