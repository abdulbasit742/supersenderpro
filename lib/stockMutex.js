// stockMutex.js – simple in‑memory mutex for stock updates
// Used to prevent concurrent stock modifications.

class Mutex {
  constructor() {
    this._locked = false;
    this._waiters = [];
  }

  lock() {
    if (!this._locked) {
      this._locked = true;
      return Promise.resolve();
    }
    return new Promise(resolve => this._waiters.push(resolve));
  }

  unlock() {
    if (this._waiters.length > 0) {
      const next = this._waiters.shift();
      next();
    } else {
      this._locked = false;
    }
  }
}

module.exports = new Mutex();
