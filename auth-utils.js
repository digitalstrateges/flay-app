const security = require('./security');

module.exports = {
  genId: () => security.genId(),
  hashPassword: (pw) => security.hashPasswordCompat(pw),
  verifyPassword: (pw, stored, salt) => security.verifyPasswordCompat(pw, stored, salt),
  signToken: (payload, _secret, expiresIn) => security.generateToken(payload, expiresIn || 3600).token,
  verifyToken: (token) => security.verifyToken(token),
  generateTokens: (userId) => security.generateTokens(userId),
  generateToken: (payload, expiresIn) => {
    const exp = (typeof expiresIn === 'string' && expiresIn.endsWith('h'))
      ? parseInt(expiresIn) * 3600
      : parseInt(expiresIn) * 86400;
    return security.generateToken(payload, exp || 3600).token;
  },
  generateQRCode: (text) => security.generateQRCode(text),
  generateShareLink: (u, b) => security.generateShareLink(u, b),
  generateInvoiceId: () => security.generateInvoiceId(),
  slugify: (t) => security.slugify(t),
  validateEmail: (e) => security.validateEmail(e),
  sanitizeHtml: (s) => security.sanitize(s)
};
