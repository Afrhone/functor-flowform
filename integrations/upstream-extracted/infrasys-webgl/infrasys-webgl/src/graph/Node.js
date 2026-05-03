import { Vec3 } from "../math/Vec3.js";

export class Node {
  constructor(raw, classes) {
    this.id = raw.id;
    this.label = raw.label || raw.id;
    this.type = raw.type || "member";
    this.ip = raw.ip || "";
    this.url = raw.url || "";
    this.roles = raw.roles || [];
    this.status = raw.status || "";
    this.kind = raw.kind || "";
    this.location = raw.location || "";
    this.entropy = raw.entropy || 0;
    this.weight = raw.weight || 1;
    this.radius = (classes[this.type]?.radius || 14) * Math.sqrt(this.weight);
    this.color = classes[this.type]?.color || [0.8, 0.8, 0.8];

    this.pos = new Vec3(raw.x || 0, raw.y || 0, raw.z || 0);
    this.vel = new Vec3();
    this.force = new Vec3();

    this.degree = 0;
    this.fixed = false;
    this.selected = false;
    this.screen = null;
  }
}
