import { Vec3, clamp } from "../math/Vec3.js";
import { GraphRules } from "../rules/GraphRules.js";

export class ForceLayout {
  constructor(nodes, edges) {
    this.nodes = nodes;
    this.edges = edges;
    this.rules = new GraphRules(nodes, edges);
    this.energy = 0;
    this.running = true;
  }

  step(dt, params, time) {
    if (!this.running) return this.energy;
    dt = Math.min(dt, 0.035);

    for (const n of this.nodes) n.force.set(0, 0, 0);

    const charge = -2200 * (0.35 + (params.weight || 0.8));
    const minD = 22;

    for (let i = 0; i < this.nodes.length; i++) {
      const a = this.nodes[i];
      for (let j = i + 1; j < this.nodes.length; j++) {
        const b = this.nodes[j];
        const d = Vec3.sub(b.pos, a.pos);
        let distSq = Math.max(minD * minD, d.lenSq());
        const dist = Math.sqrt(distSq);
        const typeBoost = a.type === b.type ? 1.25 : 0.88;
        const force = (charge * typeBoost) / distSq;
        const v = d.scale(1 / dist).scale(force);
        a.force.add(v.clone().scale(-1));
        b.force.add(v);
      }
    }

    for (const e of this.edges) {
      const a = e.source, b = e.target;
      const d = Vec3.sub(b.pos, a.pos);
      const dist = Math.max(1, d.len());
      const relationLen = {
        member: 260, consensus: 280, hosts: 210, contains: 130,
        runs: 160, routes: 180, accesses: 150, publishes: 150,
        links: 120, joins: 170, serves: 150, schedules: 170, tools: 140,
        orchestrates: 130
      }[e.relation] || 190;

      const springK = 0.018 * (0.35 + e.weight * (params.weight || 0.8));
      const delta = dist - relationLen;
      const f = d.scale(1 / dist).scale(delta * springK);
      a.force.add(f);
      b.force.add(f.clone().scale(-1));
    }

    for (const n of this.nodes) {
      const center = new Vec3(0, -80, 0);
      n.force.add(Vec3.sub(center, n.pos).scale(0.0008));
      if (n.status === "STOPPED") n.force.y -= 0.08;
      if (n.type === "leader") n.force.add(Vec3.sub(new Vec3(0, 90, 0), n.pos).scale(0.0025));
    }

    this.rules.apply(params, time);

    this.energy = 0;
    const damping = 0.86;
    for (const n of this.nodes) {
      const invMass = 1 / clamp(n.weight, 0.6, 5.0);
      n.vel.add(n.force.scale(dt * 58 * invMass));
      n.vel.scale(damping);
      n.pos.add(n.vel.clone().scale(dt * 58));
      this.energy += n.vel.lenSq();
    }

    return this.energy;
  }
}
