export class GameAudio {
  start() {
    if (this.ac) { this.ac.resume(); return; }
    try {
      const ac = this.ac = new AudioContext(), m = this.master = ac.createGain(); m.gain.value = 0.9; m.connect(ac.destination);
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; f.connect(m);
      for (const [type, fr, g] of [['sawtooth', 120, 0.025], ['sine', 60, 0.05], ['square', 240, 0.006]]) {
        const o = ac.createOscillator(), gg = ac.createGain(); o.type = type; o.frequency.value = fr; gg.gain.value = g; o.connect(gg).connect(f); o.start();
      }
      this.beatT = 0; this.nbuf = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate);
      const d = this.nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    } catch { /* audio tidak tersedia */ }
  }
  tone(freq, dur = 0.25, vol = 0.2, type = 'sine', slide = 0) {
    if (!this.ac) return; const ac = this.ac, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, ac.currentTime); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), ac.currentTime + dur);
    g.gain.setValueAtTime(vol, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g).connect(this.master); o.start(); o.stop(ac.currentTime + dur);
  }
  step(sprint) {
    if (!this.ac) return; const s = this.ac.createBufferSource(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
    s.buffer = this.nbuf; f.type = 'lowpass'; f.frequency.value = 300; g.gain.value = sprint ? 0.25 : 0.12; s.connect(f).connect(g).connect(this.master); s.start();
  }
  chime() { this.tone(660, 0.3, 0.15); setTimeout(() => this.tone(990, 0.4, 0.15), 120); }
  beat(fear, dt) {
    if (!this.ac || fear < 0.05) return;
    this.beatT -= dt; if (this.beatT > 0) return;
    this.beatT = 1.1 - 0.7 * fear; this.tone(70, 0.18, 0.35 * fear + 0.05, 'sine', -30); setTimeout(() => this.tone(60, 0.18, 0.25 * fear, 'sine', -25), 140);
  }
}
