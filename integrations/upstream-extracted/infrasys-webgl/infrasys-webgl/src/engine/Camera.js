import { Vec3, clamp } from "../math/Vec3.js";
import { mat4LookAt, mat4Perspective, mat4Multiply } from "./GLUtils.js";

export class Camera {
  constructor() {
    this.target = new Vec3(0, -80, 0);
    this.distance = 980;
    this.yaw = -0.35;
    this.pitch = 0.42;
    this.fov = Math.PI / 4.0;
    this.near = 1;
    this.far = 6000;
  }

  reset() {
    this.target.set(0, -80, 0);
    this.distance = 980;
    this.yaw = -0.35;
    this.pitch = 0.42;
  }

  orbit(dx, dy) {
    this.yaw += dx;
    this.pitch = clamp(this.pitch + dy, -1.35, 1.35);
  }

  zoom(delta) {
    this.distance = clamp(this.distance * Math.exp(delta), 260, 2400);
  }

  pan(dx, dy) {
    const scale = this.distance / 850;
    const right = this.getRight();
    const up = this.getUp();
    this.target.add(right.scale(-dx * scale)).add(up.scale(dy * scale));
  }

  getEye() {
    const cp = Math.cos(this.pitch);
    return new Vec3(
      this.target.x + this.distance * Math.sin(this.yaw) * cp,
      this.target.y + this.distance * Math.sin(this.pitch),
      this.target.z + this.distance * Math.cos(this.yaw) * cp
    );
  }

  getRight() {
    return new Vec3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
  }

  getUp() {
    return new Vec3(0, 1, 0);
  }

  matrices(aspect) {
    const eye = this.getEye();
    const view = mat4LookAt(eye, this.target, new Vec3(0, 1, 0));
    const proj = mat4Perspective(this.fov, aspect, this.near, this.far);
    return { eye, view, proj, mvp: mat4Multiply(proj, view) };
  }
}
