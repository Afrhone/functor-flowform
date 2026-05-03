import { CLUSTER_DATA } from "./data/clusterData.js";
import { CanvasApp } from "./engine/CanvasApp.js";
import { HUD } from "./ui/HUD.js";

const glCanvas = document.getElementById("gl-canvas");
const labelCanvas = document.getElementById("label-canvas");

const app = new CanvasApp(glCanvas, labelCanvas, CLUSTER_DATA);
const hud = new HUD(app, CLUSTER_DATA);

app.onSelect = (node) => hud.showDetails(node);
app.onMetrics = (metrics) => hud.updateMetrics(metrics);

document.querySelectorAll(".tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    app.setView(btn.dataset.view);
  });
});

document.getElementById("pause-btn").addEventListener("click", () => app.togglePaused());
document.getElementById("reset-btn").addEventListener("click", () => app.resetCamera());

app.start();
