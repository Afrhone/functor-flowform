export class Edge {
  constructor(raw, nodesById) {
    this.source = nodesById.get(raw.source);
    this.target = nodesById.get(raw.target);
    this.relation = raw.relation || "link";
    this.weight = raw.weight ?? 0.5;
    if (!this.source || !this.target) {
      throw new Error(`Missing edge endpoint: ${raw.source} -> ${raw.target}`);
    }
    this.source.degree++;
    this.target.degree++;
  }
}
