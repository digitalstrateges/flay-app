const express = require('express');
const path = require('path');
const eventBus = require('./event-bus');
const pluginSystem = require('./plugin-system');
const config = require('../config');
const { errorHandler, notFoundHandler } = require('./error-handler');

class AppFactory {
  constructor() {
    this.app = express();
    this._middlewares = [];
    this._routes = [];
    this._booted = false;
  }

  use(fn) { this._middlewares.push(fn); return this; }

  route(path, router) { this._routes.push({ path, router }); return this; }

  plugin(plugin) { pluginSystem.register(plugin); return this; }

  async boot() {
    if (this._booted) return this;
    this._booted = true;

    eventBus.emit('app:booting');

    for (const mw of this._middlewares) {
      if (typeof mw === 'function') this.app.use(mw);
      else if (mw.route && mw.handler) this.app.use(mw.route, mw.handler);
    }

    for (const { path: p, router } of this._routes) {
      this.app.use(p, router);
    }

    this.app.use(notFoundHandler);
    this.app.use(errorHandler);

    eventBus.emit('app:booted');
    return this;
  }

  getApp() { return this.app; }

  static create() {
    return new AppFactory();
  }
}

module.exports = AppFactory;
