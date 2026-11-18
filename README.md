# MATTEA RALLY

**Pixel-style 3D rally time attack / 像素风 3D 拉力计时游戏**

A browser-based rally driving game built with HTML, CSS, JavaScript and Three.js. No backend, account or build step required. Compatible with static hosting such as GitHub Pages.

## Play / 游玩

After enabling **Settings → Pages → Deploy from a branch → main / (root)**, the game is available at:

https://stradlin1.github.io/mattea-rally/

Three.js is loaded from a pinned CDN URL; the first visit requires internet access.

To run locally, use a static HTTP server, for example:

```bash
python -m http.server 8000
```

Open http://localhost:8000. Opening `index.html` directly with `file://` may block ES modules.

## Controls / 操作

| Key | Action |
| --- | --- |
| W | Accelerate / 加速 |
| S | Slow down, reverse / 减速、倒车 |
| A / D | Steer / 转向 |
| Space | Brake / 刹车 |
| Shift | Boost / 冲刺 |
| A / D + Space | Handbrake drift / 手刹甩尾 |
| C | Switch chase / driver camera / 切换视角 |
| R | Restart the entire race / 重开比赛 |
| Esc | Pause / 暂停 |

## Rules / 赛制

- Set the race length from **1 to 99 laps**.
- Follow the track in the correct direction and pass **three checkpoints in order** before crossing the start/finish line. Shortcuts through traversable off-road terrain are allowed as long as checkpoints are passed.
- **Best Lap** records the fastest valid lap regardless of the total race length.
- **Best Race** records the fastest *completed* N-lap race, separately for each N.
- Both records are scoped by track, car and weather to keep comparisons consistent.
- Records are saved in your browser's `localStorage`; they are not synced between browsers or devices.
- A race is only complete after all N laps. A fast single lap can be recorded even when the full race is not completed.

## Driving and stage update / 驾驶及赛道升级

- **Maximum speed is 200 km/h** for all cars; boost changes acceleration but does not bypass the hard cap. Off-road surfaces reduce grip and practical top speed.
- The three circuits have been completely redesigned with more control points: linked S-bends, sharp hairpins and fast sweeping corners, with evenly spaced track samples.
- **C changes between chase camera and a driver's-seat cockpit view**, including an animated steering wheel, dashboard gauges and windscreen frame. The steering wheel follows steering input; no driver arms or hands are rendered.
- Because driving physics and circuit geometry were changed, PB records now use version `mattea-rally-v2`. Previous V0.1 records remain in browser storage, but do not appear in new rankings.

## V0.5 — Classic car and handling restored / 经典车模与手感回退

- Restored the original V0.2 compact low-poly car, including its body, wheels, cabin and spoiler.
- Restored V0.2's more planted lateral traction and direct steering model. Removed the V0.3 rear-axle kick, persistent yaw inertia and velocity-oriented chase camera.
- **Controls retained:** A/D + Space initiates handbrake drift; Space alone brakes; Shift only boosts acceleration.
- Kept the wider circuits, 200 km/h speed limit, gradual nonlinear acceleration and driver's-seat cockpit view.
- PB namespace is now `mattea-rally-v5` because vehicle dynamics were changed. Earlier records remain in localStorage.

## V0.6 — Engine and corner-speed tuning / 动力与弯道速度调整

- Upgraded the four vehicles' mid-range engine acceleration (Classic GT 9.1, AWD Turbo 9.6, Drift Coupe 10.0, Dirt Buggy 9.3 m/s² base acceleration).
- Reduced excessive rolling/aerodynamic drag that previously offset engine force around 90 km/h.
- Normal cornering now retains a portion of lateral correction energy, so ordinary steering does not behave like heavy braking. Handbrake drifting still sheds significantly more speed.
- Reduced the abrupt off-road speed clamp: entering grass/snow/sand reduces sustainable throttle speed and increases drag, rather than instantly cutting current speed.
- The 200 km/h hard cap, nonlinear high-speed torque drop, classic V0.2 car model, planted steering behavior and A/D + Space handbrake remain.
- Changed the best-time namespace to `mattea-rally-v6` because performance changes make earlier PBs incomparable.

## V0.7 — Acceleration verification and driving telemetry / 加速核验

- Increased mid-range acceleration and reduced corner-speed loss a little further, with a softer off-road throttle restriction.
- **Press F3 in-game** to see the actual loaded build version, speed, surface detection, throttle input, engine force, target speed and turning speed loss. The start menu and race HUD also display the build label.
- If the online game still appears stuck around 90 km/h, check **BUILD V0.7** is visible; otherwise GitHub Pages or browser cache is serving an older build.
- PB records now use `mattea-rally-v7` because handling changed; older records are retained.

## Current prototype / 当前原型

- Four tunable cars: Classic GT, AWD Turbo, Drift Coupe, Dirt Buggy.
- Three distinct looping tracks: Pine Valley, Frost Ridge, Red Canyon.
- Clear, rain and fog handling and visibility settings.
- Traversable off-road terrain and physical collision responses around trees, rocks and the outer world edge.
- Arcade grip-based handbrake drift, dust, camera switching, speedometer, minimap and split checkpoint prompts.
- Low-resolution WebGL rendering enlarged with nearest-neighbor sampling for a retro pixelated look.

**Prototype limitations:** Vehicle physics are still arcade-style (custom lateral-slip and yaw dynamics), not a full tire/suspension rigid-body simulation. The cockpit has a simplified low-poly dashboard rather than a fully furnished interior. Weather effects presently alter fog/traction rather than having fully rendered rain particle systems. Best-lap ghost samples are stored for future replay support but not displayed yet. These are planned improvements, not completed features.

## Project structure / 结构

```text
index.html       HTML menus, HUD, result screen
styles.css       Retro responsive UI
src/main.js      Game scene, terrain, track, vehicles, controls, racing logic
```

## Technology / 技术

- Three.js (pinned `0.169.0`)
- Vanilla JavaScript ES modules
- HTML and CSS
- Browser `localStorage`
- GitHub Pages static hosting

## Credits

Original prototype assembled for MATTEA RALLY. Previous public browser-racing projects consulted as technical references include [Dustline](https://github.com/grantjenkins/rallygame), [NEON DRIFT](https://github.com/chainsukritthikan-lab/neon-drift) and [GOLDEN HOUR](https://github.com/StarKnightt/nightdrive). Their source code and game assets are not bundled in this repository.
