import { Vec3 } from "../math/Vec3.js";

export class GraphRules {
  constructor(nodes, edges) {
    this.nodes = nodes;
    this.edges = edges;
  }

  apply(params, t) {
    this.isomorphism(params.isomorphism || 0, t);
    this.commutativity(params.commutativity || 0, t);
    this.inflexion(params.inflexion || 0, t);
    this.fields(params.fields || 0, t);
    this.interference(params.interference || 0, t);
    this.noise(params.noise || 0, t);
  }

  isomorphism(strength, t) {
    if (strength <= 0) return;
    const rings = new Map([
      ["leader", 110], ["member", 260], ["vm", 430], ["container", 520],
      ["service", 260], ["network", 540], ["stopped", 520]
    ]);

    const groups = new Map();
    for (const n of this.nodes) {
      if (!groups.has(n.type)) groups.set(n.type, []);
      groups.get(n.type).push(n);
    }

    for (const [type, group] of groups) {
      const radius = rings.get(type) || 360;
      const yBias = type === "service" ? -270 : type === "network" ? -390 : type === "member" || type === "leader" ? 120 : -40;
      group.forEach((n, i) => {
        const a = (i / Math.max(1, group.length)) * Math.PI * 2 + Math.sin(t * 0.15 + i) * 0.05;
        const target = new Vec3(Math.cos(a) * radius, yBias + Math.sin(i * 1.7) * 45, Math.sin(a) * radius * 0.55);
        const pull = Vec3.sub(target, n.pos).scale(0.00085 * strength * (1 + n.degree * 0.04));
        n.force.add(pull);
      });
    }
  }

  commutativity(strength) {
    if (strength <= 0) return;
    const byPair = new Map();
    for (const e of this.edges) {
      const key = [e.source.id, e.target.id].sort().join("|");
      if (!byPair.has(key)) byPair.set(key, []);
      byPair.get(key).push(e);
    }

    for (const e of this.edges) {
      const a = e.source, b = e.target;
      if (e.relation === "routes" || e.relation === "accesses" || e.relation === "depends") {
        const mid = Vec3.add(a.pos, b.pos).scale(0.5);
        const centerPullA = Vec3.sub(mid, a.pos).scale(0.00055 * strength);
        const centerPullB = Vec3.sub(mid, b.pos).scale(0.00055 * strength);
        a.force.add(centerPullA);
        b.force.add(centerPullB);
      }
    }
  }

  inflexion(strength, t) {
    if (strength <= 0) return;
    for (const n of this.nodes) {
      const phi = Math.sin(t * 0.7 + n.degree * 0.8 + n.weight);
      const curve = Math.sin((n.pos.x + n.pos.y) * 0.004 + t * 0.4);
      n.force.z += (phi + curve) * strength * 0.06 * (1 + n.weight);
      n.force.y += Math.cos(t * 0.45 + n.pos.z * 0.01) * strength * 0.025;
    }
  }

  fields(strength, t) {
    if (strength <= 0) return;
    for (const n of this.nodes) {
      const r = Math.hypot(n.pos.x, n.pos.z) + 1;
      const tangent = new Vec3(-n.pos.z / r, 0, n.pos.x / r);
      const polarity = n.type === "service" ? -1 : 1;
      n.force.add(tangent.scale(0.038 * strength * polarity));
      n.force.y += Math.sin(t * 0.35 + r * 0.006) * 0.018 * strength;
    }
  }

  interference(strength, t) {
    if (strength <= 0) return;
    for (const e of this.edges) {
      const d = Vec3.sub(e.target.pos, e.source.pos);
      const l = d.len() || 1;
      const wave = Math.sin(l * 0.026 - t * 2.2 + e.weight * 3.1);
      const push = d.normalize().scale(wave * 0.032 * strength * e.weight);
      e.source.force.add(push.clone().scale(-1));
      e.target.force.add(push);
    }
  }

  noise(strength, t) {
    if (strength <= 0) return;
    for (const n of this.nodes) {
      const s = Math.sin((n.pos.x * 12.9898 + n.pos.y * 78.233 + n.pos.z * 37.719 + t * 9.13) * 0.001) * 43758.5453;
      const f = (s - Math.floor(s) - 0.5) * strength;
      n.force.x += f * 0.08;
      n.force.y += Math.sin(s) * strength * 0.055;
      n.force.z += Math.cos(s * 1.7) * strength * 0.055;
    }
  }
}
