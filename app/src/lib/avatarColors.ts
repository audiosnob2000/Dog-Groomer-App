/** Rotating avatar-circle palette, taken from the design mockup's pet-initial circles. */
const AVATAR_COLORS = [
  { bg: '#DCE6DC', text: '#34503F' }, // green
  { bg: '#DDE4EC', text: '#3C5470' }, // blue
  { bg: '#E9DDCB', text: '#6B4E2E' }, // tan
  { bg: '#E7DDE9', text: '#5A4466' }, // purple
  { bg: '#EAE5D2', text: '#5E5424' }, // olive
  { bg: '#F1DED3', text: '#8A4428' }, // peach
] as const

export function avatarColorFor(seed: string): { bg: string; text: string } {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
