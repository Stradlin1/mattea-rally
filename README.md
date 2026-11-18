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
| Shift + A / D | Power drift / 动力漂移 |
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

## V0.3 handling and visuals / 操控与车辆升级

- Larger 3.1 m × 6.3 m low-poly rally car, with sloped glass, layered bodywork, wider fenders, rims, lights, spoiler, hood scoop and rally decals.
- The chase camera sits closer to the body and follows the *movement vector* during a drift, making the car's sideways attitude visible.
- Track widths: Pine Valley **26 m**, Frost Ridge **24 m**, Red Canyon **29 m**. Track layouts and checkpoint rules remain intact.
- Nonlinear speed response: gradually decreasing available torque toward **200 km/h**, with a slower high-speed build and a hard speed limit. Shift boosts acceleration and also initiates power slides when combined with steering.
- Drifting now simulates lateral velocity, progressive tire grip loss, a rear-axle breakaway impulse, yaw inertia and grip recovery. Different vehicles have separate drift-kick values.
- The improved vehicle physics and wider course geometry use PB namespace `mattea-rally-v3` to prevent comparing incompatible records; older local records are not erased.

## Current prototype / 当前原型

- Four tunable cars: Classic GT, AWD Turbo, Drift Coupe, Dirt Buggy.
- Three distinct looping tracks: Pine Valley, Frost Ridge, Red Canyon.
- Clear, rain and fog handling and visibility settings.
- Traversable off-road terrain and physical collision responses around trees, rocks and the outer world edge.
- Arcade velocity-based drift, dust, camera switching, speedometer, minimap and split checkpoint prompts.
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
