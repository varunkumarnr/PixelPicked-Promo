// Pulls every approved game (icon + approval date) from the public PixelPicked
// API and saves the icons locally, so renders never depend on the network.
//
//   npm run fetch-games
//
// Writes src/data/games.json (oldest approval first) and public/icons/{id}.png.
// Icons already downloaded are skipped, so re-running only fetches new games.

import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://api.pixelpicked.com/api/discovery";
const PAGE_SIZE = 200;
const ICON_SIZE = 128;
const CONCURRENCY = 8;

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const iconsDir = path.join(root, "public", "icons");
const dataFile = path.join(root, "src", "data", "games.json");

/** A Cloudinary URL resized to a small square PNG; other URLs are used as they are. */
function iconUrl(url) {
  return url.includes("res.cloudinary.com") && url.includes("/upload/")
    ? url.replace("/upload/", `/upload/c_fill,w_${ICON_SIZE},h_${ICON_SIZE},f_png/`)
    : url;
}

async function fetchAll() {
  const games = [];
  for (let page = 0; ; page++) {
    const response = await fetch(`${API}?page=${page}&size=${PAGE_SIZE}&sortBy=NEWEST`);
    if (!response.ok) throw new Error(`Discovery API returned ${response.status}`);
    const body = await response.json();
    games.push(...body.games);
    if (!body.hasMore) return games;
  }
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function downloadIcon(game) {
  const file = path.join(iconsDir, `${game.id}.png`);
  if (await exists(file)) return true;
  const response = await fetch(iconUrl(game.logo));
  if (!response.ok) return false;
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  return true;
}

const raw = await fetchAll();
const games = raw
  .filter((game) => game.gameLogo)
  .map((game) => ({
    id: game.gameId,
    name: game.gameName,
    slug: game.gameSlug,
    logo: game.gameLogo,
    banner: game.gameBanner ?? null,
    playable: Boolean(game.activeBuildUrl),
    joinedAt: game.approvedAt ?? game.createdAt,
  }))
  .filter((game) => game.joinedAt)
  .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));

await mkdir(iconsDir, { recursive: true });
await mkdir(path.dirname(dataFile), { recursive: true });

let done = 0;
const failed = [];
const queue = [...games];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const game = queue.shift();
      if (!(await downloadIcon(game))) failed.push(game.id);
      if (++done % 100 === 0) console.log(`  ${done}/${games.length} icons`);
    }
  }),
);

const withIcons = games.filter((game) => !failed.includes(game.id)).map(({ logo, ...game }) => game);
await writeFile(dataFile, JSON.stringify(withIcons, null, 1));
console.log(
  `Saved ${withIcons.length} games (${raw.length} approved, ${failed.length} icons failed) ` +
    `from ${withIcons[0]?.joinedAt.slice(0, 10)} to ${withIcons.at(-1)?.joinedAt.slice(0, 10)}`,
);
