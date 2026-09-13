import type { Place } from "./types";

/**
 * Demo content for local development only.
 *
 * These seven places and their notes are invented for the design prototype —
 * they are sample data, not content to ship. They are loaded only by the
 * in-memory fallback store (no datastore credentials configured); a real
 * deployment starts with an empty board.
 *
 * Photos are empty here: every photo in the prototype was a placeholder tile,
 * and real photos come from Cloudinary uploads.
 */
export const SEED_PLACES: Place[] = [
  {
    id: "p1",
    name: "Little Pearl",
    cuisine: "Oysters",
    area: "Fort Greene",
    visits: [
      {
        id: "v1",
        by: "jenn",
        date: "2026-03-14",
        score: 9.6,
        note: "The mignonette. I thought about it the next morning. Bread service alone is worth the trip.",
        photos: [],
      },
      {
        id: "v2",
        by: "eddy",
        date: "2026-03-14",
        score: 9.4,
        note: "Best dozen we've had here. Room gets loud after eight but nobody rushed us.",
        photos: [],
      },
      {
        id: "v3",
        by: "jenn",
        date: "2026-07-02",
        score: 9.8,
        note: "Sat at the bar, split the tower. Still perfect.",
        photos: [],
      },
    ],
  },
  {
    id: "p2",
    name: "Hoja Verde",
    cuisine: "Oaxacan",
    area: "Bushwick",
    visits: [
      {
        id: "v4",
        by: "jenn",
        date: "2026-05-20",
        score: 8.6,
        note: "Mole negro is the whole reason to come. Tortillas made in the window.",
        photos: [],
      },
      {
        id: "v5",
        by: "eddy",
        date: "2026-05-20",
        score: 9.1,
        note: "Ordered the tasting. The smoked plantain thing — get two.",
        photos: [],
      },
    ],
  },
  {
    id: "p3",
    name: "Café Mirto",
    cuisine: "Bakery",
    area: "Cobble Hill",
    visits: [
      {
        id: "v6",
        by: "eddy",
        date: "2026-08-09",
        score: 8.2,
        note: "Morning buns, sunny table, no line before nine.",
        photos: [],
      },
    ],
  },
  {
    id: "p4",
    name: "Tashi Momo",
    cuisine: "Tibetan",
    area: "Jackson Heights",
    visits: [
      {
        id: "v7",
        by: "jenn",
        date: "2026-02-01",
        score: 7.4,
        note: "Chili oil is excellent, dumpling skins a little thick.",
        photos: [],
      },
      {
        id: "v8",
        by: "eddy",
        date: "2026-02-01",
        score: 7.8,
        note: "Cheap, fast, warm. Good weeknight answer.",
        photos: [],
      },
    ],
  },
  {
    id: "p5",
    name: "Rosewater Grill",
    cuisine: "Persian",
    area: "Kensington",
    visits: [
      {
        id: "v9",
        by: "jenn",
        date: "2026-06-11",
        score: 6.4,
        note: "Rice was beautiful, kebab came out dry. Would try the stews instead.",
        photos: [],
      },
      {
        id: "v10",
        by: "eddy",
        date: "2026-06-11",
        score: 7.2,
        note: "The saffron rice carried it. I'd go back for lunch.",
        photos: [],
      },
    ],
  },
  {
    id: "p6",
    name: "Nine Bowls",
    cuisine: "Ramen",
    area: "Greenpoint",
    visits: [
      {
        id: "v11",
        by: "jenn",
        date: "2026-01-18",
        score: 5.2,
        note: "Broth was thin and the wait was forty minutes. Not the one.",
        photos: [],
      },
      {
        id: "v12",
        by: "eddy",
        date: "2026-01-18",
        score: 5.8,
        note: "Fine noodles, forgettable everything else.",
        photos: [],
      },
    ],
  },
  {
    id: "p7",
    name: "Salt & Ember",
    cuisine: "Steakhouse",
    area: "Downtown",
    visits: [
      {
        id: "v13",
        by: "eddy",
        date: "2026-04-27",
        score: 8.9,
        note: "Dry-aged ribeye, proper martini, terrible music.",
        photos: [],
      },
    ],
  },
];
