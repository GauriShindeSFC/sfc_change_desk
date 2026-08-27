// Backend payload validation for POST /api/dashboard/change-requests
//
// Drafts may be saved with almost nothing filled in; a real submission
// needs at least a title and a category.
export const validateChangeRequest = (req, res, next) => {
  const body = req.body || {};
  const { title, category, isDraft } = body;

  if (!isDraft) {
    const missing = [];
    if (!title || !String(title).trim()) missing.push('title');
    if (!category || !String(category).trim()) missing.push('category');

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s) for submission: ${missing.join(', ')}`
      });
    }
  }

  next();
};
