/** Heights and speeds are metres, independent of drawing scale. */
export class WalkMotion {
  height = 0;
  velocity = 0;
  flying = false;
  private lastTap = -Infinity;

  space(time: number, repeat = false) {
    if (repeat) return;
    if (time - this.lastTap <= 300) {
      this.flying = !this.flying;
      this.velocity = 0;
      this.lastTap = -Infinity;
    } else {
      this.lastTap = time;
      if (!this.flying && this.height === 0) this.velocity = 4.2;
    }
  }

  clearTap() { this.lastTap = -Infinity; }

  limitHeadroom(maxHeight: number) {
    if (!this.flying && this.height > maxHeight) {
      this.height = Math.max(0, maxHeight);
      this.velocity = Math.min(0, this.velocity);
    }
  }

  step(dt: number, up: boolean, down: boolean) {
    dt = Math.max(0, Math.min(dt, .035));
    if (this.flying) {
      this.height = Math.max(0, Math.min(30, this.height + (Number(up) - Number(down)) * 2.5 * dt));
    } else {
      this.height += this.velocity * dt - .5 * 9.81 * dt * dt;
      this.velocity -= 9.81 * dt;
      if (this.height <= 0) { this.height = 0; this.velocity = 0; }
    }
  }
}
