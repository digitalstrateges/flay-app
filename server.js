const { app, broadcast } = require('./app');
const http = require('http');
const config = require('./config');
const eventBus = require('./src/core/event-bus');
const demoSetup = require('./demo-setup');
const crmDb = require('./database');
const apiV1 = require('./src/api/v1/gateway');

const PORT = process.env.PORT || config.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';
const startTime = Date.now();

process.on('uncaughtException', (err) => {
  console.error(`[FATAL] Uncaught exception: ${err.message}`);
  console.error(err.stack);
  eventBus.emit('app:error', { type: 'uncaughtException', message: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason) => {
  console.error(`[FATAL] Unhandled rejection: ${reason?.message || reason}`);
  eventBus.emit('app:error', { type: 'unhandledRejection', message: reason?.message || reason });
});

// Mount Super App API v1
app.use('/super-api/v1', apiV1);

// Enhanced health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: config.VERSION,
    app: config.APP_NAME,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    uptimeHuman: `${Math.floor((Date.now() - startTime) / 1000)}s`,
    node: process.version,
    platform: process.platform,
    memory: { ...process.memoryUsage(), rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB` },
    modules: Object.keys(config.MODULES).filter(m => config.MODULES[m]),
    superApp: config.SUPER_APP,
    timestamp: new Date().toISOString()
  });
});

const server = http.createServer(app);

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n  ERREUR: Le port ${PORT} est deja utilise.`);
        console.error(`  Arrete le processus: kill -9 $(lsof -t -i:${PORT})\n`);
        process.exit(1);
    }
    console.error('Server error:', err);
    eventBus.emit('app:error', { type: 'server_error', message: err.message });
});

const gracefulShutdown = async (signal) => {
  console.log(`\n  [${signal}] Arret gracieux du serveur...`);
  eventBus.emit('app:shutdown', { signal });
  server.close(() => {
    console.log('  Serveur arrete.');
    if (typeof broadcast === 'function') broadcast('system', { type: 'shutdown' });
    process.exit(0);
  });
  setTimeout(() => {
    console.error('  Arret force.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(PORT, '0.0.0.0', async () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║        FLAY SUPER APP v1.01                      ║');
    console.log('║  DIGITALSTRATEGES - Plateforme tout-en-un        ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Port:   ${PORT}                             ║`);
    console.log(`║  Mode:   ${isProd ? 'PRODUCTION' : 'DEVELOPPEMENT'}                        ║`);
    console.log(`║  Node:   ${process.version}                               ║`);
    console.log(`║  API:    /super-api/v1                             ║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  v1.01 - Super App complete                     ║');
    console.log('║  53 modules • 26 routes API • 40+ themes       ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    const initResults = [];
    const initSteps = [
      { name: 'Event Bus', fn: () => eventBus.emit('app:starting') },
      { name: 'CRM Database', fn: () => crmDb.init() },
      { name: 'Demo account', fn: () => demoSetup.init() },
      { name: 'Super App API', fn: () => apiV1 }
    ];

    for (const step of initSteps) {
      try {
        const start = Date.now();
        await step.fn();
        const ms = Date.now() - start;
        initResults.push({ name: step.name, status: 'OK', ms });
        console.log(`  ${step.name.padEnd(16)} ${ms.toString().padStart(4)}ms`);
      } catch (e) {
        initResults.push({ name: step.name, status: 'Skip', ms: 0 });
        console.log(`  ${step.name.padEnd(16)} Skip (${e.message})`);
      }
    }

    console.log('');
    console.log(`  Server ready ......... OK (${Date.now() - startTime}ms)`);
    console.log(`  Super App API ........ http://localhost:${PORT}/super-api/v1`);
    console.log('');

    eventBus.emit('app:started', { port: PORT, uptime: Date.now() - startTime, initResults });
});
