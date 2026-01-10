# Flight Control Center - Quick Start Guide

## 🎯 What's New?

The Flight Control dashboard has been completely redesigned for **better usability, tactical operation, and user-friendly design**.

---

## 🚀 Getting Started

### Step 1: Start the App
```bash
pnpm dev
```

### Step 2: Open Map
Navigate to `http://localhost:5173/map` (or wherever the app is hosted)

### Step 3: Look for Flight Control Panel
- **Right side of screen**: 320px wide sidebar (was 200px)
- **Title**: "FLIGHT CONTROL" at top
- **Expand/Collapse**: Chevron button (><) at top right

---

## 🎮 Quick Controls

### Mode Selection (Top of Sidebar)
Click any of these 5 large icons:

```
[🔄] Rotate    → Continuous 360° rotation
[🌀] Orbit     → Circle around a target point
[✈️] Flight    → Manual heading/altitude/pitch control
[🎲] Random    → Autonomous random navigation
[🧭] Nav       → Standard pan/zoom navigation
```

### Keyboard Shortcuts
```
[1] Switch to Navigation
[2] Switch to Orbit
[3] Switch to Flight Mode
[4] Switch to Random Path
[5] Switch to Navigation

In Flight Mode:
  [W] / [↑]  Climb
  [S] / [↓]  Descend
  [A] / [←]  Turn Left
  [D] / [→]  Turn Right

Global:
  [+] / [-]  Zoom In/Out
  [5] / [0]  5x or 10x Magnification
  [R]        Reset Bearing to North
```

---

## 📍 Key Features

### 1. Larger, Easier-to-Use Interface
| Before | After | Improvement |
|--------|-------|-------------|
| 200px wide | 320px wide | 60% more space |
| 28px buttons | 44px buttons | Easier to click |
| 9px text | 14px text | More readable |
| Cramped | Spacious | More comfortable |

### 2. New: Location Bookmarks
```
1. Fly to a location you like
2. Click "Save Current Location"
3. Bookmark saved with name
4. Later: Click "Fly" to return (smooth 3-second animation)
5. Can edit name or delete bookmark
```

### 3. New: Flight Path Visualization
```
- Fly in any flight mode
- Watch a cyan-to-amber trail appear on map
- Path fades from old (cyan) to new (amber)
- Automatically clears when switching to navigation
```

### 4. New: Altitude Warnings
```
Too High (>20,000 ft):   🔴 Red danger alert
High (18-20,000 ft):     🟡 Yellow warning
Low (5-6,000 ft):        🟡 Yellow warning
Too Low (<5,000 ft):     🔴 Red danger alert
Normal (6-18,000 ft):    No warning
```

### 5. New: Keyboard Shortcuts
```
No mouse needed!
- 16+ keyboard shortcuts for all operations
- Arrow keys work in navigation mode
- WASD works in flight mode
- Number keys switch flight modes
- +/- keys zoom in and out
- Shortcuts shown as small badges on buttons
```

---

## 💡 Common Scenarios

### Scenario 1: Quick Reconnaissance Flight
```
1. Press [3] to enter Flight Mode
2. Hold [W] to climb
3. Press [A]/[D] to turn and look around
4. Press [8] for 45° pitch (good tactical view)
5. Press [5] for 5x zoom on interesting area
6. Press [5] again to return to normal view
```

### Scenario 2: Save a Strategic Location
```
1. Navigate to command center location
2. Fly around and position camera nicely
3. Click "Save Current Location" button
4. Give it a meaningful name (edit in-place)
5. Location saved to browser storage (persists)
6. Click "Fly" anytime to return
```

### Scenario 3: Orbit Around a Target
```
1. Click [🌀] Orbit icon
2. Cmd/Ctrl + Click on map where you want to orbit
3. Watch cyan crosshair appear
4. Aircraft smoothly orbits around that point
5. Double-click on new location to fly there
6. Automatically continues orbiting at new location
```

### Scenario 4: Autonomous Patrol
```
1. Click [🎲] Random Path icon
2. Aircraft autonomously flies random patterns
3. Heading changes every 3-7 seconds
4. Altitude gently varies
5. Pitch oscillates (55-75°)
6. Click [🎲] again to return to manual control
```

---

## 📱 On Mobile/Tablet

- **No keyboard?** Use on-screen buttons instead of keyboard shortcuts
- **Touch targets**: All buttons are 44px+ (easy to tap)
- **Portrait mode**: Sidebar slides to side, still fully functional
- **Pinch zoom**: Still works for map navigation
- **Tap to select**: Use on-screen mode buttons (no keyboard needed)

---

## 🐛 Troubleshooting

### "Keyboard shortcuts not working"
- Click on map first (give it focus)
- Keyboard shortcuts only work with map focus
- Typing in text inputs disables shortcuts (by design)

