declare module "three" {
  export class Matrix4 {
    constructor(...args: any[]);
    fromArray(arr: number[]): Matrix4;
    makeTranslation(x: number, y: number, z: number): Matrix4;
    makeScale(x: number, y: number, z: number): Matrix4;
    makeRotationX(x: number): Matrix4;
    makeRotationY(y: number): Matrix4;
    makeRotationZ(z: number): Matrix4;
    multiplyMatrices(a: Matrix4, b: Matrix4): Matrix4;
    multiply(m: Matrix4): Matrix4;
  }
  export class PerspectiveCamera {
    projectionMatrix: Matrix4;
  }
  export class Scene {
    add(...objects: any[]): void;
  }
  export class WebGLRenderer {
    constructor(opts?: any);
    autoClear: boolean;
    resetState(): void;
    render(scene: Scene, camera: PerspectiveCamera): void;
  }
  export class DirectionalLight {
    constructor(color?: any, intensity?: number);
    position: { set: (x: number, y: number, z: number) => void };
  }
  export class AmbientLight {
    constructor(color?: any, intensity?: number);
  }
  export class Loader {
    constructor(manager?: any);
  }
}

declare module "three/examples/jsm/loaders/GLTFLoader.js" {
  import { Loader } from "three";
  export class GLTFLoader extends Loader {
    constructor(manager?: any);
    load(url: string, onLoad: (gltf: { scene: any }) => void, onProgress?: (event: any) => void, onError?: (err: any) => void): void;
  }
}
