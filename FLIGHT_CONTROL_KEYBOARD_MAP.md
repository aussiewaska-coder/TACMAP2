# Flight Control Center - Keyboard Shortcuts Reference

## ⌨️ Complete Keyboard Map

### Mode Selection (Always Available)
```
┌─────────────────────────────────┐
│ MODE SELECTION KEYS             │
├─────────────────────────────────┤
│  [1]  →  Standard Navigation    │
│  [2]  →  Auto-Orbit             │
│  [3]  →  Flight Mode            │
│  [4]  →  Random Path            │
│  [5]  →  Standard Navigation    │
└─────────────────────────────────┘
```

### Flight Mode (Press 3)
```
┌──────────────────────────────────────┐
│ FLIGHT MODE CONTROLS                 │
├──────────────────────────────────────┤
│  [W] or [↑]  →  Climb (increase altitude)   │
│  [S] or [↓]  →  Descend (decrease altitude) │
│  [A] or [←]  →  Turn Left (heading -0.5°)   │
│  [D] or [→]  →  Turn Right (heading +0.5°)  │
│                                              │
│  HOLD KEY: Continuous control                │
│  RELEASE:  Stop movement                    │
│                                              │
│  Pitch Presets:                             │
│    [6] → 15°  [7] → 30°  [8] → 45°          │
│    [9] → 60°  [`] → 0°                      │
│                                              │
│  Quick Views:                               │
│    [5] → Toggle 5x magnification             │
│    [0] → Toggle 10x magnification            │
└──────────────────────────────────────┘
```

### Standard Navigation (Press 5 or 1)
```
┌────────────────────────────────────┐
│ STANDARD NAVIGATION CONTROLS       │
├────────────────────────────────────┤
│  [↑]  →  Pan North                │
│  [↓]  →  Pan South                │
│  [←]  →  Pan West                 │
│  [→]  →  Pan East                 │
│                                    │
│  Pitch Presets:                    │
│    [`] → 0°   [6] → 15°   [7] → 30° │
│    [8] → 45°  [9] → 60°            │
│                                    │
│  Quick Views:                      │
│    [5] → Toggle 5x magnification   │
│    [0] → Toggle 10x magnification  │
└────────────────────────────────────┘
```

### Global Shortcuts (Any Mode)
```
┌─────────────────────────────────┐
│ GLOBAL CONTROLS                 │
├─────────────────────────────────┤
│  [+] or [=]  →  Zoom In          │
│  [-]         →  Zoom Out         │
│  [R]         →  Reset Bearing    │
│                                  │
│  [?]         →  Toggle Help      │
│  [ESC]       →  Close Panels     │
└─────────────────────────────────┘
```

### Mouse/Trackpad Controls
```
┌──────────────────────────────────────┐
│ MAP INTERACTION                      │
├──────────────────────────────────────┤
│  [CMD/CTRL] + Click  →  Set Target   │
│                                      │
│  In Orbit Mode:                      │
│    Double-Click      →  Fly & Orbit  │
└──────────────────────────────────────┘
```

---

## 🎮 Common Workflows

### Workflow 1: Quick 5x Zoom
```
[5]  → 5x magnification toggle
[5]  → Return to normal zoom
```

### Workflow 2: Navigate & Look Around
```
[5]     → Switch to standard nav
[↑↓←→] → Pan around
[R]     → Reset bearing north
[8]     → Set 45° pitch
[+]     → Zoom in for detail
```

### Workflow 3: Fly to Target
```
[3]              → Switch to flight mode
[CMD/CTRL+Click] → Set destination (amber marker)
Hold [W]         → Climb to altitude
Press [A]/[D]    → Adjust heading
                   (aircraft auto-transitions to orbit)
```

### Workflow 4: Autonomous Exploration
```
[4]              → Random path mode
                   (watch aircraft explore autonomously)
[4]              → Exit random mode
```

### Workflow 5: Save & Revisit Location
```
[3]              → Flight mode, fly somewhere
                   (watch cyan flight path)
Click "Save"     → Save current location
...              → Continue flying elsewhere
Click "Fly"      → Return to saved spot (3s transition)
```

---

## 🔍 Key Details

### Pitch Presets Reference
| Key | Pitch | Use Case |
|-----|-------|----------|
| ` | 0° | Looking down (boring) |
| 6 | 15° | Slight downward tilt |
| 7 | 30° | Normal view |
| 8 | 45° | Good tactical view |
| 9 | 60° | Banking/action angle |

### Magnification Reference
| Key | Effect | Visual Change |
|-----|--------|---------------|
| 5 | Toggle 5x | Amber highlight + 2.3x zoom |
| 0 | Toggle 10x | Red highlight + 3.3x zoom |
| +/- | Pan zoom | Smooth increment |

### Warning Thresholds
| Zoom Level | Altitude | Alert Type | Color |
|-----------|----------|-----------|-------|
| < 5 | < 5,000 ft | DANGER | Red |
| 5-6 | 5-6,000 ft | WARNING | Yellow |
| 18-20 | 18-20,000 ft | WARNING | Yellow |
| > 20 | > 20,000 ft | DANGER | Red |

---

## 💡 Tips & Tricks

### Smooth Flight Path
- Use **held keys** (press and hold) for smooth continuous motion
- Release keys to stop instantly
- Speed is consistent regardless of frame rate

### Quick View Workflow
- Press `5` for 5x zoom-in on details
- Keep map context with quick view
- Press `5` again to return to normal zoom

### Pitch Control
- `0°` shows horizon (flat terrain view)
- `45-60°` best for tactical planning
- `80°` straight down (bird's eye view)

### Orbit Navigation
- Set target with **Cmd/Ctrl+Click**
- Watch cyan crosshair marker
- Double-click to fly to new location
- Auto-transitions to orbit at destination

### Bookmark Best Practices
- Name bookmarks clearly (e.g., "Command Center")
- Save strategic locations you visit often
- Bookmarks persist across page reloads
- Edit names by clicking pencil icon

### Flight Path Insights
- Path only visible during active flight
- Clears when switching to standard navigation
- Useful for reviewing flight trajectory
- Cyan (old) → Amber (current position)

---

## ⚠️ Important Notes

1. **Keyboard Focus**: Shortcuts only work when map has focus
   - Click on map to activate focus
   - Typing in inputs disables shortcuts (by design)

2. **Mode Exclusivity**: Only one mode active at a time
   - Switching modes stops previous mode
   - Mode transitions are smooth (3s animation)

3. **Modifiers**: Cmd/Ctrl+Click for targeting
   - Left click alone pans map
   - Right click shows context menu
   - Cmd/Ctrl+Click sets target

4. **Flight Modes**: WASD vs Arrows
   - Flight mode accepts BOTH WASD and arrows
   - Standard nav only accepts arrows
   - Prevents conflicting inputs

---

## 🎯 Quick Reference Card

**Print this for your desk:**

```
╔═══════════════════════════════════════════════╗
║     FLIGHT CONTROL KEYBOARD SHORTCUTS         ║
╠═══════════════════════════════════════════════╣
║  MODES:  [1] Nav  [2] Orbit  [3] Flight      ║
║           [4] Random  [5] Nav                 ║
║                                               ║
║  FLIGHT: [W/↑] Climb  [S/↓] Descend           ║
║          [A/←] Left   [D/→] Right             ║
║          [6-9] Pitch  [5/0] Quick Views       ║
║                                               ║
║  GLOBAL: [+/-] Zoom  [R] Reset  [?] Help     ║
║                                               ║
║  MOUSE:  [CMD+Click] Set Target               ║
║          [Double-Click] Fly to (Orbit mode)   ║
╚═══════════════════════════════════════════════╝
```

---

## 🐛 Troubleshooting

**Q: Keyboard shortcuts not working?**
- A: Click on map first to give it focus
- A: Check browser console for JS errors
- A: Try refreshing page (Cmd+R / Ctrl+R)

**Q: Flight feels slow/fast?**
- A: Speed is constant (0.0005 units/frame)
- A: Zoom affects perception of speed
- A: Hold keys longer for more distance

**Q: Pitch presets not changing?**
- A: Ensure you're in a flight mode or standard nav
- A: Check that pitch buttons are responsive
- A: Try clicking on key (not keyboard)

**Q: Bookmarks not saving?**
- A: Check browser allows localStorage
- A: Clear browser cache if using old version
- A: Try saving same location with new name

**Q: Flight path not showing?**
- A: Only visible in flight modes (not standard nav)
- A: Try switching to different mode
- A: Path appears after 4 seconds (2 samples)

---

## 📱 Mobile/Tablet Usage

**Keyboard shortcuts not available on mobile** (no physical keyboard)

Use **on-screen buttons instead:**
- Mode icons: Click 5-icon grid
- Direction: Click D-pad or use swipe
- Altitude: Click +/- buttons
- Bookmarks: Tap "Save" and "Fly" buttons
- Pitch: Click preset buttons

**Touch-friendly design:**
- All buttons are 44px+ (Apple HIG standard)
- Large touch targets minimize mis-taps
- Hover states show button responsiveness

