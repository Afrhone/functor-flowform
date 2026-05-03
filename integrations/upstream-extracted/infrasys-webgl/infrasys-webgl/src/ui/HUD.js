export class HUD {
  constructor(app, data) {
    this.app = app;
    this.data = data;
    this.legendEl = document.getElementById("legend");
    this.renderLegend();
  }

  renderLegend() {
    const counts = {};
    for (const n of this.data.nodes) counts[n.type] = (counts[n.type] || 0) + 1;

    this.legendEl.innerHTML = Object.entries(this.data.classes).map(([key, cls]) => {
      const rgb = cls.color.map(v => Math.floor(v * 255)).join(",");
      return `
        <div class="legend-row">
          <div class="legend-left">
            <span class="dot" style="color: rgb(${rgb}); background: rgb(${rgb});"></span>
            <span>${cls.label}</span>
          </div>
          <span class="badge">${counts[key] || 0}</span>
        </div>
      `;
    }).join("");
  }

  updateMetrics(m) {
    document.getElementById("fps-pill").textContent = `${m.fps} FPS`;
    document.getElementById("node-count").textContent = m.nodes;
    document.getElementById("edge-count").textContent = m.edges;
    document.getElementById("relation-count").textContent = m.relations;
    document.getElementById("selected-node").textContent = m.selected;
    document.getElementById("energy-label").textContent = Math.round(m.energy);
  }

  showDetails(node) {
    const title = document.getElementById("details-title");
    const body = document.getElementById("details-body");
    if (!node) {
      title.textContent = "No node selected";
      body.textContent = "Click a node to inspect topology, degree, class, role and edges.";
      return;
    }

    const edges = this.app.edges.filter(e => e.source === node || e.target === node);
    const lines = [
      `id: ${node.id}`,
      `class: ${node.type}`,
      node.ip ? `ip: ${node.ip}` : null,
      node.url ? `url: ${node.url}` : null,
      node.kind ? `kind: ${node.kind}` : null,
      node.status ? `status: ${node.status}` : null,
      node.location ? `location: ${node.location}` : null,
      node.roles?.length ? `roles: ${node.roles.join(", ")}` : null,
      `degree: ${node.degree}`,
      `weight: ${node.weight}`,
      "",
      "relations:",
      ...edges.map(e => {
        const other = e.source === node ? e.target : e.source;
        const arrow = e.source === node ? "→" : "←";
        return `  ${arrow} ${other.label}  [${e.relation}, w=${e.weight}]`;
      })
    ].filter(Boolean);

    title.textContent = node.label;
    body.textContent = lines.join("\n");
  }
}
