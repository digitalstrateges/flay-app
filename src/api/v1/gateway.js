const express = require('express');
const router = express.Router();
const eventBus = require('../../core/event-bus');
const config = require('../../config');

router.use((req, res, next) => {
  req.apiVersion = 'v1';
  res.setHeader('X-API-Version', '1.01');
  res.setHeader('X-Super-App', 'true');
  next();
});

router.get('/ping', (req, res) => res.json({ pong: true, version: config.VERSION, timestamp: new Date().toISOString() }));

router.get('/status', (req, res) => {
  res.json({
    app: config.APP_NAME,
    version: config.VERSION,
    uptime: process.uptime(),
    node: process.version,
    memory: process.memoryUsage(),
    modules: Object.keys(config.MODULES).filter(m => config.MODULES[m]),
    timestamp: new Date().toISOString()
  });
});

router.get('/events', (req, res) => {
  const history = eventBus.getHistory();
  res.json({ count: history.length, events: history.slice(-50) });
});

module.exports = router;
