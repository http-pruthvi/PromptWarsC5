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

export const DEFAULT_WEDDING_PRESET: Omit<MoodboardPreset, 'matcher'> = {
  palette: [
    { name: 'Royal Crimson', hex: '#7a1926', role: 'Heritage Anchor' },
    { name: 'Antique Wedding Gold', hex: '#cda851', role: 'Gilded Glory' },
    { name: 'Soft Pearl Silk', hex: '#fbf7f0', role: 'Ceremonial Canvas' },
    { name: 'Blush Champagne', hex: '#df9c95', role: 'Romantic Nuance' },
    { name: 'Emerald Velvet', hex: '#1c4d3b', role: 'Botanical Splendour' },
  ],
  typography: { heading: 'Cormorant Garamond', body: 'Plus Jakarta Sans', vibe: 'Timeless Nuptial Heritage & Warmth' },
  motifs: [
    'Interlocking Floral Mandalas',
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
