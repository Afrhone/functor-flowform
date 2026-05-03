export const CLUSTER_DATA = {
  meta: {
    name: "rhiz LXD info system",
    generatedFrom: "lxc cluster list + lxc list",
    coordinateHint: "cluster members / instances / services / networks"
  },

  classes: {
    member:    { label: "Cluster Member", color: [0.55, 1.00, 0.25], radius: 16 },
    leader:    { label: "DB Leader",      color: [0.85, 1.00, 0.20], radius: 23 },
    vm:        { label: "LXD VM",         color: [0.18, 0.62, 1.00], radius: 18 },
    container: { label: "Container",      color: [0.72, 0.38, 1.00], radius: 16 },
    service:   { label: "Service Layer",  color: [1.00, 0.60, 0.14], radius: 18 },
    network:   { label: "Network",        color: [0.14, 0.88, 1.00], radius: 13 },
    stopped:   { label: "Stopped",        color: [1.00, 0.28, 0.34], radius: 13 }
  },

  nodes: [
    { id: "sigmo-rhiz", label: "sigmo-rhiz", type: "leader", ip: "192.168.0.34", url: "https://192.168.0.34:8444", roles: ["database-leader", "database"], status: "ONLINE", weight: 3.8, x: 0, y: 120, z: 0 },
    { id: "ark-rhiz", label: "ark-rhiz", type: "member", ip: "192.168.0.40", url: "https://192.168.0.40:8444", roles: [], status: "ONLINE", weight: 2.4, x: -290, y: 170, z: -40 },
    { id: "factau-rhiz", label: "factau-rhiz", type: "member", ip: "192.168.0.4", url: "https://192.168.0.4:8444", roles: ["database-standby"], status: "ONLINE", weight: 2.2, x: -90, y: 280, z: 60 },
    { id: "rhiz-ueth", label: "rhiz-ueth", type: "member", ip: "192.168.0.2", url: "https://192.168.0.2:8444", roles: ["database"], status: "ONLINE", weight: 2.2, x: 220, y: 210, z: 20 },
    { id: "rhiz-woute", label: "rhiz-woute", type: "member", ip: "192.168.0.33", url: "https://192.168.0.33:8444", roles: ["database-standby"], status: "ONLINE", weight: 2.0, x: 320, y: 20, z: -60 },
    { id: "umowt-rhiz", label: "umowt-rhiz", type: "member", ip: "192.168.0.36", url: "https://192.168.0.36:8444", roles: ["database"], status: "ONLINE", weight: 2.0, x: -180, y: 20, z: 80 },

    { id: "llama-gpu", label: "llama-gpu", type: "container", ip: "192.168.0.125", kind: "CONTAINER", status: "RUNNING", location: "ark-rhiz", weight: 2.8, x: -430, y: -80, z: 100 },
    { id: "niurk-19", label: "niurk-19", type: "vm", ip: "192.168.0.124", kind: "VIRTUAL-MACHINE", status: "RUNNING", location: "sigmo-rhiz", entropy: 18, weight: 3.5, x: -450, y: 80, z: -80 },
    { id: "niurk-21", label: "niurk-21", type: "vm", ip: "192.168.0.21", kind: "VIRTUAL-MACHINE", status: "RUNNING", location: "rhiz-ueth", weight: 2.4, x: 380, y: 150, z: 90 },
    { id: "niurk-42", label: "niurk-42", type: "vm", ip: "192.168.0.42", kind: "VIRTUAL-MACHINE", status: "RUNNING", location: "ark-rhiz", weight: 2.6, x: -430, y: -240, z: -40 },
    { id: "niurk-72", label: "niurk-72", type: "stopped", ip: "", kind: "VIRTUAL-MACHINE", status: "STOPPED", location: "rhiz-woute", weight: 1.2, x: 470, y: -120, z: -120 },
    { id: "project-push", label: "project-push", type: "stopped", ip: "", kind: "CONTAINER", status: "STOPPED", location: "ark-rhiz", weight: 1.1, x: -520, y: -10, z: 160 },

    { id: "docker", label: "Docker", type: "service", status: "SERVICE", weight: 2.9, x: -100, y: -180, z: 30 },
    { id: "swarm", label: "Swarm", type: "service", status: "SERVICE", weight: 2.9, x: -240, y: -260, z: 20 },
    { id: "mcp", label: "MCP", type: "service", status: "SERVICE", weight: 2.7, x: 110, y: -230, z: -20 },
    { id: "api-agents", label: "API agents", type: "service", status: "SERVICE", weight: 2.6, x: 20, y: -350, z: 70 },
    { id: "ollama", label: "Ollama", type: "service", status: "SERVICE", weight: 2.8, x: -130, y: -390, z: -40 },
    { id: "llama", label: "Llama", type: "service", status: "SERVICE", weight: 2.7, x: 190, y: -360, z: 40 },

    { id: "model-net", label: "model-net", type: "network", status: "overlay", weight: 1.9, x: 70, y: -500, z: 160 },
    { id: "mcp-net", label: "mcp-net", type: "network", status: "overlay", weight: 1.7, x: 230, y: -470, z: -120 },
    { id: "cluster-core", label: "cluster-core", type: "network", status: "overlay", weight: 2.1, x: 10, y: -40, z: 250 },

    { id: "br-niurk19", label: "niurk-19 bridge cloud", type: "network", status: "many docker bridges", weight: 2.2, x: -560, y: -140, z: -20 }
  ],

  edges: [
    ["sigmo-rhiz", "ark-rhiz", "member", 0.9],
    ["sigmo-rhiz", "factau-rhiz", "member", 0.8],
    ["sigmo-rhiz", "rhiz-ueth", "member", 0.8],
    ["sigmo-rhiz", "rhiz-woute", "member", 0.7],
    ["sigmo-rhiz", "umowt-rhiz", "member", 0.7],
    ["ark-rhiz", "factau-rhiz", "consensus", 0.35],
    ["factau-rhiz", "rhiz-ueth", "consensus", 0.35],
    ["rhiz-ueth", "rhiz-woute", "consensus", 0.35],
    ["rhiz-woute", "umowt-rhiz", "consensus", 0.35],
    ["umowt-rhiz", "ark-rhiz", "consensus", 0.35],

    ["ark-rhiz", "llama-gpu", "hosts", 1.0],
    ["sigmo-rhiz", "niurk-19", "hosts", 1.0],
    ["rhiz-ueth", "niurk-21", "hosts", 1.0],
    ["ark-rhiz", "niurk-42", "hosts", 1.0],
    ["rhiz-woute", "niurk-72", "hosts", 0.55],
    ["ark-rhiz", "project-push", "hosts", 0.45],

    ["niurk-19", "br-niurk19", "contains", 0.9],
    ["niurk-19", "docker", "runs", 0.9],
    ["niurk-21", "docker", "runs", 0.55],
    ["niurk-42", "docker", "runs", 0.7],
    ["llama-gpu", "docker", "runs", 0.8],
    ["docker", "swarm", "orchestrates", 0.95],
    ["swarm", "mcp", "routes", 0.8],
    ["swarm", "api-agents", "schedules", 0.7],
    ["docker", "ollama", "runs", 0.85],
    ["docker", "llama", "runs", 0.75],
    ["mcp", "api-agents", "tools", 0.75],
    ["api-agents", "ollama", "accesses", 0.95],
    ["api-agents", "llama", "accesses", 0.8],
    ["ollama", "model-net", "publishes", 0.75],
    ["llama", "model-net", "publishes", 0.72],
    ["mcp", "mcp-net", "publishes", 0.72],
    ["cluster-core", "mcp-net", "links", 0.45],
    ["cluster-core", "model-net", "links", 0.45],
    ["sigmo-rhiz", "cluster-core", "routes", 0.8],
    ["ark-rhiz", "cluster-core", "routes", 0.65],
    ["niurk-19", "swarm", "joins", 0.65],
    ["niurk-42", "swarm", "joins", 0.65],
    ["llama-gpu", "ollama", "serves", 0.9],
    ["llama-gpu", "llama", "serves", 0.7]
  ].map(([source, target, relation, weight]) => ({ source, target, relation, weight }))
};
