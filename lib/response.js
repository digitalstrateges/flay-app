function sendJSON(res, data, status = 200) {
    return res.status(status).json(data);
}

function sendError(res, message, status = 400) {
    return res.status(status).json({ error: message });
}

function send404(res, msg) {
    return res.status(404).json({ error: msg || 'Not found' });
}

function send401(res) {
    return res.status(401).json({ error: 'Unauthorized' });
}

function send403(res, msg) {
    return res.status(403).json({ error: msg || 'Forbidden' });
}

function send500(res, msg) {
    return res.status(500).json({ error: msg || 'Internal server error' });
}

function sendHTML(res, html, status = 200) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(status).send(html);
}

function paginated(res, data, total, page, limit) {
    return res.json({
        data,
        pagination: { total, page, limit, pages: Math.ceil(total / limit) }
    });
}

module.exports = { sendJSON, sendError, send404, send401, send403, send500, sendHTML, paginated };
