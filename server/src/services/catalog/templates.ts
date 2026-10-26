import type { EventType } from '@soiree/shared'

export interface BudgetTpl {
  category: string
  percent: number
  note: string
}

export interface MilestoneTpl {
  label: string
  detail: string
  weeksBefore: number
}

export interface VendorTpl {
  category: string
  percent: number
  tips: string
}

export const BUDGET_TEMPLATES: Record<EventType, BudgetTpl[]> = {
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

export const TIMELINE_TEMPLATES: Record<EventType, MilestoneTpl[]> = {
  wedding: [
    {
      label: 'Set budget & guest-list draft',
      detail: 'Agree on who is paying for what and a first guest count.',
      weeksBefore: 40,
    },
    {
      label: 'Shortlist and book venue',
      detail: 'Visit 3–4 venues; lock the date before anything else.',
      weeksBefore: 36,
    },
    {
      label: 'Hire planner / key vendors',
      detail: 'Photographer, caterer and decorator book up fastest.',
      weeksBefore: 30,
    },
    {
      label: 'Finalise theme & colour palette',
      detail: 'Moodboard, decor direction and outfit palette.',
      weeksBefore: 24,
    },
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
    {
      label: 'Form core committee & roles',
      detail: 'Assign owners: programme, logistics, finance, outreach.',
      weeksBefore: 11,
    },
    {
      label: 'Secure venue & permissions',
      detail: 'Permits, fire/safety, police intimation if needed.',
      weeksBefore: 9,
    },
    { label: 'Lock programme & performers', detail: 'Confirm speakers and run-of-show.', weeksBefore: 7 },
    { label: 'Launch promotion', detail: 'Posters, WhatsApp groups, local press, social.', weeksBefore: 5 },
    { label: 'Recruit & brief volunteers', detail: 'Shifts, tees, ID cards, responsibilities.', weeksBefore: 4 },
    {
      label: 'Book sound, lights & catering',
      detail: 'Site visit with vendors; confirm power backup.',
      weeksBefore: 3,
    },
    { label: 'Registrations & headcount check', detail: 'Update food and seating numbers.', weeksBefore: 1 },
    { label: 'Dry run & day-of checklist', detail: 'Walk the venue; assign emergency contacts.', weeksBefore: 0 },
  ],
}

export const VENDOR_TEMPLATES: Record<EventType, VendorTpl[]> = {
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

export const VIBES: Array<{ keys: string[]; theme: string; palette: string; decor: string }> = [
  {
    keys: ['floral', 'garden', 'spring', 'romantic', 'blush', 'pastel'],
    theme: 'Blush Garden',
    palette: 'Blush, ivory, sage and champagne gold',
    decor: 'Hanging florals, pearl strings and soft fairy lights',
  },
  {
    keys: ['royal', 'traditional', 'regal', 'palace', 'grand'],
    theme: 'Royal Heritage',
    palette: 'Deep maroon, antique gold and cream',
    decor: 'Brass diyas, marigold canopies and embroidered drapes',
  },
  {
    keys: ['boho', 'rustic', 'earthy', 'outdoor', 'natural'],
    theme: 'Boho Rustic',
    palette: 'Terracotta, sand and olive',
    decor: 'Macramé, pampas grass and wooden signage',
  },
  {
    keys: ['modern', 'minimal', 'chic', 'elegant', 'luxury'],
    theme: 'Modern Minimal',
    palette: 'Ivory, charcoal and brushed gold',
    decor: 'Clean lines, acrylic signage and statement lighting',
  },
  {
    keys: ['fun', 'colorful', 'colourful', 'party', 'vibrant', 'retro'],
    theme: 'Colour Pop Carnival',
    palette: 'Coral, teal, mustard and magenta',
    decor: 'Balloon arches, neon signs and photo-booth props',
  },
  {
    keys: ['beach', 'sea', 'tropical', 'summer'],
    theme: 'Coastal Breeze',
    palette: 'Sky blue, coral and sand',
    decor: 'Driftwood, linen drapes and lanterns',
  },
]
export { POOLS } from './ideaPools.js'
