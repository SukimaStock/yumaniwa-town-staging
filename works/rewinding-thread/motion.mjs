export const MAX_LENGTH = 200;
const SPEED = 180, TAIL = 48, RATE = SPEED / TAIL;
export class ThreadMotion {
  length = 0;
  held = false;
  grab() { this.held = true; }
  pull(length) { if (this.held && Number.isFinite(length)) this.length = Math.max(0, Math.min(MAX_LENGTH, length)); }
  release() { this.held = false; }
  step(seconds) {
    if (this.held || this.length === 0 || !Number.isFinite(seconds) || seconds <= 0) return;
    let dt = seconds;
    // Constant speed in the long section, with an exactly continuous speed at the tail.
    if (this.length > TAIL) {
      const straight = Math.min(dt, (this.length - TAIL) / SPEED);
      this.length -= straight * SPEED;
      dt -= straight;
    }
    this.length *= Math.exp(-RATE * dt);
    if (this.length < 0.08) this.length = 0;
  }
  get angle() { return this.length / 50 * 180 / Math.PI; }
}
