// Backend Payload Validation Helpers
export const validateChangeRequest = (req, res, next) => {
  const { title, category } = req.body || {};
  if (req.method === 'POST' && !req.body.isDraft && (!title || !category)) {
    return res.status(400).json({
      success: false,
      message: 'Title and Category are required for Change Request submission'
    });
  }
  next();
};
