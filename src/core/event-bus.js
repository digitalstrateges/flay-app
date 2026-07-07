class EventBus {
  constructor() {
    this.listeners = new Map();
    this.history = [];
    this.maxHistory = 1000;
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  once(event, fn) {
    const wrapper = (...args) => { fn(...args); this.off(event, wrapper); };
    return this.on(event, wrapper);
  }

  off(event, fn) {
    this.listeners.get(event)?.delete(fn);
  }

  emit(event, data) {
    const entry = { event, data, timestamp: new Date().toISOString() };
    this.history.push(entry);
    if (this.history.length > this.maxHistory) this.history.shift();
    const fns = this.listeners.get(event);
    if (fns) for (const fn of fns) {
      try { fn(data, event); } catch (e) { console.error(`[EventBus] Error in ${event}:`, e); }
    }
  }

  emitAsync(event, data) {
    return Promise.all(Array.from(this.listeners.get(event) || []).map(fn => {
      try { return Promise.resolve(fn(data, event)); } catch (e) { return Promise.reject(e); }
    }));
  }

  getHistory(event) {
    return event ? this.history.filter(h => h.event === event) : this.history;
  }

  clear() {
    this.listeners.clear();
    this.history = [];
  }
}

module.exports = new EventBus();
