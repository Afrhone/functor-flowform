export class Vec3 {
  constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vec3(this.x, this.y, this.z); }
  add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
  sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
  scale(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  lenSq() { return this.x*this.x + this.y*this.y + this.z*this.z; }
  len() { return Math.sqrt(this.lenSq()); }
  normalize() { const l = this.len() || 1; return this.scale(1/l); }
  static sub(a, b) { return new Vec3(a.x-b.x, a.y-b.y, a.z-b.z); }
  static add(a, b) { return new Vec3(a.x+b.x, a.y+b.y, a.z+b.z); }
  static dot(a, b) { return a.x*b.x + a.y*b.y + a.z*b.z; }
  static cross(a, b) { return new Vec3(a.y*b.z-a.z*b.y, a.z*b.x-a.x*b.z, a.x*b.y-a.y*b.x); }
}

export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function lerp(a, b, t) { return a + (b-a) * t; }
export function smoothstep(a, b, x) {
  const t = clamp((x-a)/(b-a), 0, 1);
  return t*t*(3-2*t);
}
