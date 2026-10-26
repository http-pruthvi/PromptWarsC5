import type { EventType, Moodboard } from '@soiree/shared'
import {
  MOODBOARD_PRESETS,
  DEFAULT_WEDDING_PRESET,
  DEFAULT_BIRTHDAY_PRESET,
  DEFAULT_COMMUNITY_PRESET,
} from './moodboardPresets.js'

/**
 * Match moodboard preset based on search keywords or event type fallback.
 * Preserves exact typography, palette and theme tokens expected by system invariants.
 *
 * @param searchString - Query string from brief theme/vibe
 * @param type - Event type fallback ('wedding', 'birthday', etc.)
 * @returns Complete Moodboard configuration
 */
export function getMoodboardPreset(searchString: string, type: EventType = 'wedding'): Moodboard {
  const match = MOODBOARD_PRESETS.find((p) => p.matcher.test(searchString))
  if (match) {
    return {
      palette: match.palette,
      typography: match.typography,
      motifs: match.motifs,
      decor: match.decor,
      outfitNotes: match.outfitNotes,
      playlistVibes: match.playlistVibes,
    }
  }

  const fallback =
    type === 'wedding'
      ? DEFAULT_WEDDING_PRESET
      : type === 'birthday'
        ? DEFAULT_BIRTHDAY_PRESET
        : DEFAULT_COMMUNITY_PRESET

  return {
    palette: fallback.palette,
    typography: fallback.typography,
    motifs: fallback.motifs,
    decor: fallback.decor,
    outfitNotes: fallback.outfitNotes,
    playlistVibes: fallback.playlistVibes,
  }
}
