import { ControlFrameInput } from "./types";

interface InputState {
  pitchUp: boolean;
  pitchDown: boolean;
  yawLeft: boolean;
  yawRight: boolean;
  altUp: boolean;
  altDown: boolean;
  speedTierDelta: number;
  toggleGlobe: boolean;
  cancelTarget: boolean;
}

const input: InputState = {
  pitchUp: false,
  pitchDown: false,
  yawLeft: false,
  yawRight: false,
  altUp: false,
  altDown: false,
  speedTierDelta: 0,
  toggleGlobe: false,
  cancelTarget: false
};

const KEYMAP: Record<string, keyof InputState | "speedUp" | "speedDown" | "toggleGlobe" | "cancelTarget"> = {
  ArrowUp: "pitchUp",
  ArrowDown: "pitchDown",
  ArrowLeft: "yawLeft",
  ArrowRight: "yawRight",
  R: "altUp",
  r: "altUp",
  F: "altDown",
  f: "altDown",
  "+": "speedUp",
  "=": "speedUp",
  "-": "speedDown",
  "_": "speedDown",
  G: "toggleGlobe",
  g: "toggleGlobe",
  Escape: "cancelTarget"
};

export function initControls() {
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  ensureButtons();
}

export function teardownControls() {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  const overlay = document.getElementById("controls-overlay");
  if (overlay && overlay.parentElement) {
    overlay.parentElement.removeChild(overlay);
  }
}

export function consumeFrameInput(): ControlFrameInput {
  const frame: ControlFrameInput = {
    pitchInput: (input.pitchUp ? 1 : 0) + (input.pitchDown ? -1 : 0),
    yawInput: (input.yawLeft ? -1 : 0) + (input.yawRight ? 1 : 0),
    altitudeDelta: (input.altUp ? 1 : 0) + (input.altDown ? -1 : 0),
    speedTierDelta: input.speedTierDelta,
    toggleGlobe: input.toggleGlobe,
    cancelTarget: input.cancelTarget
  };
  // reset one-shot inputs
  input.speedTierDelta = 0;
  input.toggleGlobe = false;
  input.cancelTarget = false;
  return frame;
}

function onKeyDown(evt: KeyboardEvent) {
  const action = KEYMAP[evt.key];
  if (!action) return;
  if (action === "speedUp") input.speedTierDelta = 1;
  else if (action === "speedDown") input.speedTierDelta = -1;
  else if (action === "toggleGlobe") input.toggleGlobe = true;
  else if (action === "cancelTarget") input.cancelTarget = true;
  else (input as any)[action] = true;
}

function onKeyUp(evt: KeyboardEvent) {
  const action = KEYMAP[evt.key];
  if (!action) return;
  if (action === "speedUp" || action === "speedDown" || action === "toggleGlobe" || action === "cancelTarget") {
    return;
  }
  (input as any)[action] = false;
}

function ensureButtons() {
  const existing = document.getElementById("controls-overlay");
  if (existing) return;
  const overlay = document.createElement("div");
  overlay.id = "controls-overlay";
  overlay.style.position = "absolute";
  overlay.style.bottom = "16px";
  overlay.style.left = "50%";
  overlay.style.transform = "translateX(-50%)";
  overlay.style.display = "grid";
  overlay.style.gridTemplateColumns = "repeat(4, 70px)";
  overlay.style.gap = "8px";
  overlay.style.zIndex = "20";

  const buttons: Array<{ label: string; onPress: () => void; onRelease?: () => void }> = [
    { label: "Pitch ↑", onPress: () => (input.pitchUp = true), onRelease: () => (input.pitchUp = false) },
    { label: "Pitch ↓", onPress: () => (input.pitchDown = true), onRelease: () => (input.pitchDown = false) },
    { label: "Yaw ←", onPress: () => (input.yawLeft = true), onRelease: () => (input.yawLeft = false) },
    { label: "Yaw →", onPress: () => (input.yawRight = true), onRelease: () => (input.yawRight = false) },
    { label: "Alt ↑", onPress: () => (input.altUp = true), onRelease: () => (input.altUp = false) },
    { label: "Alt ↓", onPress: () => (input.altDown = true), onRelease: () => (input.altDown = false) },
    { label: "Speed +", onPress: () => (input.speedTierDelta = 1) },
    { label: "Speed -", onPress: () => (input.speedTierDelta = -1) },
    { label: "Globe", onPress: () => (input.toggleGlobe = true) },
    { label: "Cancel", onPress: () => (input.cancelTarget = true) }
  ];

  buttons.forEach(({ label, onPress, onRelease }) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.style.padding = "10px";
    btn.style.background = "rgba(20,20,28,0.8)";
    btn.style.color = "#9ffcff";
    btn.style.border = "1px solid rgba(159,252,255,0.4)";
    btn.style.borderRadius = "6px";
    btn.style.fontFamily = "monospace";
    btn.onmousedown = btn.ontouchstart = (e) => {
      e.preventDefault();
      onPress();
    };
    btn.onmouseup = btn.ontouchend = (e) => {
      e.preventDefault();
      onRelease?.();
    };
    overlay.appendChild(btn);
  });

  document.body.appendChild(overlay);
}
