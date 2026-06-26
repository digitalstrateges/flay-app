/**
 * Flay v14.0 - Standardized Responses
 * API response helpers with consistent format
 */

class Response {
    static success(res, data = null, message = null, status = 200) {
        const response = { success: true };
        if (message) response.message = message;
        if (data !== null) response.data = data;
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(response));
    }

    static created(res, data = null, message = 'Cree avec succes') {
        this.success(res, data, message, 201);
    }

    static noContent(res) {
        res.writeHead(204);
        res.end();
    }

    static error(res, message = 'Erreur interne', status = 500, details = null) {
        const response = { success: false, error: message };
        if (details) response.details = details;
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(response));
    }

    static badRequest(res, message = 'Requete invalide', details = null) {
        this.error(res, message, 400, details);
    }

    static unauthorized(res, message = 'Non autorise') {
        this.error(res, message, 401);
    }

    static forbidden(res, message = 'Acces interdit') {
        this.error(res, message, 403);
    }

    static notFound(res, message = 'Non trouve') {
        this.error(res, message, 404);
    }

    static conflict(res, message = 'Conflit') {
        this.error(res, message, 409);
    }

    static rateLimited(res, retryAfter = 60) {
        res.writeHead(429, {
            'Content-Type': 'application/json',
            'Retry-After': retryAfter
        });
        res.end(JSON.stringify({
            success: false,
            error: 'Trop de requetes',
            retryAfter
        }));
    }

    static paginated(res, data, total, page, perPage) {
        this.success(res, {
            items: data,
            pagination: {
                total,
                page,
                perPage,
                totalPages: Math.ceil(total / perPage),
                hasNext: page * perPage < total,
                hasPrev: page > 1
            }
        });
    }

    static stream(res, data) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    }

    static html(res, html, status = 200) {
        res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
    }

    static xml(res, xml) {
        res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
        res.end(xml);
    }

    static file(res, buffer, filename, mimeType) {
        res.writeHead(200, {
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': buffer.length
        });
        res.end(buffer);
    }
}

module.exports = Response;
