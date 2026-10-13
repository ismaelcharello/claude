import type { AgentAvatarProfile } from "@/lib/avatars/profile";

type Preset = Omit<AgentAvatarProfile, "version" | "seed">;

const ONYX = "#131714";
const FOREST = "#1e4a35";
const DEEP = "#10281d";
const CHAMPAGNE = "#c8a66a";
const IVORY = "#f4f0e7";

/** Executive outfits in the Savana palette for the five agents' 3D avatars. */
export const SAVANA_AVATAR_PRESETS: Record<string, Preset> = {
  nexo: {
    body: { skinTone: "#d8a06e" },
    hair: { style: "short", color: "#151515" },
    clothing: { topStyle: "jacket", topColor: ONYX, bottomStyle: "pants", bottomColor: ONYX, shoesColor: "#1a1a1a" },
    accessories: { glasses: true, headset: true, hatStyle: "none", backpack: false },
  },
  atlas: {
    body: { skinTone: "#f4c58a" },
    hair: { style: "parted", color: "#6b4f3a" },
    clothing: { topStyle: "jacket", topColor: FOREST, bottomStyle: "pants", bottomColor: IVORY, shoesColor: "#7c4a2d" },
    accessories: { glasses: true, headset: false, hatStyle: "none", backpack: false },
  },
  lume: {
    body: { skinTone: "#8a5a3b" },
    hair: { style: "bun", color: "#3e2723" },
    clothing: { topStyle: "jacket", topColor: CHAMPAGNE, bottomStyle: "pants", bottomColor: ONYX, shoesColor: "#1a1a1a" },
    accessories: { glasses: false, headset: false, hatStyle: "none", backpack: false },
  },
  pulso: {
    body: { skinTone: "#b7794e" },
    hair: { style: "spiky", color: "#151515" },
    clothing: { topStyle: "jacket", topColor: IVORY, bottomStyle: "pants", bottomColor: FOREST, shoesColor: "#7c4a2d" },
    accessories: { glasses: false, headset: true, hatStyle: "none", backpack: false },
  },
  forja: {
    body: { skinTone: "#5d3a24" },
    hair: { style: "short", color: "#151515" },
    clothing: { topStyle: "hoodie", topColor: DEEP, bottomStyle: "pants", bottomColor: ONYX, shoesColor: "#e5e7eb" },
    accessories: { glasses: true, headset: true, hatStyle: "none", backpack: true },
  },
};
