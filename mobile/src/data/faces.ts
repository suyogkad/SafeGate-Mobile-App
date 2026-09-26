/** The brand characters (faces), as transparent PNGs in assets/faces/. */
export const FACES = {
  sadDiamond: require('../../assets/faces/sad-diamond.png'),
  frownHexagon: require('../../assets/faces/frown-hexagon.png'),
  flatStarburst: require('../../assets/faces/flat-starburst.png'),
  smileFlower: require('../../assets/faces/smile-flower.png'),
  grinFlower: require('../../assets/faces/grin-flower.png'),
  calmHexagon: require('../../assets/faces/calm-hexagon.png'),
  coolArch: require('../../assets/faces/cool-arch.png'),
  crownEgg: require('../../assets/faces/crown-egg.png'),
  glassesSquare: require('../../assets/faces/glasses-square.png'),
  monocleWave: require('../../assets/faces/monocle-wave.png'),
  oMouthPink: require('../../assets/faces/o-mouth-pink.png'),
  smileBlobCyan: require('../../assets/faces/smile-blob-cyan.png'),
  smileFlowerAmber: require('../../assets/faces/smile-flower-amber.png'),
  smileGhost: require('../../assets/faces/smile-ghost.png'),
  smilePillPink: require('../../assets/faces/smile-pill-pink.png'),
  smileSplatOrange: require('../../assets/faces/smile-splat-orange.png'),
} as const;

export type FaceName = keyof typeof FACES;

export const ART = {
  // The SafeGate logo: the wordmark and the G mark (transparent cut-outs of the brand artwork).
  wordmark: require('../../assets/brand/wordmark.png'),
  mark: require('../../assets/brand/mark.png'),
  heroHome: require('../../assets/art/hero-home.png'),
  cheer: require('../../assets/art/cheer.png'),
  // Explore hero: the moustache character and its hand.
  exploreFace: require('../../assets/art/explore-face.png'),
  exploreHand: require('../../assets/art/explore-hand.png'),
} as const;

/**
 * Photos of the therapists (optimised copies: a wide one for the hero, a square face crop for avatars; the
 * originals are several MB). Used only on the therapist's own side: the child app and the parent area keep
 * initials and characters.
 */
export const PHOTOS = {
  priya: { hero: require('../../assets/therapists/priya-hero.jpg'), face: require('../../assets/therapists/priya-face.jpg') },
  sam: { hero: require('../../assets/therapists/sam-hero.jpg'), face: require('../../assets/therapists/sam-face.jpg') },
  mei: { hero: require('../../assets/therapists/mei-hero.jpg'), face: require('../../assets/therapists/mei-face.jpg') },
} as const;
