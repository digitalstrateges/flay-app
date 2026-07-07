const logger = require('./utils/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || (statusCode >= 500 ? 'SERVER_ERROR' : 'REQUEST_ERROR');
  const message = statusCode >= 500 && process.env.NODE_ENV === 'production'
    ? 'Erreur serveur. Reessayez plus tard.'
    : (err.message || 'Erreur inconnue');

  if (statusCode >= 500) {
    logger.error(`[${code}] ${err.message}`, err.stack);
  } else {
    logger.warn(`[${code}] ${err.message} | ${req.method} ${req.path}`);
  }

  if (req.accepts('html') && !req.path.startsWith('/api/')) {
    return res.status(statusCode).send(renderErrorPage(statusCode, message));
  }

  res.status(statusCode).json({
    error: message,
    code,
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

function renderErrorPage(statusCode, message) {
  const titles = { 400: 'Requete invalide', 401: 'Non authentifie', 403: 'Acces interdit', 404: 'Page non trouvee', 429: 'Trop de requetes', 500: 'Erreur serveur' };
  const title = titles[statusCode] || 'Erreur';
  const icons = { 400: '⚠️', 401: '🔒', 403: '🚫', 404: '🔍', 429: '⏳', 500: '💥' };
  const icon = icons[statusCode] || '❌';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title} | Flay</title><style>
  *{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a1a;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:2rem}
  .card{background:#12121f;border-radius:16px;padding:3rem;text-align:center;max-width:480px;width:100%;border:1px solid #1e293b}
  .icon{font-size:4rem;margin-bottom:1rem}.code{font-size:4rem;font-weight:800;background:linear-gradient(135deg,#818cf8,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;line-height:1}
  h1{font-size:1.25rem;margin:1rem 0 .5rem;color:#f1f5f9}p{color:#64748b;margin-bottom:1.5rem;font-size:.9rem}
  .btn{display:inline-block;padding:.75rem 2rem;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:500;transition:opacity .2s}
  .btn:hover{opacity:.9}</style></head><body><div class="card"><div class="icon">${icon}</div><div class="code">${statusCode}</div><h1>${title}</h1><p>${message}</p><a href="/" class="btn">Retour a l'accueil</a></div></body></html>`;
}

const notFoundHandler = (req, res, next) => {
  next(new AppError(
    req.path.startsWith('/api/') ? 'Route non trouvee' : 'Page non trouvee',
    404,
    'NOT_FOUND'
  ));
};

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { AppError, errorHandler, notFoundHandler, asyncHandler };
