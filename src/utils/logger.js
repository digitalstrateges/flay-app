const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.info;

function timestamp() {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
}

const logger = {
  debug: (...args) => { if (currentLevel <= LOG_LEVELS.debug) console.log(`[${timestamp()}] [DEBUG]`, ...args); },
  info: (...args) => { if (currentLevel <= LOG_LEVELS.info) console.log(`[${timestamp()}] [INFO]`, ...args); },
  warn: (...args) => { if (currentLevel <= LOG_LEVELS.warn) console.warn(`[${timestamp()}] [WARN]`, ...args); },
  error: (...args) => { if (currentLevel <= LOG_LEVELS.error) console.error(`[${timestamp()}] [ERROR]`, ...args); },
  audit: (action, userId, details) => {
    console.log(`[AUDIT] [${timestamp()}] ${action} | user=${userId} | ${details}`);
  }
};

module.exports = logger;
