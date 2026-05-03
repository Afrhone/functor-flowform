export function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) + "\n" + source);
  }
  return shader;
}

export function createProgram(gl, vs, fs) {
  const program = gl.createProgram();
  gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  return program;
}

export function resizeCanvasToDisplaySize(canvas, dpr = window.devicePixelRatio || 1) {
  const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    return true;
  }
  return false;
}

export function mat4Identity() {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}

export function mat4Perspective(fovy, aspect, near, far) {
  const f = 1.0 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f/aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far+near)*nf, -1,
    0, 0, (2*far*near)*nf, 0
  ]);
}

export function mat4LookAt(eye, center, up) {
  let zx = eye.x - center.x, zy = eye.y - center.y, zz = eye.z - center.z;
  let zLen = Math.hypot(zx, zy, zz) || 1;
  zx /= zLen; zy /= zLen; zz /= zLen;

  let xx = up.y*zz - up.z*zy;
  let xy = up.z*zx - up.x*zz;
  let xz = up.x*zy - up.y*zx;
  let xLen = Math.hypot(xx, xy, xz) || 1;
  xx /= xLen; xy /= xLen; xz /= xLen;

  const yx = zy*xz - zz*xy;
  const yy = zz*xx - zx*xz;
  const yz = zx*xy - zy*xx;

  return new Float32Array([
    xx, yx, zx, 0,
    xy, yy, zy, 0,
    xz, yz, zz, 0,
    -(xx*eye.x + xy*eye.y + xz*eye.z),
    -(yx*eye.x + yy*eye.y + yz*eye.z),
    -(zx*eye.x + zy*eye.y + zz*eye.z),
    1
  ]);
}

export function mat4Multiply(a, b) {
  const out = new Float32Array(16);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      out[c*4+r] =
        a[0*4+r] * b[c*4+0] +
        a[1*4+r] * b[c*4+1] +
        a[2*4+r] * b[c*4+2] +
        a[3*4+r] * b[c*4+3];
    }
  }
  return out;
}

export function projectPoint(p, mvp, width, height) {
  const x = p.x, y = p.y, z = p.z;
  const cx = mvp[0]*x + mvp[4]*y + mvp[8]*z + mvp[12];
  const cy = mvp[1]*x + mvp[5]*y + mvp[9]*z + mvp[13];
  const cz = mvp[2]*x + mvp[6]*y + mvp[10]*z + mvp[14];
  const cw = mvp[3]*x + mvp[7]*y + mvp[11]*z + mvp[15];
  if (cw <= 0.001) return null;
  const nx = cx / cw, ny = cy / cw, nz = cz / cw;
  return {
    x: (nx * 0.5 + 0.5) * width,
    y: (-ny * 0.5 + 0.5) * height,
    z: nz,
    w: cw
  };
}