### "Flight is slow/fast"
- Speed is consistent (doesn't change)
- Zoom level affects perceived speed
- Hold keys longer for more distance

### "Warnings keep appearing"
- Warnings show when zoom exceeds thresholds
- Zoom to normal levels to dismiss
- Yellow warning = caution, Red danger = critical

### "Bookmarks disappeared"
- Check if browser allows localStorage
- Try saving new bookmark
- Clear browser cache if using old code version

### "Flight path not showing"
- Path only visible in flight modes
- Not visible in standard navigation
- Path appears after ~4 seconds (needs 2 samples)

---

## 🎓 Understanding Flight Modes

### Standard Navigation (Nav / 🧭)
- Classic map panning/zooming
- Use arrow keys to pan in 4 directions
- Use +/- to zoom
- Use number keys for pitch presets
- **Best for**: Quick navigation, planning

### Auto-Rotate (Rotate / 🔄)
- Camera continuously rotates 360°
- Smooth rotation, no manual control
- Useful for watching something rotate
- **Best for**: Reconnaissance, surveillance

### Auto-Orbit (Orbit / 🌀)
- Camera circles around a target point
- Cmd/Ctrl+Click to set orbit center
- Double-click to fly to new location
- Shows cyan crosshair at target
- **Best for**: Tactical analysis, targeting

### Flight Mode (Flight / ✈️)
- Full 3D flight control
- WASD/Arrows for heading and altitude
- Pitch presets for camera angle
- Cmd/Ctrl+Click to set destination
- Auto-transitions to orbit when arriving
- **Best for**: Active operations, engagement

### Random Path (Random / 🎲)
- AI autonomously flies random patterns
- No manual control available
- Random heading changes every 3-7s
- Gentle altitude variations
- **Best for**: Autonomous patrol, exploration

---

## 📊 Understanding the Status Display

The top of the sidebar shows:

```
┌─────────────┬─────────────┬─────────────┐
│  Altitude   │   Pitch     │  Heading    │
│ 12,340 ft   │   60°       │   045°      │
└─────────────┴─────────────┴─────────────┘
```

- **Altitude**: Zoom level × 1000 (zoom 12 = 12,000 ft)
- **Pitch**: Camera angle (0° = looking down, 60° = tactical)
- **Heading**: Compass direction (000° = North, 090° = East)

---

## 🎯 Pro Tips

### Flight Control Pro Tips
1. **Smooth Turns**: Hold [A] or [D] key to smoothly turn
2. **Quick Climb**: Hold [W] while adjusting heading with [A]/[D]
3. **Smooth Pitch Change**: Click preset buttons (they smoothly animate)
4. **Target Setting**: Cmd/Ctrl+Click sets destination AND target marker
5. **Magnification Toggle**: [5] and [0] are instant 5x/10x zoom

### Bookmark Pro Tips
1. **Naming**: Edit bookmark names by clicking pencil icon
2. **Revisit**: Save important positions frequently
3. **Persistence**: Bookmarks stay after page refresh
4. **Quick Return**: Click "Fly" button for smooth 3-second animation
5. **Edit Name**: Hover bookmark to reveal edit/delete buttons

### Flight Path Pro Tips
1. **Visual Record**: Path shows exactly where you flew
2. **Gradient Trail**: Cyan (old) fades to amber (current)
3. **Auto-clear**: Path clears when switching to navigation
4. **Memory Efficient**: Limited to 100 points (won't slow down)
5. **Tactical Value**: Useful for reviewing your flight path

### Keyboard Pro Tips
1. **Mouse + Keyboard**: Combine mouse clicks and keyboard for efficiency
2. **Held Keys**: Keep key pressed down for continuous motion
3. **Quick Switches**: Press 1-5 to instantly switch modes
4. **Learn Gradually**: Start with mouse, add shortcuts as you learn
5. **Cheat Sheet**: See FLIGHT_CONTROL_KEYBOARD_MAP.md for all shortcuts

---

## ⚙️ Settings & Configuration

### Current Defaults
- **Sidebar Width**: 320px (fixed)
- **Button Size**: 44px minimum (fixed)
- **Text Size**: 14-18px (fixed)
- **Path Tracking**: Enabled
- **Warnings**: Enabled
- **Keyboard Shortcuts**: Enabled

### Customizable
- **Bookmarks**: Add/edit/delete as needed
- **Pitch Presets**: Use buttons to set angle
- **Magnification**: Toggle 5x/10x as needed
- **Flight Speed**: Fixed at 0.0005 units/frame
- **Orbit Radius**: 0.05° (fixed)

---

## 🔗 Full Documentation

For more detailed information, see:

1. **FLIGHT_CONTROL_KEYBOARD_MAP.md**
   - Complete keyboard reference
   - Visual keyboard layouts
   - Troubleshooting guide
   - Print-friendly quick reference card

2. **FLIGHT_CONTROL_TESTING.md**
   - Full testing checklist
   - Expected behaviors
   - Edge case handling
   - Performance metrics

3. **FLIGHT_CONTROL_MANIFEST.md**
   - Architecture details
   - File breakdown
   - Code statistics
   - Deployment checklist

4. **FLIGHT_CONTROL_IMPLEMENTATION_SUMMARY.md**
   - Complete project overview
   - What's new and why
   - Technical highlights
   - Future enhancement ideas

---

## 📞 Getting Help

### Having trouble?
1. **Check console**: Open DevTools (F12) → Console tab
2. **Try refresh**: Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
3. **Clear cache**: Clear browser cache if seeing old version
4. **Restart browser**: Close and reopen browser completely

### Want to learn more?
- Read the keyboard shortcut guide
- Try the quick demo scenario
- Check the troubleshooting section
- Review testing checklist for expected behaviors

---

## 🎉 You're Ready!

Start with the simple navigation controls and gradually explore:
1. Standard Navigation first
2. Try Flight Mode with keyboard shortcuts
3. Experiment with Orbit and Rotate
4. Save bookmarks to favorite locations
5. Watch the flight path visualization
6. Master the tactical operations

**Happy flying!** 🛸

---

**Last Updated**: 2026-01-10
**Version**: 1.0 (Production Ready)
**Status**: ✅ Fully Implemented & Tested

