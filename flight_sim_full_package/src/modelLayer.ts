import { CustomLayerInterface, Map, MercatorCoordinate } from "maplibre-gl";
import { Matrix4, PerspectiveCamera, Scene, WebGLRenderer, DirectionalLight, AmbientLight } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FlightState } from "./types";

const FEET_TO_METERS = 0.3048;

export function addAircraftModelLayer(map: Map, getState: () => FlightState) {
  const layer: CustomLayerInterface = {
    id: "aircraft-model",
    type: "custom",
    renderingMode: "3d",
    onAdd(_, gl) {
      const scene = new Scene();
      const camera = new PerspectiveCamera();
      const renderer = new WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true
      });
      renderer.autoClear = false;

      // Lighting for subtle metallic highlights
      const sun = new DirectionalLight(0xb8d4ff, 1.3);
      sun.position.set(5, 10, 7);
      scene.add(sun, new AmbientLight(0x6f8ca8, 0.6));

      const loader = new GLTFLoader();
      loader.load(
        "/models/stealth_bomber.glb",
        (gltf: any) => {
          gltf.scene.scale.set(1, 1, 1);
          scene.add(gltf.scene);
        },
        undefined,
        (err: any) => console.warn("GLB load failed", err)
      );

      (layer as any)._scene = scene;
      (layer as any)._camera = camera;
      (layer as any)._renderer = renderer;
    },
    render(gl, matrix) {
      const scene: Scene = (layer as any)._scene;
      const camera: PerspectiveCamera = (layer as any)._camera;
      const renderer: WebGLRenderer = (layer as any)._renderer;
      const state = getState();

      const merc = MercatorCoordinate.fromLngLat(
        { lng: state.lng, lat: state.lat },
        Math.max(0, state.altitudeFt) * FEET_TO_METERS
      );

      const proj = new Matrix4().fromArray(matrix as unknown as number[]);
      const translation = new Matrix4().makeTranslation(merc.x, merc.y, merc.z);
      const scaleFactor = merc.meterInMercatorCoordinateUnits();
      const altitudeScale = 1 + Math.min(state.altitudeFt / 100_000, 1) * 0.2;
      const scale = new Matrix4().makeScale(scaleFactor * altitudeScale, scaleFactor * altitudeScale, scaleFactor * altitudeScale);

      const rotationZ = new Matrix4().makeRotationZ(state.heading);
      const rotationY = new Matrix4().makeRotationY(state.roll);
      const rotationX = new Matrix4().makeRotationX(state.pitch);

      const world = new Matrix4();
      world.multiplyMatrices(proj, translation);
      world.multiply(scale).multiply(rotationX).multiply(rotationY).multiply(rotationZ);

      camera.projectionMatrix = world;

      renderer.resetState();
      renderer.render(scene, camera);
      map.triggerRepaint();
    }
  };

  if (!map.getLayer(layer.id)) {
    map.addLayer(layer);
  }
}
