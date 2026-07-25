import type { Phase } from './cycle'

// "Eras & weather" design system — every phase is an era with its own gradient,
// accent, name and personality. This is the single source of truth for era
// theming; all screens derive their colors from the CURRENT phase of the card
// being viewed. Gradients are soft pastels and always pair with dark `ink` text
// so era cards stay readable in both light and dark mode.
export interface Era {
  name: string // display name, e.g. "cozy era"
  emoji: string // the weather emoji
  from: string // gradient start
  to: string // gradient end
  accent: string // deep accent for highlights/pills
  accentSoft: string // light tint for chips / tinted surfaces
  ink: string // text color that sits on the gradient
  icons: string[] // decorative floating icons for the hero card
}

export const ERAS: Record<Phase, Era> = {
  menstrual: {
    name: 'cozy era',
    emoji: '🌧️',
    from: '#F6D2D8',
    to: '#E4B4C2',
    accent: '#9B3B5A',
    accentSoft: '#F7E4EA',
    ink: '#571f31',
    icons: ['🌧️', '🧸', '🍜'],
  },
  follicular: {
    name: 'loading era',
    emoji: '🌱',
    from: '#DCF0DE',
    to: '#F4EEC6',
    accent: '#37814F',
    accentSoft: '#E7F5EA',
    ink: '#234730',
    icons: ['🌱', '✨'],
  },
  ovulatory: {
    name: 'glow era',
    emoji: '☀️',
    from: '#FCDDC1',
    to: '#F6D687',
    accent: '#D95F32',
    accentSoft: '#FCE9D9',
    ink: '#65361b',
    icons: ['☀️', '✨', '🌸'],
  },
  luteal: {
    name: 'soft era',
    emoji: '🌙',
    from: '#E4DCF4',
    to: '#CBD8EC',
    accent: '#65489A',
    accentSoft: '#EDE7F7',
    ink: '#342556',
    icons: ['🌙', '☁️'],
  },
}

export function eraGradient(phase: Phase): string {
  const e = ERAS[phase]
  return `linear-gradient(135deg, ${e.from} 0%, ${e.to} 100%)`
}

// A soft radial blob in the era accent for floating behind content.
export function eraBlob(phase: Phase): string {
  return ERAS[phase].accent
}
