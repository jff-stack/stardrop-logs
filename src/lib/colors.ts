// Stool colours with friendly names. The checkIn ones always come with a
// "please see a doctor" note. The app never guesses what a colour means.
import type { StoolColor } from "./types";

export interface ColorInfo {
  key: StoolColor;
  label: string;
  hex: string;
  /** Worth a doctor's check if it persists (and isn't explained by food). */
  checkIn: boolean;
  note?: string;
}

export const COLORS: Record<StoolColor, ColorInfo> = {
  brown:       { key: "brown",       label: "Rich soil",  hex: "#8a5a3c", checkIn: false },
  dark_brown:  { key: "dark_brown",  label: "Dark loam",  hex: "#5b3a2a", checkIn: false },
  light_brown: { key: "light_brown", label: "Sandy loam", hex: "#b98a5e", checkIn: false },
  green:       { key: "green",       label: "Mossy",      hex: "#6f8f3e", checkIn: false, note: "Often from leafy greens. Totally normal!" },
  yellow:      { key: "yellow",      label: "Straw",      hex: "#d9b44a", checkIn: false, note: "If it's greasy or keeps happening, please see a doctor." },
  clay_pale:   { key: "clay_pale",   label: "Pale clay",  hex: "#d8cbb2", checkIn: true,  note: "Pale or clay-coloured stool needs a doctor's opinion. Please book a visit." },
  red:         { key: "red",         label: "Red clay",   hex: "#a83a32", checkIn: true,  note: "Red can be a sign of blood. Please see a doctor to be safe." },
  black:       { key: "black",       label: "Charcoal",   hex: "#2b2424", checkIn: true,  note: "Black or tarry stool needs a doctor's opinion. Please see one soon." },
};

export const COLOR_LIST = Object.values(COLORS);
