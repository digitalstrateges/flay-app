const rateLimits = new Map();

function rateLimit(windowMs, max) {
    return (req, res, next) => {
        const key = req.ip + ':' + (req.path || req.url);
        const now = Date.now();
        if (!rateLimits.has(key)) rateLimits.set(key, []);
        const hits = rateLimits.get(key).filter(t => t > now - windowMs);
        rateLimits.set(key, hits);
        if (hits.length >= max) {
            return res.status(429).json({ error: 'Trop de requetes. Reessayez plus tard.', retryAfter: Math.ceil((hits[0] + windowMs - now) / 1000) });
        }
        hits.push(now);
        next();
    };
}

module.exports = { rateLimit };
