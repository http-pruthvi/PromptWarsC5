import type { Brief, BudgetItem, BudgetRebalanceChange, BudgetRebalanceProposal, Currency, EventType, IdeaGroup, Milestone, Moodboard, PaletteColor, Plan, Vendor } from '@soiree/shared'

export const uid = () => Math.random().toString(36).slice(2, 10)

const LOCALES: Record<Currency, string> = { INR: 'en-IN', USD: 'en-US', EUR: 'de-DE' }

export function money(n: number, currency: Currency = 'INR'): string {
  return new Intl.NumberFormat(LOCALES[currency] || 'en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

export function weeksUntil(dateStr: string, from = new Date()): number {
  const d = new Date(dateStr + 'T00:00:00')
  return Math.max(0, Math.round(((d.getTime() - from.getTime()) / 86400000 / 7) * 10) / 10)
}

export function pick<T>(arr: T[], n: number): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

interface BudgetTpl { category: string; percent: number; note: string }
interface MilestoneTpl { label: string; detail: string; weeksBefore: number }
interface VendorTpl { category: string; percent: number; tips: string }

const BUDGET: Record<EventType, BudgetTpl[]> = {
  wedding: [
    { category: 'Venue & Decor', percent: 28, note: 'Booking, florals, lighting, stage' },
    { category: 'Catering', percent: 30, note: 'Per-plate cost × guests, plus service' },
    { category: 'Photography & Video', percent: 10, note: 'Pre-wedding, ceremony, film' },
    { category: 'Attire & Beauty', percent: 10, note: 'Outfits, jewellery, makeup, mehendi' },
    { category: 'Music & Entertainment', percent: 6, note: 'DJ / band, sangeet acts' },
    { category: 'Invitations & Gifts', percent: 3, note: 'Cards, favours, return gifts' },
    { category: 'Travel & Stay', percent: 5, note: 'Guest rooms, transport' },
    { category: 'Contingency', percent: 8, note: 'Always keep a buffer' },
  ],
  birthday: [
    { category: 'Venue & Setup', percent: 25, note: 'Hall / home setup, balloons, backdrop' },
    { category: 'Food & Cake', percent: 38, note: 'Menu, dessert table, cake' },
    { category: 'Entertainment', percent: 15, note: 'Host, games, magician, DJ' },
    { category: 'Photography', percent: 6, note: 'Photographer or photo booth' },
    { category: 'Invitations & Favours', percent: 6, note: 'Invites, goodie bags' },
    { category: 'Decor & Theme', percent: 5, note: 'Props, table styling' },
    { category: 'Contingency', percent: 5, note: 'Buffer for surprises' },
  ],
  community: [
    { category: 'Venue & Permits', percent: 22, note: 'Hall / ground rental, permissions, security' },
    { category: 'Food & Refreshments', percent: 28, note: 'Meals, tea & snacks, water' },
    { category: 'Sound, Light & Stage', percent: 14, note: 'PA system, mics, projector' },
    { category: 'Marketing & Printing', percent: 9, note: 'Posters, banners, social promos' },
    { category: 'Programme & Performers', percent: 12, note: 'Speakers, performers, honoraria' },
    { category: 'Volunteers & Logistics', percent: 7, note: 'Tees, ID cards, transport' },
    { category: 'Contingency', percent: 8, note: 'Weather, last-minute needs' },
  ],
}

const TIMELINE: Record<EventType, MilestoneTpl[]> = {
  wedding: [
    { label: 'Set budget & guest-list draft', detail: 'Agree on who is paying for what and a first guest count.', weeksBefore: 40 },
    { label: 'Shortlist and book venue', detail: 'Visit 3–4 venues; lock the date before anything else.', weeksBefore: 36 },
    { label: 'Hire planner / key vendors', detail: 'Photographer, caterer and decorator book up fastest.', weeksBefore: 30 },
    { label: 'Finalise theme & colour palette', detail: 'Moodboard, decor direction and outfit palette.', weeksBefore: 24 },
    { label: 'Send save-the-dates', detail: 'Especially for guests who must travel.', weeksBefore: 20 },
    { label: 'Book attire, makeup & mehendi', detail: 'Start fittings; schedule trials.', weeksBefore: 16 },
    { label: 'Menu tasting & music brief', detail: 'Finalise menu, playlist and ceremony flow.', weeksBefore: 10 },
    { label: 'Send formal invitations', detail: 'Include RSVP deadline and travel details.', weeksBefore: 8 },
    { label: 'Confirm stays & transport', detail: 'Room blocks, airport pickups, local travel.', weeksBefore: 6 },
    { label: 'Final headcount & seating', detail: 'Share final numbers with caterer and venue.', weeksBefore: 3 },
    { label: 'Final vendor confirmations', detail: 'Timelines, balances and emergency contacts.', weeksBefore: 1 },
    { label: 'Rehearsal & day-of kit', detail: 'Run-through, emergency kit, delegate roles.', weeksBefore: 0 },
  ],
  birthday: [
    { label: 'Pick date, theme & budget', detail: 'Decide the vibe and who is on the list.', weeksBefore: 8 },
    { label: 'Book venue or plan home setup', detail: 'Reserve early for weekends.', weeksBefore: 7 },
    { label: 'Send invitations', detail: 'Digital invites work well; add RSVP link.', weeksBefore: 5 },
    { label: 'Order cake & plan menu', detail: 'Check allergies and dietary needs.', weeksBefore: 4 },
    { label: 'Book entertainment & photographer', detail: 'Games, host, DJ or photo booth.', weeksBefore: 4 },
    { label: 'Order decor & favours', detail: 'Balloons, backdrop, goodie bags.', weeksBefore: 2 },
    { label: 'Confirm RSVPs & headcount', detail: 'Chase the maybes.', weeksBefore: 1 },
    { label: 'Setup & surprise checks', detail: 'Playlist, schedule and last-minute pickups.', weeksBefore: 0 },
  ],
  community: [
    { label: 'Define goals, audience & budget', detail: 'One-line purpose and success metric.', weeksBefore: 12 },
    { label: 'Form core committee & roles', detail: 'Assign owners: programme, logistics, finance, outreach.', weeksBefore: 11 },
    { label: 'Secure venue & permissions', detail: 'Permits, fire/safety, police intimation if needed.', weeksBefore: 9 },
    { label: 'Lock programme & performers', detail: 'Confirm speakers and run-of-show.', weeksBefore: 7 },
    { label: 'Launch promotion', detail: 'Posters, WhatsApp groups, local press, social.', weeksBefore: 5 },
    { label: 'Recruit & brief volunteers', detail: 'Shifts, tees, ID cards, responsibilities.', weeksBefore: 4 },
    { label: 'Book sound, lights & catering', detail: 'Site visit with vendors; confirm power backup.', weeksBefore: 3 },
    { label: 'Registrations & headcount check', detail: 'Update food and seating numbers.', weeksBefore: 1 },
    { label: 'Dry run & day-of checklist', detail: 'Walk the venue; assign emergency contacts.', weeksBefore: 0 },
  ],
}

const VENDORS: Record<EventType, VendorTpl[]> = {
  wedding: [
    { category: 'Venue', percent: 18, tips: 'Ask about exclusivity, power backup and rain plan.' },
    { category: 'Caterer', percent: 30, tips: 'Do a tasting; confirm live counters and staff ratio.' },
    { category: 'Decorator / Florist', percent: 10, tips: 'Request 3D mockups and a mandap sample.' },
    { category: 'Photographer & Videographer', percent: 10, tips: 'Review full albums, not just highlights.' },
    { category: 'Makeup & Mehendi Artist', percent: 4, tips: 'Book a trial; confirm travel and timing.' },
    { category: 'DJ / Band', percent: 6, tips: 'Share a do-play and do-not-play list.' },
    { category: 'Wedding Planner', percent: 6, tips: 'Check references for similar-sized events.' },
    { category: 'Transport & Stay', percent: 6, tips: 'Negotiate group room rates and shuttle slots.' },
    { category: 'Invitations & Gifts', percent: 3, tips: 'Order 10% extra cards.' },
  ],
  birthday: [
    { category: 'Venue / Party Hall', percent: 20, tips: 'Confirm hours including setup and cleanup.' },
    { category: 'Caterer / Bakery', percent: 38, tips: 'Order cake a week early; confirm allergens.' },
    { category: 'Decorator', percent: 10, tips: 'Share the theme and colour references.' },
    { category: 'Entertainer / Host', percent: 12, tips: 'Match age group; ask for a short demo reel.' },
    { category: 'Photographer', percent: 6, tips: 'Brief them on must-have shots.' },
    { category: 'Return Gifts', percent: 6, tips: 'Order a few spares.' },
  ],
  community: [
    { category: 'Venue & Permissions', percent: 22, tips: 'Get permits in writing and confirm capacity.' },
    { category: 'Caterer', percent: 28, tips: 'Plan for 10% over headcount.' },
    { category: 'Sound & Lighting', percent: 14, tips: 'Do a soundcheck the day before.' },
    { category: 'Printing & Banners', percent: 9, tips: 'Proofread twice; allow 5 days for printing.' },
    { category: 'Photographer / Media', percent: 6, tips: 'Capture sponsors and speakers.' },
    { category: 'Security & First Aid', percent: 6, tips: 'Keep a marked first-aid desk.' },
    { category: 'Transport', percent: 5, tips: 'Arrange for elders and performers.' },
  ],
}

const VIBES: Array<{ keys: string[]; theme: string; palette: string; decor: string }> = [
  { keys: ['floral', 'garden', 'spring', 'romantic', 'blush', 'pastel'], theme: 'Blush Garden', palette: 'Blush, ivory, sage and champagne gold', decor: 'Hanging florals, pearl strings and soft fairy lights' },
  { keys: ['royal', 'traditional', 'regal', 'palace', 'grand'], theme: 'Royal Heritage', palette: 'Deep maroon, antique gold and cream', decor: 'Brass diyas, marigold canopies and embroidered drapes' },
  { keys: ['boho', 'rustic', 'earthy', 'outdoor', 'natural'], theme: 'Boho Rustic', palette: 'Terracotta, sand and olive', decor: 'Macramé, pampas grass and wooden signage' },
  { keys: ['modern', 'minimal', 'chic', 'elegant', 'luxury'], theme: 'Modern Minimal', palette: 'Ivory, charcoal and brushed gold', decor: 'Clean lines, acrylic signage and statement lighting' },
  { keys: ['fun', 'colorful', 'colourful', 'party', 'vibrant', 'retro'], theme: 'Colour Pop Carnival', palette: 'Coral, teal, mustard and magenta', decor: 'Balloon arches, neon signs and photo-booth props' },
  { keys: ['beach', 'sea', 'tropical', 'summer'], theme: 'Coastal Breeze', palette: 'Sky blue, coral and sand', decor: 'Driftwood, linen drapes and lanterns' },
]

const POOLS: Record<EventType, Record<string, string[]>> = {
  wedding: {
    'Ceremony moments': ['Flower-petal shower exit', 'Handwritten vows exchanged before the ceremony', 'Family blessing circle', 'Live string-quartet processional', 'Welcome mocktail bar with signature drinks', 'Memory table honouring loved ones'],
    'Menu & drinks': ['Regional thali with live chaat counters', 'Midnight snack station (pav bhaji, kulhad chai)', 'Signature "his & hers" mocktails', 'Dessert table with mini jalebis & rasmalai shots', 'South-Indian filter-coffee cart', 'Farm-to-table tasting menu'],
    'Entertainment': ['Choreographed sangeet family performances', 'Live dhol & band baraat entry', 'Caricature artist during cocktail hour', 'Photo booth with instant prints', 'Acoustic sunset set', 'Fireworks or cold-pyro finale'],
    'Guest experience': ['Custom welcome hampers with local treats', 'QR-code album for guest photo uploads', 'Shuttle schedule card in each room', 'Kids’ activity corner with a sitter', 'Wedding-day WhatsApp group for updates', 'Thank-you plantable seed favours'],
  },
  birthday: {
    'Activities': ['Treasure hunt with riddle clues', 'DIY cupcake decorating station', 'Karaoke face-off', 'Backyard cinema under fairy lights', 'Mini Olympics with prizes', 'Memory jar — guests write a wish'],
    'Menu & cake': ['Build-your-own pizza bar', 'Dessert grazing table', 'Signature mocktails', 'Smash cake for the little ones', 'Chaat & street-food counters', 'Theme-matched cupcake tower'],
    'Surprise ideas': ['Video montage from friends and family', 'Midnight countdown surprise', 'Flash-mob entrance', 'Letters from loved ones, opened on the day', 'Hidden balloon-pop with confetti', 'Custom playlist of their life songs'],
    'Favours': ['Personalised cookie boxes', 'Mini plant saplings', 'Polaroid snapshots', 'Handwritten thank-you notes', 'Seed-paper bookmarks', 'Custom sticker sheets'],
  },
  community: {
    'Engagement': ['Live polls and Q&A on a shared screen', 'Local artisan pop-up market', 'Community story wall', 'Open-mic hour for local talent', 'Kids’ art and storytelling corner', 'Photo-booth with event hashtag'],
    'Programme flow': ['Opening invocation and welcome note', 'Keynote of 15 minutes max', 'Panel with local changemakers', 'Cultural performance block', 'Felicitation of volunteers', 'Closing group photograph'],
    'Sustainability': ['Steel-plate and cup deposit scheme', 'Segregated waste stations', 'Plantable seed-paper badges', 'Digital programme via QR code', 'Local caterer and sourcing', 'Donate leftover food to a shelter'],
    'Outreach': ['WhatsApp broadcast with RSVP link', 'Partner with local schools and RWAs', 'Influencer from the neighbourhood as ambassador', 'Reel-style teaser video', 'Poster at community notice boards', 'Early-bird volunteer sign-up'],
  },
}

function matchVibe(vibe: string) {
  const v = (vibe || '').toLowerCase()
  return VIBES.find((x) => x.keys.some((k) => v.includes(k))) ?? VIBES[0]
}

export function localIdeas(brief: Brief): IdeaGroup[] {
  const vibe = matchVibe(brief.vibe)
  const guests = brief.guests
  const head: IdeaGroup = {
    title: 'Theme & look',
    items: [
      `Theme: ${vibe.theme}`,
      `Palette: ${vibe.palette}`,
      `Decor: ${vibe.decor}`,
      guests > 150 ? 'Zone the venue (lounge, dining, stage) to avoid crowding' : 'Keep seating intimate with long communal tables',
    ],
  }
  const pool = POOLS[brief.type] || POOLS.wedding
  const groups = Object.entries(pool).map(([title, items]) => ({ title, items: pick(items, 4) }))
  return [head, ...groups]
}

export function normalizePercents<T extends { percent: number }>(rows: T[]): T[] {
  const total = rows.reduce((s, r) => s + Math.max(0, r.percent), 0) || 1
  return rows.map((r) => ({ ...r, percent: (Math.max(0, r.percent) / total) * 100 }))
}

export function buildBudget(brief: Brief, tpl: BudgetTpl[]): BudgetItem[] {
  const rows = normalizePercents(tpl)
  let used = 0
  return rows.map((r, i) => {
    const allocated = i === rows.length - 1 ? brief.budget - used : Math.round(((brief.budget * r.percent) / 100) / 100) * 100
    used += allocated
    return { id: uid(), category: r.category, allocated: Math.max(0, allocated), spent: 0, note: r.note }
  })
}

export function buildTimeline(brief: Brief, tpl: MilestoneTpl[]): Milestone[] {
  const available = Math.max(1, weeksUntil(brief.date))
  const maxWeeks = Math.max(...tpl.map((t) => t.weeksBefore), 1)
  const scale = available < maxWeeks ? available / maxWeeks : 1
  return tpl
    .map((t) => ({
      id: uid(),
      label: t.label,
      detail: t.detail,
      weeksBefore: Math.round(t.weeksBefore * scale * 10) / 10,
      done: false,
    }))
    .sort((a, b) => b.weeksBefore - a.weeksBefore)
}

export function buildVendors(brief: Brief, tpl: VendorTpl[]): Vendor[] {
  const rows = normalizePercents(tpl)
  return rows.map((r) => ({
    id: uid(),
    category: r.category,
    name: '',
    status: 'todo' as const,
    estimate: Math.round((brief.budget * r.percent) / 100 / 500) * 500,
    tips: r.tips,
  }))
}

export function generateLocalPlan(brief: Brief): Plan {
  const vibe = matchVibe(brief.vibe)
  const weeks = weeksUntil(brief.date)
  const perHead = brief.guests > 0 ? brief.budget / brief.guests : 0
  const label = { wedding: 'wedding', birthday: 'birthday celebration', community: 'community event' }[brief.type] || 'celebration'
  const where = brief.city ? ` in ${brief.city}` : ''
  const summary =
    `${brief.title || 'Your ' + label} is a ${label}${where} for about ${brief.guests} guests, ${Math.round(weeks)} weeks away. ` +
    `At roughly ${money(perHead, brief.currency)} per guest, we suggest a "${vibe.theme}" direction. ` +
    (weeks < 8 ? 'The timeline is tight, so we compressed the milestones and put venue and catering first.' : 'You have a healthy runway; book the big-ticket vendors first.')
  return {
    id: uid(),
    createdAt: Date.now(),
    brief,
    summary,
    budget: buildBudget(brief, BUDGET[brief.type] || BUDGET.wedding),
    timeline: buildTimeline(brief, TIMELINE[brief.type] || TIMELINE.wedding),
    vendors: buildVendors(brief, VENDORS[brief.type] || VENDORS.wedding),
    ideas: localIdeas(brief),
    generatedBy: 'local',
  }
}

export function localAnswer(plan: Plan, q: string): string {
  const b = plan.brief
  const s = q.toLowerCase()
  const spent = plan.budget.reduce((t, x) => t + x.spent, 0)
  if (/(over|save|cut|reduce|cheaper|budget)/.test(s)) {
    const big = [...plan.budget].sort((a, c) => c.allocated - a.allocated).slice(0, 2)
    return (
      `You've spent ${money(spent, b.currency)} of ${money(b.budget, b.currency)}. The biggest levers are ${big.map((x) => x.category).join(' and ')}. ` +
      `Try trimming guest count by 5–10%, choosing a weekday or off-peak slot, and negotiating bundled vendor packages. Keep the contingency row untouched.`
    )
  }
  if (/(when|deadline|timeline|next|todo|to-do)/.test(s)) {
    const next = plan.timeline.filter((t) => !t.done).slice(0, 3)
    return next.length
      ? `Your next steps: ${next.map((t) => `“${t.label}”`).join(', ')}. Tackle them in that order.`
      : 'All milestones are done — enjoy the day!'
  }
  if (/(vendor|book|caterer|photographer|decor)/.test(s)) {
    const todo = plan.vendors.filter((v) => v.status === 'todo').map((v) => v.category)
    return todo.length
      ? `Still to contact: ${todo.join(', ')}. Get at least 3 quotes each and ask for references from similar-sized events.`
      : 'Every vendor is at least contacted. Next, get written contracts with payment schedules.'
  }
  const ideas = localIdeas(b)
  const g = ideas[Math.min(1, ideas.length - 1)]
  return `Here are a few ideas for “${g.title}”: ${g.items.slice(0, 3).join('; ')}.`
}

export function generateOfflineMoodboard(brief: Brief, extra?: string): Moodboard {
  const text = `${brief.vibe || ''} ${brief.notes || ''} ${brief.title || ''} ${extra || ''}`.toLowerCase()
  const type = brief.type

  let palette: PaletteColor[]
  let typography: { heading: string; body: string; vibe: string }
  let motifs: string[]
  let decor: string[]
  let outfitNotes: string[]
  let playlistVibes: string[]

  if (/(royal|regal|palace|luxury|grand|opulent|heritage|maharaja|gold)/.test(text)) {
    palette = [
      { name: 'Warm Gilded Gold', hex: '#d4af37', role: 'Primary Metallic Accent' },
      { name: 'Deep Royal Crimson', hex: '#8b1e2a', role: 'Heritage Anchor' },
      { name: 'Ivory Raw Silk', hex: '#fdfbf7', role: 'Neutral Canvas' },
      { name: 'Peacock Jewel Teal', hex: '#004953', role: 'Secondary Contrast' },
      { name: 'Burnished Amber', hex: '#c8872b', role: 'Ambient Glow' },
    ]
    typography = {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
      vibe: 'Regal Heritage & Grandeur',
    }
    motifs = ['Mughal Floral Arches', 'Gilded Filigree Tracing', 'Jharokha Lattice Windows', 'Peacock Feather Plumes', 'Lotus Medallions']
    decor = [
      'Velvet drape backdrops in deep crimson and peacock teal with antique tassels',
      'Handcrafted brass urli bowls with floating brass diyas and fresh jasmine',
      'Cascading strings of fresh tuberose (rajnigandha) and Dutch carnations',
      'Mirrored banquet runners framed by warm amber-tinted candlelight',
    ]
    outfitNotes = [
      'Raw silk or velvet sherwanis adorned with antique gold zardozi',
      'Handcrafted jewel-toned lehengas with delicate marodi embroidery',
      'Bespoke organza stoles with scalloped gotta-patti borders',
      'Polki and heritage uncut diamond or kundan fine jewellery',
    ]
    playlistVibes = ['Sufi instrumental fusion', 'Classical sitar & harp overtures', 'Grand royal shehnai welcoming procession', 'Acoustic orchestral Bollywood melodies']
  } else if (/(pastel|blush|garden|romantic|floral|soft|ethereal|spring|meadow)/.test(text)) {
    palette = [
      { name: 'Dusty Rose Quartz', hex: '#d89a9e', role: 'Romantic Hero' },
      { name: 'Sage Botanical', hex: '#8a9e85', role: 'Foliage Ground' },
      { name: 'Warm Alabaster', hex: '#faf7f2', role: 'Soft Canvas' },
      { name: 'Champagne Shimmer', hex: '#e2ca8d', role: 'Luminous Trim' },
      { name: 'Soft Lilac Mist', hex: '#bba7c4', role: 'Whisper Accent' },
    ]
    typography = {
      heading: 'Playfair Display',
      body: 'Outfit',
      vibe: 'Ethereal Romance & Botanical Poetry',
    }
    motifs = ['Pressed Botanical Sprigs', 'Delicate Cherry Blossoms', 'Calligraphic Script Florals', 'Scalloped Ribbons', 'Wildflower Trellises']
    decor = [
      'Wild asymmetrical floral arches with garden roses, hydrangeas, and sweet peas',
      'Floating fairy light canopies woven through sheer blush organza ceilings',
      'Textured ceramic bud vases with hand-plucked meadow stems along tables',
      'Linen napkin folds tied with raw silk blush ribbons and botanical name cards',
    ]
    outfitNotes = [
      'Pastel organza or chiffon sarees with delicate threadwork and sequins',
      'Soft blush and champagne tailored suits or bandhgalas with botanical pocket squares',
      'Flowing tulle gowns with three-dimensional botanical appliqués',
      'Delicate pearls and rose gold accessories',
    ]
    playlistVibes = ['Acoustic indie folk', 'Gentle Parisian café jazz', 'Live violin covers of modern love ballads', 'Dreamy sunset ambient acoustic']
  } else if (/(boho|rustic|earth|autumn|sunset|warm|terracotta|desert|organic)/.test(text)) {
    palette = [
      { name: 'Sunbaked Terracotta', hex: '#c85a38', role: 'Earthy Lead' },
      { name: 'Mustard Amber', hex: '#d89e34', role: 'Sunlit Highlight' },
      { name: 'Warm Desert Sand', hex: '#f2eae1', role: 'Organic Base' },
      { name: 'Wild Olive Leaf', hex: '#5b6946', role: 'Botanical Balance' },
      { name: 'Deep Burnt Umber', hex: '#6d3c2a', role: 'Grounded Contrast' },
    ]
    typography = {
      heading: 'Cinzel',
      body: 'Plus Jakarta Sans',
      vibe: 'Wabi-Sabi Warmth & Earthy Soul',
    }
    motifs = ['Pampas Grass Fronds', 'Geometric Macramé Knots', 'Celestial Crescent Moons', 'Sunburst Ray Inlays', 'Earthen Clay Pottery']
    decor = [
      'Towering plumes of pampas grass and dried floral clouds suspended from wood beams',
      'Low wooden communal seating with kilim rugs and textured jute floor cushions',
      'Handmade terracotta dinnerware paired with smoked amber glass tumblers',
      'Woven rattan lanterns casting geometric shadows across outdoor dining tables',
    ]
    outfitNotes = [
      'Textured linen and raw khadi ensembles in neutral oat and earth tones',
      'Bohemian embroidered kurtas with wooden toggles or rustic leather sandals',
      'Earthy rust or ochre slip dresses paired with antique brass arm cuffs',
      'Dried flower hairpins and oxidized brass statement pieces',
    ]
    playlistVibes = ['Soulful indie acoustic', 'Sunset desert deep house ambient beats', 'Warm Spanish guitar melodies', 'Soul-stirring campfire acoustic jams']
  } else if (/(modern|minimal|sleek|chic|black tie|monochrome|contemporary)/.test(text)) {
    palette = [
      { name: 'Obsidian Black', hex: '#161514', role: 'Architectural Anchor' },
      { name: 'Brushed Champagne Gold', hex: '#c5a059', role: 'Gilded Accent' },
      { name: 'Crisp Linen White', hex: '#faf9f6', role: 'High-Key Canvas' },
      { name: 'Smoked Graphite', hex: '#484542', role: 'Structural Shadow' },
      { name: 'Soft Cashmere Grey', hex: '#b5aea5', role: 'Modern Midtone' },
    ]
    typography = {
      heading: 'Prata',
      body: 'Inter',
      vibe: 'Architectural Restraint & Modern Glamour',
    }
    motifs = ['Clean Linear Geometry', 'Sculptural Arc Silhouettes', 'Minimalist Typography Monograms', 'Negative Space Framing', 'Fluted Glass Fluting']
    decor = [
      'High-gloss black lacquer or brushed matte gold cocktail tables with zero clutter',
      'Architectural mono-floral installations (single-variety calla lilies in sculptural ceramic)',
      'Sharp architectural pin-spot lighting creating dramatic shadows',
      'Sleek acrylic transparent seating with custom linen monograms',
    ]
    outfitNotes = [
      'Impeccably tailored bespoke midnight black tuxedos with satin peak lapels',
      'Sculptural monochrome floor-length gowns with clean architectural cutouts',
      'Minimalist polished platinum or white gold cufflinks and fine jewellery',
      'Sleek modern hair styling and understated neutral makeup',
    ]
    playlistVibes = ['Contemporary neo-classical strings', 'Lounge deep house and downtempo chic', 'Sophisticated jazz trios', 'French electro-lounge grooves']
  } else if (/(neon|carnival|festive|bollywood|vibrant|colourful|colorful|joyful|party)/.test(text)) {
    palette = [
      { name: 'Vibrant Saffron', hex: '#ff9933', role: 'Electric Spark' },
      { name: 'Rani Hot Pink', hex: '#d6226a', role: 'Joyous Focal' },
      { name: 'Marigold Sunshine', hex: '#fdb813', role: 'Golden Energy' },
      { name: 'Peacock Turquoise', hex: '#138888', role: 'Playful Depth' },
      { name: 'Crisp Chalk White', hex: '#fdfdfd', role: 'Punchy Contrast' },
    ]
    typography = {
      heading: 'Rozha One',
      body: 'Plus Jakarta Sans',
      vibe: 'High-Energy Festive Maximalism',
    }
    motifs = ['Marigold Toran Swags', 'Kaleidoscopic Geometric Mandalas', 'Neon Script Signs', 'Kite Silhouettes', 'Bangle Pyramids']
    decor = [
      'Colour-blocked canopy tents with hot pink and tangerine silk ceilings',
      'Overhead marigold curtain waterfalls and suspended brass birdcages',
      'Custom neon sign photo backdrops with playful celebratory catchphrases',
      'Artisan cocktail stations with edible flower garnishes and festive signage',
    ]
    outfitNotes = [
      'Colour-blocked mirror-work lehengas and kurtas bursting with bright hues',
      'Vibrant printed Nehru jackets over crisp raw silk kurtas',
      'Stackable lac bangles, oversized jhumkas, and playful sunglasses for day events',
      'Festive juttis embroidered with colorful threads and sequins',
    ]
    playlistVibes = ['High-energy Bollywood brass band', 'Bhangra and dhol live fusion', 'Tropical celebratory pop remakes', 'Upbeat retro disco party classics']
  } else if (type === 'wedding') {
    palette = [
      { name: 'Royal Crimson', hex: '#7a1926', role: 'Heritage Anchor' },
      { name: 'Antique Wedding Gold', hex: '#cda851', role: 'Gilded Glory' },
      { name: 'Soft Pearl Silk', hex: '#fbf7f0', role: 'Ceremonial Canvas' },
      { name: 'Blush Champagne', hex: '#df9c95', role: 'Romantic Nuance' },
      { name: 'Emerald Velvet', hex: '#1c4d3b', role: 'Botanical Splendour' },
    ]
    typography = {
      heading: 'Cormorant Garamond',
      body: 'Plus Jakarta Sans',
      vibe: 'Timeless Nuptial Heritage & Warmth',
    }
    motifs = ['Interlocking Floral Mandalas', 'Gilded Paisleys', 'Lotus Blossom Crests', 'Vintage Chandelier Drops', 'Sacred Geometric Borders']
    decor = [
      'A circular mandap or ceremony gazebo wrapped in white rajnigandha and red roses',
      'Brass urli vessels filled with fragrant marigold heads and floating scented tea lights',
      'Warm fairy light canopies over banquet tables dressed in rich silk runners',
      'Personalized welcome mirrors with calligraphed couple names in gilded script',
    ]
    outfitNotes = [
      'Classic red, vermilion, or pastel tissue bridal lehenga with intricate dabka work',
      'Tailored ivory or raw silk groom sherwani with antique gold buttons and safa',
      'Coordinated pastel ensembles for close family and wedding party',
      'Fine Polki, uncut diamond, or heirloom emerald jewelry',
    ]
    playlistVibes = ['Ceremonial sitar and shehnai melodies', 'Slow acoustic love ballads', 'Sangeet dance-floor anthems', 'Orchestral processional arrangements']
  } else if (type === 'birthday') {
    palette = [
      { name: 'Midnight Navy', hex: '#1c2841', role: 'Celebratory Foundation' },
      { name: 'Rose Gold Spark', hex: '#b76e79', role: 'Glamour Focus' },
      { name: 'Champagne Shimmer', hex: '#e8d39f', role: 'Luminous Glow' },
      { name: 'Warm Cream Silk', hex: '#faf6f0', role: 'Clean Background' },
      { name: 'Plum Berry Velvet', hex: '#4a1e35', role: 'Rich Counterpoint' },
    ]
    typography = {
      heading: 'Playfair Display',
      body: 'Outfit',
      vibe: 'Effortless Modern Milestone Glamour',
    }
    motifs = ['Constellation Sparkles', 'Geometric Balloon Arches', 'Art Deco Radial Arcs', 'Ribbon Confetti', 'Champagne Coupe Silhouettes']
    decor = [
      'Bespoke multi-toned balloon and floral garland backdrop with customized neon milestone number',
      'Sleek acrylic dessert plinths with a centerpiece tiered designer cake',
      'Warm ambient pin lighting with flickering votives on every high-top table',
      'Interactive polaroid guestbook station with metallic pens and gold washi tape',
    ]
    outfitNotes = [
      'Sequined or satin cocktail dresses in jewel tones or shimmering rose gold',
      'Sharp dark blazer over open-collar tailored shirt with pocket square',
      'Celebratory signature accessory (statement earrings, metallic watch, or sleek heels)',
      'Smart casual chic dress code for guests with touch of sparkle',
    ]
    playlistVibes = ['Soulful modern funk and disco revival', 'Top 40 acoustic lounge covers', 'Upbeat milestone party anthems', 'Warm cocktail hour jazz']
  } else {
    palette = [
      { name: 'Heritage Indigo', hex: '#263b5e', role: 'Community Foundation' },
      { name: 'Sunlit Ochre', hex: '#e29b38', role: 'Warm Gathering Spark' },
      { name: 'Natural Khadi', hex: '#f5f1e8', role: 'Warm Canvas' },
      { name: 'Terracotta Earth', hex: '#a64b38', role: 'Friendly Energy' },
      { name: 'Forest Evergreen', hex: '#2b5247', role: 'Harmonious Growth' },
    ]
    typography = {
      heading: 'Fraunces',
      body: 'Inter',
      vibe: 'Warm Civic Fellowship & Inclusivity',
    }
    motifs = ['Interlocking Ring Circles', 'Sunburst Community Rays', 'Botanical Leaf Sprigs', 'Festive Bunting Garlands', 'Hands in Unity Crests']
    decor = [
      'Vibrant fabric bunting and festive canopy overhead banners greeting guests',
      'Communal wooden picnic tables with simple clay potted herbal centerpieces',
      'Interactive community chalkboard wall for wishes, memories, and collaborative art',
      'Eco-friendly warm paper lantern lighting for evening festivities',
    ]
    outfitNotes = [
      'Comfortable festive attire in breathable cottons, linens, and warm block prints',
      'Casual kurtas, shirts, and sundresses reflecting warm earth and community tones',
      'Comfortable footwear for moving across lawn and community gathering zones',
      'Optional color theme (e.g. "Touch of Yellow" or "Earthy Celebration")',
    ]
    playlistVibes = ['Upbeat world acoustic folk', 'Acoustic guitar and percussion singalongs', 'Local indie band favorites', 'Warm ambient community celebration background']
  }

  return {
    palette,
    typography,
    motifs,
    decor,
    outfitNotes,
    playlistVibes,
  }
}

export function generateOfflineBudgetRebalance(brief: Brief, budget: BudgetItem[]): BudgetRebalanceProposal {
  const totalBudget = brief.budget
  const cur = brief.currency

  // Identify contingency items
  const isContingency = (cat: string) => cat.toLowerCase().includes('contingency')

  // Calculate overspent deficit and available headroom across non-contingency items
  let totalDeficit = 0
  let totalHeadroom = 0

  const items = budget.map((b) => {
    const contingency = isContingency(b.category)
    const spent = b.spent || 0
    const allocated = b.allocated || 0
    const overspend = Math.max(0, spent - allocated)
    const headroom = contingency ? 0 : Math.max(0, allocated - spent)
    if (!contingency) {
      totalDeficit += overspend
      totalHeadroom += headroom
    }
    return {
      itemId: b.id,
      category: b.category,
      from: allocated,
      spent,
      contingency,
      overspend,
      headroom,
      to: allocated,
      reason: '',
    }
  })

  // Rebalance allocations
  if (totalDeficit > 0 && totalHeadroom > 0) {
    // Step 1: For overspent items, increase allocation to at least match spent
    for (const item of items) {
      if (!item.contingency && item.overspend > 0) {
        item.to = item.spent
      }
    }

    // Step 2: Deduct proportionally from items with headroom
    let remainingDeficit = totalDeficit
    const headroomItems = items.filter((i) => !i.contingency && i.headroom > 0)

    for (let idx = 0; idx < headroomItems.length; idx++) {
      const item = headroomItems[idx]
      let share: number
      if (idx === headroomItems.length - 1) {
        share = remainingDeficit
      } else {
        share = Math.min(item.headroom, Math.round(totalDeficit * (item.headroom / totalHeadroom)))
      }
      // Ensure we don't reduce below spent
      share = Math.min(share, item.from - item.spent)
      item.to = Math.max(item.spent, item.from - share)
      remainingDeficit -= (item.from - item.to)
    }
  }

  // Ensure contingency stays strictly untouched
  for (const item of items) {
    if (item.contingency) {
      item.to = item.from
      item.reason = 'Contingency reserve remains untouched as a dedicated emergency cushion.'
    }
  }

  // Step 3: Exact sum adjustment to match brief.budget
  let sumTo = items.reduce((s, i) => s + i.to, 0)
  const diff = totalBudget - sumTo

  if (diff !== 0) {
    // Find non-contingency item with greatest headroom / allocation to absorb difference
    const adjustable = items
      .filter((i) => !i.contingency && i.to + diff >= i.spent)
      .sort((a, b) => (b.to - b.spent) - (a.to - a.spent))

    if (adjustable.length > 0) {
      adjustable[0].to += diff
    } else {
      for (const item of items) {
        if (!item.contingency && item.to + diff >= item.spent) {
          item.to += diff
          break
        }
      }
    }
  }

  // Step 4: Populate user-facing rationale reasons
  for (const item of items) {
    if (item.contingency) continue
    if (item.to > item.from) {
      item.reason = `Increased allocation by ${money(item.to - item.from, cur)} to cover actual expenditures (${money(item.spent, cur)} spent).`
    } else if (item.to < item.from) {
      item.reason = `Reallocated ${money(item.from - item.to, cur)} of uncommitted headroom while maintaining a ${money(item.to - item.spent, cur)} working buffer.`
    } else {
      item.reason = `Preserved planned allocation of ${money(item.to, cur)} to match current milestones.`
    }
  }

  const changes: BudgetRebalanceChange[] = items.map((i) => ({
    itemId: i.itemId,
    category: i.category,
    from: i.from,
    to: i.to,
    reason: i.reason,
  }))

  const summary = totalDeficit > 0
    ? `Rebalanced budget across categories to absorb ${money(totalDeficit, cur)} in overspends from actual bookings, protecting your contingency reserve and ensuring every category covers its verified spending.`
    : `All celebration categories are currently within their target allocations. Buffer headroom has been balanced to preserve financial security.`

  return { changes, summary }
}

export const templates = { BUDGET, TIMELINE, VENDORS }

