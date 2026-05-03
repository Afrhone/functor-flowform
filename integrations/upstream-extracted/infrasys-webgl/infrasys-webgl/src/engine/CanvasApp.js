import { Camera } from "./Camera.js";
import { createProgram, resizeCanvasToDisplaySize, mat4Multiply, projectPoint } from "./GLUtils.js";
import { Node } from "../graph/Node.js";
import { Edge } from "../graph/Edge.js";
import { ForceLayout } from "../graph/ForceLayout.js";

const NODE_VS = `#version 300 es
precision highp float;
in vec3 a_position;
in vec3 a_color;
in float a_size;
in float a_selected;
uniform mat4 u_mvp;
uniform float u_dpr;
out vec3 v_color;
out float v_selected;
void main() {
  vec4 p = u_mvp * vec4(a_position, 1.0);
  gl_Position = p;
  float perspectiveScale = clamp(900.0 / max(80.0, p.w), 0.48, 2.3);
  gl_PointSize = a_size * perspectiveScale * u_dpr;
  v_color = a_color;
  v_selected = a_selected;
}`;

const NODE_FS = `#version 300 es
precision highp float;
in vec3 v_color;
in float v_selected;
out vec4 outColor;
void main() {
  vec2 uv = gl_PointCoord.xy * 2.0 - 1.0;
  float r = length(uv);
  float core = smoothstep(1.0, 0.10, r);
  float ring = smoothstep(0.72, 0.68, r) - smoothstep(0.94, 0.90, r);
  float glow = smoothstep(1.0, 0.0, r);
  vec3 c = v_color * (0.75 + core * 1.25) + vec3(0.16,0.22,0.30) * ring;
  c += vec3(1.0,0.95,0.55) * v_selected * ring * 1.6;
  float alpha = max(core, glow * 0.34 + ring * 0.8);
  if (r > 1.0) discard;
  outColor = vec4(c, alpha);
}`;

const LINE_VS = `#version 300 es
precision highp float;
in vec3 a_position;
in vec3 a_color;
uniform mat4 u_mvp;
out vec3 v_color;
void main() {
  gl_Position = u_mvp * vec4(a_position, 1.0);
  v_color = a_color;
}`;

const LINE_FS = `#version 300 es
precision highp float;
in vec3 v_color;
uniform float u_alpha;
out vec4 outColor;
void main() {
  outColor = vec4(v_color, u_alpha);
}`;

export class CanvasApp {
  constructor(canvas, labelCanvas, data) {
    this.canvas = canvas;
    this.labelCanvas = labelCanvas;
    this.ctx = labelCanvas.getContext("2d");
    this.gl = canvas.getContext("webgl2", { antialias: true, alpha: false });
    if (!this.gl) throw new Error("WebGL2 not supported");

    this.data = data;
    this.camera = new Camera();
    this.view = "graph";
    this.paused = false;
    this.showLabels = true;
    this.showOrbits = true;
    this.showDepth = true;

    this.params = {
      isomorphism: 0.74, commutativity: 0.58, inflexion: 0.46,
      weight: 0.86, fields: 0.62, interference: 0.42, noise: 0.20
    };

    this.classes = data.classes;
    this.nodes = data.nodes.map(n => new Node(n, this.classes));
    this.nodesById = new Map(this.nodes.map(n => [n.id, n]));
    this.edges = data.edges.map(e => new Edge(e, this.nodesById));
    this.relations = [...new Set(this.edges.map(e => e.relation))];

    this.layout = new ForceLayout(this.nodes, this.edges);
    this.selected = null;
    this.onSelect = () => {};
    this.onMetrics = () => {};

    this.pointer = { down: false, x: 0, y: 0, mode: "orbit" };
    this.keys = new Set();
    this.lastTime = performance.now();
    this.frameTimes = [];

    this.initGL();
    this.bindEvents();
    this.bindUI();
  }

