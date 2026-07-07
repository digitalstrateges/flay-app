const eventBus = require('./event-bus');

class PluginSystem {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
  }

  register(plugin) {
    if (this.plugins.has(plugin.name)) throw new Error(`Plugin ${plugin.name} already registered`);
    this.plugins.set(plugin.name, plugin);
    if (typeof plugin.onRegister === 'function') plugin.onRegister(this);
    eventBus.emit('plugin:registered', { name: plugin.name, version: plugin.version });
    return this;
  }

  unregister(name) {
    const plugin = this.plugins.get(name);
    if (plugin && typeof plugin.onUnregister === 'function') plugin.onUnregister(this);
    this.plugins.delete(name);
    eventBus.emit('plugin:unregistered', { name });
    return this;
  }

  addHook(point, fn, priority = 10) {
    if (!this.hooks.has(point)) this.hooks.set(point, []);
    this.hooks.get(point).push({ fn, priority });
    this.hooks.get(point).sort((a, b) => a.priority - b.priority);
  }

  async runHook(point, context = {}) {
    const hooks = this.hooks.get(point) || [];
    let result = context;
    for (const { fn } of hooks) {
      result = await fn(result) || result;
    }
    return result;
  }

  getPlugin(name) { return this.plugins.get(name); }
  getPlugins() { return Array.from(this.plugins.values()); }
  hasPlugin(name) { return this.plugins.has(name); }
}

module.exports = new PluginSystem();
