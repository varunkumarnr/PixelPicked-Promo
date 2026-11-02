# PixelPicked 1,000 games promo

A ~70s video made with [Remotion](https://www.remotion.dev): every approved game is a tile on a
wall that fills in the real order games joined. The camera zooms into three tiles to tell
three developers' stories (game footage + their voice), then pulls back to the full wall.
No narrator and no counters: the only voices are the stories.

## Commands

```bash
npm install
npm run fetch-games     # refresh src/data/games.json + public/icons from the live API
npm run studio          # preview and scrub the video in the browser
npm run render          # out/wall-16x9.mp4  (YouTube, X)
npm run render:vertical # out/wall-9x16.mp4  (Reels, TikTok, Shorts)
```

## Adding a story

Edit `src/config.ts` → `STORIES`:

| Field | What |
|---|---|
| `gameId` | The game's short id (in `src/data/games.json`) |
| `clip` | Gameplay recording in `public/stories/`, e.g. `stories/granny.mp4` (portrait, ~12s) |
| `voice` | Their voice memo (or the storyteller voice) in `public/stories/`, e.g. `stories/granny.mp3` |
| `quote` | One short line in their own words, shown on screen |
| `caption` | How they agreed to be described, e.g. "Margaret, 64, learning to code" |

Only use a developer's name, story, words and game with their written OK.

## Before launch

1. Run `npm run fetch-games` on launch day so the wall has every game.
2. Swap the placeholder stories for the real ones.
3. Add music (drop an mp3 in `public/` and an `<Audio>` in `src/Wall.tsx`).
