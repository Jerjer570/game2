export class InventorySystem {
  constructor() { this.items = {}; }
  add(id, n = 1) { this.items[id] = (this.items[id] || 0) + n; }
  count(id) { return this.items[id] || 0; }
  toJSON() { return { ...this.items }; }
  load(o) { this.items = { ...(o || {}) }; }
}