  initGL() {
    const gl = this.gl;
    this.nodeProgram = createProgram(gl, NODE_VS, NODE_FS);
    this.lineProgram = createProgram(gl, LINE_VS, LINE_FS);

    this.nodeVao = gl.createVertexArray();
    this.nodeBuffer = gl.createBuffer();
    this.lineVao = gl.createVertexArray();
    this.lineBuffer = gl.createBuffer();

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.005, 0.018, 0.035, 1);
  }

  bindEvents() {
    const c = this.canvas;

    window.addEventListener("resize", () => this.resize());
    c.addEventListener("pointerdown", (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointer.down = true;
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this.pointer.mode = e.button === 2 || e.shiftKey ? "pan" : "orbit";
    });
    c.addEventListener("contextmenu", e => e.preventDefault());
    c.addEventListener("pointerup", (e) => {
      this.pointer.down = false;
      const dx = Math.abs(e.clientX - this.pointer.x);
      const dy = Math.abs(e.clientY - this.pointer.y);
      if (dx + dy < 5) this.pick(e.clientX, e.clientY);
    });
    c.addEventListener("pointermove", (e) => {
      if (!this.pointer.down) return;
      const dx = e.clientX - this.pointer.x;
      const dy = e.clientY - this.pointer.y;
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      if (this.pointer.mode === "pan") this.camera.pan(dx, dy);
      else this.camera.orbit(dx * 0.006, dy * 0.006);
    });
    c.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.camera.zoom(e.deltaY * 0.001);
    }, { passive: false });

    window.addEventListener("keydown", (e) => {
      this.keys.add(e.key.toLowerCase());
      if (e.code === "Space") { e.preventDefault(); this.togglePaused(); }
      if (e.key.toLowerCase() === "r") this.resetCamera();
      if (e.key.toLowerCase() === "f") this.layout.running = !this.layout.running;
      if (e.key.toLowerCase() === "l") this.showLabels = !this.showLabels;
      if (["1","2","3","4"].includes(e.key)) {
        const modes = ["graph", "mindmap", "relations", "encapsulation"];
        this.setView(modes[Number(e.key)-1]);
      }
    });
    window.addEventListener("keyup", (e) => this.keys.delete(e.key.toLowerCase()));
  }

  bindUI() {
    const map = [
      ["rule-isomorphism", "isomorphism"],
      ["rule-commutativity", "commutativity"],
      ["rule-inflexion", "inflexion"],
      ["rule-weight", "weight"],
      ["rule-fields", "fields"],
      ["rule-interference", "interference"],
      ["rule-noise", "noise"]
    ];
    for (const [id, key] of map) {
      const el = document.getElementById(id);
      const out = document.getElementById("val-" + key);
      el.addEventListener("input", () => {
        this.params[key] = Number(el.value);
        out.textContent = Number(el.value).toFixed(2);
      });
    }

    document.getElementById("toggle-forces").addEventListener("change", e => this.layout.running = e.target.checked);
    document.getElementById("toggle-labels").addEventListener("change", e => this.showLabels = e.target.checked);
    document.getElementById("toggle-orbits").addEventListener("change", e => this.showOrbits = e.target.checked);
    document.getElementById("toggle-depth").addEventListener("change", e => this.showDepth = e.target.checked);
  }

  setView(view) {
    this.view = view;
    if (view === "mindmap") {
      this.params.isomorphism = Math.max(this.params.isomorphism, 0.90);
      this.params.fields = 0.25;
    } else if (view === "relations") {
      this.params.commutativity = 0.92;
      this.params.interference = 0.70;
    } else if (view === "encapsulation") {
      this.params.inflexion = 0.18;
      this.params.isomorphism = 0.65;
      this.camera.target.y = -160;
    }
  }

  togglePaused() { this.paused = !this.paused; }
  resetCamera() { this.camera.reset(); }

  resize() {
    resizeCanvasToDisplaySize(this.canvas);
    resizeCanvasToDisplaySize(this.labelCanvas);
  }

  start() {
    this.resize();
    requestAnimationFrame((t) => this.frame(t));
  }

  handleKeys(dt) {
    const k = this.keys;
    const speed = dt * 1.6;
    if (k.has("a")) this.camera.orbit(-speed, 0);
    if (k.has("d")) this.camera.orbit(speed, 0);
    if (k.has("q")) this.camera.orbit(0, -speed);
    if (k.has("e")) this.camera.orbit(0, speed);
    if (k.has("w")) this.camera.zoom(-dt * 1.5);
    if (k.has("s")) this.camera.zoom(dt * 1.5);

    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && pads[0];
    if (gp) {
      const ax = gp.axes;
      const dead = v => Math.abs(v) > 0.12 ? v : 0;
      this.camera.orbit(dead(ax[0] || 0) * dt * 2.3, dead(ax[1] || 0) * dt * 1.6);
      this.camera.pan(dead(ax[2] || 0) * dt * 80, dead(ax[3] || 0) * dt * 80);
      const zoom = (gp.buttons[7]?.value || 0) - (gp.buttons[6]?.value || 0);
      this.camera.zoom(-zoom * dt * 1.6);
    }
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.handleKeys(dt);

    if (!this.paused) this.layout.step(dt, this.params, now / 1000);
    this.render(now / 1000, dt);
    requestAnimationFrame((t) => this.frame(t));
  }

  colorForEdge(e) {
    const relationColors = {
      member: [0.62, 1.0, 0.35],
      consensus: [0.45, 0.8, 1.0],
      hosts: [0.28, 0.64, 1.0],
      contains: [0.72, 0.38, 1.0],
      runs: [1.0, 0.60, 0.14],
      routes: [0.15, 0.92, 1.0],
      accesses: [1.0, 0.85, 0.24],
      publishes: [0.18, 0.95, 1.0],
      links: [0.7, 0.9, 1.0],
      joins: [1.0, 0.52, 0.20],
      serves: [1.0, 0.50, 0.85]
    };
    return relationColors[e.relation] || [0.8, 0.85, 0.95];
  }

  buildLineData(t) {
    const arr = [];
    for (const e of this.edges) {
      const c = this.colorForEdge(e);
      const ax = e.source.pos.x, ay = e.source.pos.y, az = e.source.pos.z;
      const bx = e.target.pos.x, by = e.target.pos.y, bz = e.target.pos.z;
      arr.push(ax, ay, az, c[0], c[1], c[2], bx, by, bz, c[0], c[1], c[2]);
    }

    if (this.showDepth) {
      const gridColor = [0.08, 0.28, 0.46];
      for (let i = -700; i <= 700; i += 100) {
        arr.push(-800, -520, i, ...gridColor, 800, -520, i, ...gridColor);
        arr.push(i, -520, -800, ...gridColor, i, -520, 800, ...gridColor);
      }
    }

    if (this.showOrbits) {
      const orbitColor = [0.20, 0.60, 1.0];
      for (let r of [260, 430, 540]) {
        const seg = 96;
        for (let i = 0; i < seg; i++) {
          const a = i / seg * Math.PI * 2;
          const b = (i + 1) / seg * Math.PI * 2;
          const y = -80 + Math.sin(t * 0.3 + r) * 6;
          arr.push(Math.cos(a)*r, y, Math.sin(a)*r*0.55, ...orbitColor);
          arr.push(Math.cos(b)*r, y, Math.sin(b)*r*0.55, ...orbitColor);
        }
      }
    }
    return new Float32Array(arr);
  }

  buildNodeData(t) {
    const arr = [];
    for (const n of this.nodes) {
      let pulse = 1 + Math.sin(t * 2.0 + n.degree) * 0.04;
      if (n === this.selected) pulse *= 1.35;
      arr.push(
        n.pos.x, n.pos.y, n.pos.z,
        n.color[0], n.color[1], n.color[2],
        n.radius * pulse,
        n === this.selected ? 1 : 0
      );
    }
    return new Float32Array(arr);
  }

  render(t, dt) {
    const gl = this.gl;
    this.resize();
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.width;
    const h = this.canvas.height;
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const matrices = this.camera.matrices(w / h);
    const mvp = matrices.mvp;

    gl.useProgram(this.lineProgram);
    gl.bindVertexArray(this.lineVao);
    const lineData = this.buildLineData(t);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, lineData, gl.DYNAMIC_DRAW);
    const lp = this.lineProgram;
    const lPos = gl.getAttribLocation(lp, "a_position");
    const lCol = gl.getAttribLocation(lp, "a_color");
    gl.enableVertexAttribArray(lPos);
    gl.enableVertexAttribArray(lCol);
    gl.vertexAttribPointer(lPos, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(lCol, 3, gl.FLOAT, false, 24, 12);
    gl.uniformMatrix4fv(gl.getUniformLocation(lp, "u_mvp"), false, mvp);
    gl.uniform1f(gl.getUniformLocation(lp, "u_alpha"), 0.45);
    gl.drawArrays(gl.LINES, 0, lineData.length / 6);

    gl.useProgram(this.nodeProgram);
    gl.bindVertexArray(this.nodeVao);
    const nodeData = this.buildNodeData(t);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nodeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, nodeData, gl.DYNAMIC_DRAW);
    const np = this.nodeProgram;
    const nPos = gl.getAttribLocation(np, "a_position");
    const nCol = gl.getAttribLocation(np, "a_color");
    const nSize = gl.getAttribLocation(np, "a_size");
    const nSel = gl.getAttribLocation(np, "a_selected");
    gl.enableVertexAttribArray(nPos);
    gl.enableVertexAttribArray(nCol);
    gl.enableVertexAttribArray(nSize);
    gl.enableVertexAttribArray(nSel);
    gl.vertexAttribPointer(nPos, 3, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(nCol, 3, gl.FLOAT, false, 32, 12);
    gl.vertexAttribPointer(nSize, 1, gl.FLOAT, false, 32, 24);
    gl.vertexAttribPointer(nSel, 1, gl.FLOAT, false, 32, 28);
    gl.uniformMatrix4fv(gl.getUniformLocation(np, "u_mvp"), false, mvp);
    gl.uniform1f(gl.getUniformLocation(np, "u_dpr"), dpr);
    gl.drawArrays(gl.POINTS, 0, this.nodes.length);

    this.drawLabels(mvp, w, h, dpr);

    this.frameTimes.push(dt);
    if (this.frameTimes.length > 40) this.frameTimes.shift();
    const avg = this.frameTimes.reduce((a,b)=>a+b,0) / this.frameTimes.length;
    const fps = Math.round(1 / avg);
    this.onMetrics({
      fps,
      nodes: this.nodes.length,
      edges: this.edges.length,
      relations: this.relations.length,
      selected: this.selected?.label || "none",
      energy: this.layout.energy
    });
  }

  drawLabels(mvp, w, h, dpr) {
    const ctx = this.ctx;
    const cssW = this.labelCanvas.clientWidth;
    const cssH = this.labelCanvas.clientHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    const projected = [];
    for (const n of this.nodes) {
      const p = projectPoint(n.pos, mvp, w, h);
      if (!p) continue;
      const sp = { x: p.x / dpr, y: p.y / dpr, z: p.z, w: p.w };
      n.screen = sp;
      projected.push({ n, p: sp });
    }

    if (!this.showLabels) return;

    projected.sort((a, b) => b.p.w - a.p.w);
    ctx.font = "12px ui-sans-serif, system-ui";
    ctx.textBaseline = "top";

    for (const { n, p } of projected) {
      if (p.x < -80 || p.x > cssW + 80 || p.y < -80 || p.y > cssH + 80) continue;
      const selected = n === this.selected;
      const alpha = Math.max(0.25, Math.min(1, 900 / p.w));
      ctx.globalAlpha = selected ? 1 : alpha;
      ctx.fillStyle = selected ? "rgba(255,244,170,.95)" : "rgba(230,246,255,.86)";
      ctx.shadowColor = `rgba(${Math.floor(n.color[0]*255)},${Math.floor(n.color[1]*255)},${Math.floor(n.color[2]*255)},0.8)`;
      ctx.shadowBlur = selected ? 18 : 8;
      ctx.fillText(n.label, p.x + 12, p.y - 12);
      if (n.ip) {
        ctx.globalAlpha *= 0.72;
        ctx.font = "11px ui-sans-serif, system-ui";
        ctx.fillText(n.ip, p.x + 12, p.y + 4);
        ctx.font = "12px ui-sans-serif, system-ui";
      }
      if (n.roles?.includes("database-leader")) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#ffe76b";
        ctx.fillText("♛", p.x - 7, p.y - 30);
      }
    }

    ctx.globalAlpha = 0.55;
    ctx.shadowBlur = 0;
    ctx.font = "10px ui-sans-serif, system-ui";
    for (const e of this.edges) {
      const a = e.source.screen, b = e.target.screen;
      if (!a || !b) continue;
      const mx = (a.x + b.x) * 0.5;
      const my = (a.y + b.y) * 0.5;
      if (mx < 0 || mx > cssW || my < 0 || my > cssH) continue;
      ctx.fillStyle = "rgba(190,225,255,.62)";
      ctx.fillText(e.relation, mx + 4, my + 2);
    }
  }

  pick(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    let best = null;
    let bestD = 99999;
    for (const n of this.nodes) {
      if (!n.screen) continue;
      const dx = n.screen.x - x;
      const dy = n.screen.y - y;
      const d = Math.hypot(dx, dy);
      if (d < bestD && d < Math.max(18, n.radius * 0.85)) {
        bestD = d;
        best = n;
      }
    }

    this.selected = best;
    this.nodes.forEach(n => n.selected = n === best);
    this.onSelect(best);
  }
}
