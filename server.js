const { app, broadcast } = require('./app');
const http = require('http');
const config = require('./config');
const demoSetup = require('./demo-setup');
const crmDb = require('./database');

const PORT = process.env.PORT || config.PORT || 4000;

const server = http.createServer(app);

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n  ERREUR: Le port ${PORT} est deja utilise.`);
        console.error(`  Arrete le processus: kill -9 $(lsof -t -i:${PORT})\n`);
        process.exit(1);
    }
    console.error('Server error:', err);
});

server.listen(PORT, '0.0.0.0', async () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║              FLAY ULTIMATE v19.0                 ║');
    console.log('║         DIGITALSTRATEGES Business                ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log(`║  Serveur:  http://localhost:${PORT}                  ║`);
    console.log(`║  WhatsApp: +225 07 59 73 19 90                  ║`);
    console.log(`║  Wave:     DIGITALSTRATEGE BUSINESS              ║`);
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  V19 - Mobile UX, Bottom Nav, Cmd+K, FAB        ║');
    console.log('║  Theme Picker, Page Transitions, Haptic         ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');
    
    try {
        await crmDb.init();
        console.log('  CRM Database ........ Init OK');
    } catch (e) {
        console.log('  CRM Database ........ Skipped (' + e.message + ')');
    }
    
    try {
        await demoSetup.init();
    } catch (e) {
        console.log('  Demo account ........ Skipped (' + e.message + ')');
    }
    
    console.log('  Server ready ......... OK');
});
