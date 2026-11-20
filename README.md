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
| Shift + W | Nitro boost (consumes tank) / 氮气加速（消耗氮气） |
| A / D + Space | Handbrake drift and rapid nitro recharge / 手刹漂移、快速补充氮气 |
| C | Switch chase / driver camera / 切换视角 |
| R | Restart the entire race / 重开比赛 |
| Esc | Pause / 暂停 |
| M | Toggle BGM / 开关背景音乐 |
| N | Toggle engine SFX / 开关引擎及驾驶音效 |

## Rules / 赛制

- Set the race length from **1 to 99 laps**.
- **No checkpoints:** laps register only at the start/finish line after a substantial forward traversal of the closed route. Repeated line crossings, reverse driving and implausible progress jumps do not earn laps. Off-road driving remains allowed.
- **Best Lap** records the fastest valid lap regardless of the total race length.
- **Best Race** records the fastest *completed* N-lap race, separately for each N.
- Both records are scoped by track, car and weather to keep comparisons consistent.
- Records are saved in your browser's `localStorage`; they are not synced between browsers or devices.
- A race is only complete after all N laps. A fast single lap can be recorded even when the full race is not completed.

## Driving and stage update / 驾驶及赛道升级

- **Maximum speed is 200 km/h** for all cars; the finite nitro boost changes acceleration but does not bypass the hard cap. Off-road surfaces reduce grip and practical top speed.
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

## V0.8 — Nitro boost and drift charging / 氮气加速系统

- Nitro starts at **100%**, and a running **W + Shift** boost consumes **24% per second** (about 4.2 seconds of continuous boost).
- While not boosting, the tank passively restores **3% per second**. **A/D + Space** handbrake drifting at sufficient speed and slip angle restores **28% per second** instead.
- Nitro gives a higher throttle power multiplier (1.75× engine torque instead of unlimited use). The 200 km/h hard speed cap remains.
- A depleted tank pauses boost; release Shift and recharge to at least 12% before activating again.
- The new HUD includes a live nitro percentage, blue tank bar, charging/boosting feedback and a blue-white exhaust flame effect while boosting. Flames are attached to the original V0.2 car model.
- The entire tank resets at each new race or restart, not every lap. Pausing freezes consumption.
- Best times now use `mattea-rally-v8` because finite boost changes race balance; older records remain in localStorage.

## V0.9 — Off-road resistance adjustment / 越野阻力调整

- Passive resistance outside the designated track is now **50% of the previous off-road resistance**, including the baseline drag and extra off-road drag.
- On-track resistance, braking drag, tire grip, acceleration, nitro burn/charging and off-road speed targets are unchanged.
- Build label: `V0.9`; PB namespace: `mattea-rally-v9`. Older records remain in browser storage.

## V1.0 — Start-line-only laps, differentiated cars and richer worlds

- **All intermediate checkpoints and checkpoint posts have been removed.** One physical checkered start/finish line remains. Lap validation uses signed closed-loop progress, actual distance, elapsed time, correct crossing direction and proximity to the circuit. This is deliberately less restrictive than checkpoints while filtering repeated start-line exploits.
- The cars now differ substantially in acceleration, steering sensitivity, lateral grip, drifting characteristics, class-specific maximum speed, off-road tolerance, nitro strength, nitro burn and drift recharge. Main car silhouette stays based on the preferred V0.2 model, with a few class-specific accents.
- All three environments now include dense instanced flora and rocks, painted road edges and shoulders, start arches, stylized clouds and mountain silhouettes, plus distinctive landmarks:
  - Pine Valley: timber cabin, observation tower and stacked logs.
  - Frost Ridge: alpine hut, reflective lake and snow-covered peaks.
  - Red Canyon: red-rock arch, desert encampment and cacti.
- Repeated small scenery meshes are GPU-instanced to reduce draw calls; decorative roadside items are non-blocking, so no invisible walls are introduced.
- Previous PB records remain stored; `mattea-rally-v10` starts a fresh ranking because the course validation and car balance changed.

## V1.2 — Low-poly stage and vehicle art / 场景与车模升级

- The four vehicles retain their existing **handling classes and driving parameters**, but now have distinct procedural low-poly shells, wheel rims, window pillars, lamps, bumpers, liveries and car-specific rally equipment.
- All three stages now feature denser GPU-instanced trees, varied ground cover, rocks, huts, rally banners, mountain backdrops and biome-specific landmarks; gravel receives two subdued tire-wear paths.
- Higher-resolution 3D rendering with anti-aliasing improves car silhouette and roadside readability without changing the familiar arcade interface.
- **No handling modifications:** `updatePhysics()`, `cars.js`, `nitro.js`, lap validation, track control points and key mappings remain unchanged. Decorative scenery is non-blocking and there are still no checkpoints.
- All artwork is procedural and original; no assets from the reference game are copied.

## V1.1 — Original music and engine audio / 原创音乐与引擎音效

- Added an **original, procedurally synthesized 8-bit BGM** with square-wave melody, bass, kick, snare and hi-hat. No third-party audio files, external music services or copyrighted songs are used.
- Engine audio responds to vehicle speed, throttle, approximate gear changes, nitro activation and different car types. Tire noise appears during drifting; nitro adds an exhaust hiss.
- The garage includes **BGM ON/OFF**, **ENGINE ON/OFF** and **master volume** controls. Preferences are saved in localStorage; **M** toggles music and **N** toggles engine sound without affecting driving controls.
- Audio starts only after clicking **START TIME ATTACK** or deliberately using the audio controls, in accordance with browser autoplay restrictions.
- Engine and tire/nitro audio mute on pause and race finish. Music continues in the garage/finish screen when enabled, and pauses during a race pause.
- Music and engine synthesis run with the Web Audio API and do not affect racing physics or best-time records.

## Current prototype / 当前原型

- Four distinct driving classes: Classic GT (balanced), AWD Turbo (traction and acceleration), Drift Coupe (rear grip and powerful nitro refills), Dirt Buggy (superior off-road performance).
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
src/main.js      Game scene, road, driving physics, controls, HUD
src/vehicleVisuals.js  New four-class procedural car bodies
src/cars.js      Vehicle class parameters
src/lap.js       Start/finish-only lap validation
src/sceneryV2.js  New GPU-instanced themed landscapes and props
src/scenery.js   Previous scenery implementation (legacy)
src/nitro.js     Finite nitro and drift regeneration
src/tracks.js    Distinct course geometry
```

## Technology / 技术

- Three.js (pinned `0.169.0`)
- Vanilla JavaScript ES modules
- HTML and CSS
- Browser `localStorage`
- GitHub Pages static hosting

## Credits

Original prototype assembled for MATTEA RALLY. Previous public browser-racing projects consulted as technical references include [Dustline](https://github.com/grantjenkins/rallygame), [NEON DRIFT](https://github.com/chainsukritthikan-lab/neon-drift) and [GOLDEN HOUR](https://github.com/StarKnightt/nightdrive). Their source code and game assets are not bundled in this repository.
