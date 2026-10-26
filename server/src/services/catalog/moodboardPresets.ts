import type { PaletteColor } from '@soiree/shared'

export interface MoodboardPreset {
  matcher: RegExp
  palette: PaletteColor[]
  typography: { heading: string; body: string; vibe: string }
  motifs: string[]
  decor: string[]
  outfitNotes: string[]
  playlistVibes: string[]
}

export const MOODBOARD_PRESETS: MoodboardPreset[] = [
  {
    matcher: /(royal|regal|palace|luxury|grand|opulent|heritage|maharaja|gold)/,
    palette: [
      { name: 'Warm Gilded Gold', hex: '#d4af37', role: 'Primary Metallic Accent' },
      { name: 'Deep Royal Crimson', hex: '#8b1e2a', role: 'Heritage Anchor' },
      { name: 'Ivory Raw Silk', hex: '#fdfbf7', role: 'Neutral Canvas' },
      { name: 'Peacock Jewel Teal', hex: '#004953', role: 'Secondary Contrast' },
      { name: 'Burnished Amber', hex: '#c8872b', role: 'Ambient Glow' },
    ],
    typography: { heading: 'Cormorant Garamond', body: 'Plus Jakarta Sans', vibe: 'Regal Heritage & Grandeur' },
    motifs: [
      'Mughal Floral Arches',
      'Gilded Filigree Tracing',
      'Jharokha Lattice Windows',
      'Peacock Feather Plumes',
      'Lotus Medallions',
    ],
    decor: [
      'Velvet drape backdrops in deep crimson and peacock teal with antique tassels',
      'Handcrafted brass urli bowls with floating brass diyas and fresh jasmine',
      'Cascading strings of fresh tuberose (rajnigandha) and Dutch carnations',
      'Mirrored banquet runners framed by warm amber-tinted candlelight',
    ],
    outfitNotes: [
      'Raw silk or velvet sherwanis adorned with antique gold zardozi',
      'Handcrafted jewel-toned lehengas with delicate marodi embroidery',
      'Bespoke organza stoles with scalloped gotta-patti borders',
      'Polki and heritage uncut diamond or kundan fine jewellery',
    ],
    playlistVibes: [
      'Sufi instrumental fusion',
      'Classical sitar & harp overtures',
      'Grand royal shehnai welcoming procession',
      'Acoustic orchestral Bollywood melodies',
    ],
  },
  {
    matcher: /(pastel|blush|garden|romantic|floral|soft|ethereal|spring|meadow)/,
    palette: [
      { name: 'Dusty Rose Quartz', hex: '#d89a9e', role: 'Romantic Hero' },
      { name: 'Sage Botanical', hex: '#8a9e85', role: 'Foliage Ground' },
      { name: 'Warm Alabaster', hex: '#faf7f2', role: 'Soft Canvas' },
      { name: 'Champagne Shimmer', hex: '#e2ca8d', role: 'Luminous Trim' },
      { name: 'Soft Lilac Mist', hex: '#bba7c4', role: 'Whisper Accent' },
    ],
    typography: { heading: 'Playfair Display', body: 'Outfit', vibe: 'Ethereal Romance & Botanical Poetry' },
    motifs: [
      'Pressed Botanical Sprigs',
      'Delicate Cherry Blossoms',
      'Calligraphic Script Florals',
      'Scalloped Ribbons',
      'Wildflower Trellises',
    ],
    decor: [
      'Wild asymmetrical floral arches with garden roses, hydrangeas, and sweet peas',
      'Floating fairy light canopies woven through sheer blush organza ceilings',
      'Textured ceramic bud vases with hand-plucked meadow stems along tables',
      'Linen napkin folds tied with raw silk blush ribbons and botanical name cards',
    ],
    outfitNotes: [
      'Pastel organza or chiffon sarees with delicate threadwork and sequins',
      'Soft blush and champagne tailored suits or bandhgalas with botanical pocket squares',
      'Flowing tulle gowns with three-dimensional botanical appliqués',
      'Delicate pearls and rose gold accessories',
    ],
    playlistVibes: [
      'Acoustic indie folk',
      'Gentle Parisian café jazz',
      'Live violin covers of modern love ballads',
      'Dreamy sunset ambient acoustic',
    ],
  },
  {
    matcher: /(boho|rustic|earth|autumn|sunset|warm|terracotta|desert|organic)/,
    palette: [
      { name: 'Sunbaked Terracotta', hex: '#c85a38', role: 'Earthy Lead' },
      { name: 'Mustard Amber', hex: '#d89e34', role: 'Sunlit Highlight' },
      { name: 'Warm Desert Sand', hex: '#f2eae1', role: 'Organic Base' },
      { name: 'Wild Olive Leaf', hex: '#5b6946', role: 'Botanical Balance' },
      { name: 'Deep Burnt Umber', hex: '#6d3c2a', role: 'Grounded Contrast' },
    ],
    typography: { heading: 'Cinzel', body: 'Plus Jakarta Sans', vibe: 'Wabi-Sabi Warmth & Earthy Soul' },
    motifs: [
      'Pampas Grass Fronds',
      'Hand-loomed Macramé Weaves',
      'Sunburst Clay Medallions',
      'Dried Palm Leaves',
      'Raw Terracotta Textures',
    ],
    decor: [
      'Layered vintage Turkish and jute rugs along aisles and lounge corners',
      'Low wooden communal tables with woven poufs and cushions',
      'Pampas grass chandeliers suspended over the central celebration circle',
      'Clay and ceramic taper candle holders with hand-poured beeswax tapers',
    ],
    outfitNotes: [
      'Flowing linen suits and relaxed Nehru jackets in sand and olive',
      'Earthy rust, beige, or cinnamon lehengas with artisanal embroidery',
      'Handmade leather juttis and botanical corsages',
      'Raw cut semi-precious stone jewellery and hammered brass accents',
    ],
    playlistVibes: [
      'Desert acoustic guitar',
      'Sunset electronic chillout',
      'Acoustic indie songwriter',
      'Warm world percussion grooves',
    ],
  },
  {
    matcher: /(modern|minimal|chic|sleek|editorial|contemporary|black-tie|monochrome)/,
    palette: [
      { name: 'Midnight Charcoal', hex: '#1a1a1a', role: 'Architectural Anchor' },
      { name: 'Crisp Alabaster', hex: '#ffffff', role: 'Negative Space' },
      { name: 'Brushed Titanium', hex: '#9e9e9e', role: 'Subtle Sheen' },
      { name: 'Pale Champagne Gold', hex: '#e8dcbf', role: 'Minimal Warmth' },
      { name: 'Soft Cashmere Grey', hex: '#b5aea5', role: 'Modern Midtone' },
    ],
    typography: { heading: 'Prata', body: 'Inter', vibe: 'Architectural Restraint & Modern Glamour' },
    motifs: [
      'Geometric Monoliths',
      'Architectural Lines',
      'Frosted Glass Paneling',
      'Monochrome Typography',
      'Negative Space Frames',
    ],
    decor: [
      'Clean long-stem calla lily arrangements in smoked glass vessels',
      'Ghost acrylic chairs flanking stark white monolithic banquet tables',
      'Curated gallery pin-spotting and diffused warm architectural light',
      'Matte black metal signage with understated laser-etched typography',
    ],
    outfitNotes: [
      'Bespoke architectural tuxedo or structured black bandhgala',
      'Sculptural monochrome gowns or sharp contemporary draped sarees',
      'Minimalist geometric fine jewelry in white gold or platinum',
      'Clean polished footwear with architectural lines',
    ],
    playlistVibes: [
      'Deep lounge house',
      'Minimalist cinematic piano',
      'Neo-classical strings',
      'Subtle electronic ambient pulse',
    ],
  },
  {
    matcher: /(fun|colourful|colorful|vibrant|carnival|pop|retro|bright|festival)/,
    palette: [
      { name: 'Flamingo Coral', hex: '#ff5e57', role: 'Vibrant Lead' },
      { name: 'Marigold Yellow', hex: '#ffa801', role: 'Sunny Vitality' },
      { name: 'Electric Teal', hex: '#00d2d3', role: 'Dynamic Complement' },
      { name: 'Bubblegum Fuchsia', hex: '#ef5777', role: 'Playful Pulse' },
      { name: 'Crisp Chalk White', hex: '#fdfdfd', role: 'Punchy Contrast' },
    ],
    typography: { heading: 'Rozha One', body: 'Plus Jakarta Sans', vibe: 'High-Energy Festive Maximalism' },
    motifs: ['Confetti Ribbons', 'Retro Sunburst Rays', 'Wavy Squiggles', 'Bespoke Neon Lettering', 'Festive Bunting'],
    decor: [
      'Custom neon typography photo wall framed by cascading balloons',
      'Fringed canopy umbrellas and rainbow cocktail lounge zones',
      'Interactive glitter bar and disposable camera stations on each table',
      'Colorful patterned cloth napkins and candy-striped table accents',
    ],
    outfitNotes: [
      'Playful jewel-toned prints and statement color-blocked outfits',
      'Bright footwear, vibrant dupattas, and festive enamel jewelry',
      'Fun conversational accessories and statement sunglasses',
    ],
    playlistVibes: [
      'Upbeat disco pop',
      'Groovy retro funk and soul',
      'Festival party anthems',
      'Bhangra and Bollywood club edits',
    ],
  },
]

export { DEFAULT_WEDDING_PRESET, DEFAULT_BIRTHDAY_PRESET, DEFAULT_COMMUNITY_PRESET } from './defaultMoodboardPresets.js'
