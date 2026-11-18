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

## Current prototype / 当前原型

- Four tunable cars: Classic GT, AWD Turbo, Drift Coupe, Dirt Buggy.
- Three distinct looping tracks: Pine Valley, Frost Ridge, Red Canyon.
- Clear, rain and fog handling and visibility settings.
- Traversable off-road terrain and physical collision responses around trees, rocks and the outer world edge.
- Arcade velocity-based drift, dust, camera switching, speedometer, minimap and split checkpoint prompts.
- Low-resolution WebGL rendering enlarged with nearest-neighbor sampling for a retro pixelated look.

**Prototype limitations:** Vehicle physics are intentionally arcade-style, not a full tire/suspension rigid-body simulation. The camera modes are chase and forward driver view (without a detailed cockpit). Weather effects presently alter fog/traction rather than having fully rendered rain particle systems. Best-lap ghost samples are stored for future replay support but not displayed yet. These are planned improvements, not completed features.

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
