import type { MoodboardPreset } from './moodboardPresets.js'

export const DEFAULT_WEDDING_PRESET: Omit<MoodboardPreset, 'matcher'> = {
  palette: [
    { name: 'Bridal Crimson', hex: '#8a1c24', role: 'Heritage Foundation' },
    { name: 'Warm Gilded Gold', hex: '#d4af37', role: 'Sacred Metallic Accent' },
    { name: 'Blush Rose Tissue', hex: '#edd3d8', role: 'Romantic Softness' },
    { name: 'Ivory Raw Silk', hex: '#fdfbf7', role: 'Clean Ceremonial Base' },
    { name: 'Forest Jade Silk', hex: '#1b4332', role: 'Botanical Depth' },
  ],
  typography: { heading: 'Cormorant Garamond', body: 'Plus Jakarta Sans', vibe: 'Timeless Royal Elegance' },
  motifs: [
    'Mughal Floral Lattice',
    'Gilded Paisleys',
    'Lotus Blossom Crests',
    'Vintage Chandelier Drops',
    'Sacred Geometric Borders',
  ],
  decor: [
    'A circular mandap or ceremony gazebo wrapped in white rajnigandha and red roses',
    'Brass urli vessels filled with fragrant marigold heads and floating scented tea lights',
    'Warm fairy light canopies over banquet tables dressed in rich silk runners',
    'Personalized welcome mirrors with calligraphed couple names in gilded script',
  ],
  outfitNotes: [
    'Classic red, vermilion, or pastel tissue bridal lehenga with intricate dabka work',
    'Tailored ivory or raw silk groom sherwani with antique gold buttons and safa',
    'Coordinated pastel ensembles for close family and wedding party',
    'Fine Polki, uncut diamond, or heirloom emerald jewelry',
  ],
  playlistVibes: [
    'Ceremonial sitar and shehnai melodies',
    'Slow acoustic love ballads',
    'Sangeet dance-floor anthems',
    'Orchestral processional arrangements',
  ],
}

export const DEFAULT_BIRTHDAY_PRESET: Omit<MoodboardPreset, 'matcher'> = {
  palette: [
    { name: 'Midnight Navy', hex: '#1c2841', role: 'Celebratory Foundation' },
    { name: 'Rose Gold Spark', hex: '#b76e79', role: 'Glamour Focus' },
    { name: 'Champagne Shimmer', hex: '#e8d39f', role: 'Luminous Glow' },
    { name: 'Warm Cream Silk', hex: '#faf6f0', role: 'Clean Background' },
    { name: 'Plum Berry Velvet', hex: '#4a1e35', role: 'Rich Counterpoint' },
  ],
  typography: { heading: 'Playfair Display', body: 'Outfit', vibe: 'Effortless Modern Milestone Glamour' },
  motifs: [
    'Constellation Sparkles',
    'Geometric Balloon Arches',
    'Art Deco Radial Arcs',
    'Ribbon Confetti',
    'Champagne Coupe Silhouettes',
  ],
  decor: [
    'Bespoke multi-toned balloon and floral garland backdrop with customized neon milestone number',
    'Sleek acrylic dessert plinths with a centerpiece tiered designer cake',
    'Warm ambient pin lighting with flickering votives on every high-top table',
    'Interactive polaroid guestbook station with metallic pens and gold washi tape',
  ],
  outfitNotes: [
    'Sequined or satin cocktail dresses in jewel tones or shimmering rose gold',
    'Sharp dark blazer over open-collar tailored shirt with pocket square',
    'Celebratory signature accessory (statement earrings, metallic watch, or sleek heels)',
    'Smart casual chic dress code for guests with touch of sparkle',
  ],
  playlistVibes: [
    'Soulful modern funk and disco revival',
    'Top 40 acoustic lounge covers',
    'Upbeat milestone party anthems',
    'Sunset ambient electronic pulse',
  ],
}

export const DEFAULT_COMMUNITY_PRESET: Omit<MoodboardPreset, 'matcher'> = {
  palette: [
    { name: 'Warm Terracotta Brick', hex: '#b5543e', role: 'Community Warmth' },
    { name: 'Olive Green', hex: '#4a6741', role: 'Natural Fellowship' },
    { name: 'Warm Cream', hex: '#faf4eb', role: 'Gathering Canvas' },
    { name: 'Sunflower Yellow', hex: '#f4b236', role: 'Optimism & Energy' },
    { name: 'Charcoal Slate', hex: '#2c332e', role: 'Legibility Anchor' },
  ],
  typography: { heading: 'Fraunces', body: 'Plus Jakarta Sans', vibe: 'Inclusive Heritage & Community Warmth' },
  motifs: [
    'Interlocking Circles',
    'Open Hands Silhouette',
    'Foliage Garland Wreath',
    'Bunting Banners',
    'Sunburst Medallion',
  ],
  decor: [
    'Festive cloth bunting in warm yellow and olive green overhead',
    'Communal wooden picnic tables with simple clay potted herbal centerpieces',
    'Interactive community chalkboard wall for wishes, memories, and collaborative art',
    'Eco-friendly warm paper lantern lighting for evening festivities',
  ],
  outfitNotes: [
    'Comfortable festive attire in breathable cottons, linens, and warm block prints',
    'Casual kurtas, shirts, and sundresses reflecting warm earth and community tones',
    'Comfortable footwear for moving across lawn and community gathering zones',
    'Optional color theme (e.g. "Touch of Yellow" or "Earthy Celebration")',
  ],
  playlistVibes: [
    'Upbeat world acoustic folk',
    'Acoustic guitar and percussion singalongs',
    'Local indie band favorites',
    'Warm ambient community celebration background',
  ],
}
