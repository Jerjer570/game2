export class SaveSystem {
  constructor(key) { this.key = key; }
  save(data) { try { localStorage.setItem(this.key, JSON.stringify(data)); } catch { /* private mode */ } }
  load() { try { return JSON.parse(localStorage.getItem(this.key)); } catch { return null; } }
  clear() { try { localStorage.removeItem(this.key); } catch {} }
}
