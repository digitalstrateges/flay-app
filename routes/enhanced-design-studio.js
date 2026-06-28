/**
 * Flay Omni - Enhanced Design Studio Routes
 * API pour le studio de creation complet
 */

const express = require('express');
const router = express.Router();
const designStudio = require('../enhanced-design-studio');

// Get all editor data
router.get('/editor-data', (req, res) => {
    res.json(designStudio.getEditorData());
});

// Get templates
router.get('/templates', (req, res) => {
    res.json({ templates: designStudio.templates });
});

// Get single template
router.get('/templates/:id', (req, res) => {
    const template = designStudio.templates[req.params.id];
    if (!template) return res.status(404).json({ error: 'Template introuvable' });
    res.json({ template });
});

// Get components
router.get('/components', (req, res) => {
    res.json({ components: designStudio.components });
});

// Get single component
router.get('/components/:id', (req, res) => {
    const component = designStudio.components[req.params.id];
    if (!component) return res.status(404).json({ error: 'Composant introuvable' });
    res.json({ component });
});

// Get animations
router.get('/animations', (req, res) => {
    res.json({ animations: designStudio.animations });
});

// Get color palettes
router.get('/color-palettes', (req, res) => {
    res.json({ palettes: designStudio.colorPalettes });
});

// Get fonts
router.get('/fonts', (req, res) => {
    res.json({ fonts: designStudio.fonts });
});

// Generate page from template
router.post('/generate-page', (req, res) => {
    const { templateId, customizations } = req.body;
    if (!templateId) return res.status(400).json({ error: 'templateId requis' });
    
    const page = designStudio.generatePage(templateId, customizations || {});
    if (!page) return res.status(404).json({ error: 'Template introuvable' });
    
    // Generate CSS
    const css = designStudio.generateCSS(page);
    
    res.json({ page, css });
});

// Save page design
router.post('/pages', (req, res) => {
    const page = req.body;
    page.id = page.id || `page_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    page.createdAt = new Date().toISOString();
    page.updatedAt = new Date().toISOString();
    
    // In production, save to database
    // db.insert('pages', page);
    
    res.json({ success: true, page });
});

// Get page
router.get('/pages/:id', (req, res) => {
    // In production, fetch from database
    // const page = db.query('pages', { id: req.params.id })[0];
    res.json({ page: null, message: 'Utilisez la base de donnees pour la persistence' });
});

// Update page
router.put('/pages/:id', (req, res) => {
    const updates = req.body;
    updates.updatedAt = new Date().toISOString();
    
    // In production, update database
    // db.update('pages', req.params.id, updates);
    
    res.json({ success: true });
});

// Delete page
router.delete('/pages/:id', (req, res) => {
    // In production, delete from database
    // db.delete('pages', req.params.id);
    
    res.json({ success: true });
});

// Export page as HTML
router.post('/export/html', (req, res) => {
    const { page, includeCSS } = req.body;
    if (!page) return res.status(400).json({ error: 'Page requise' });
    
    const html = designStudio.generateHTML(page);
    const css = includeCSS !== false ? designStudio.generateCSS(page) : '';
    
    const fullHTML = `<!DOCTYPE html>
<html lang="${page.settings.lang || 'fr'}" dir="${page.settings.rtl ? 'rtl' : 'ltr'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.name}</title>
    ${page.settings.seo?.description ? `<meta name="description" content="${page.settings.seo.description}">` : ''}
    ${page.settings.seo?.keywords ? `<meta name="keywords" content="${page.settings.seo.keywords}">` : ''}
    <style>${css}</style>
</head>
<body>
    ${html}
</body></html>`;
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${page.name.replace(/\s+/g, '-')}.html"`);
    res.send(fullHTML);
});

// Generate CSS only
router.post('/export/css', (req, res) => {
    const { page } = req.body;
    if (!page) return res.status(400).json({ error: 'Page requise' });
    
    const css = designStudio.generateCSS(page);
    
    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${page.name.replace(/\s+/g, '-')}.css"`);
    res.send(css);
});

module.exports = router;