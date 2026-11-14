// England v India, 2nd ODI, Lord's, 14 July 2022 — Cricsheet match 1276908 (ODC-By).
// Curated display names and short stories (≤120 chars). Stories are general career facts that never mention
// this match's events (no spoilers). Owner reviews before shipping.
export const MATCH_META = {
  id: 'eng-ind-2022-odi2',
  cricsheet: 'data/matches/eng-ind-2022-odi2/cricsheet-1276908.json',
  title: 'England v India · 2nd ODI',
  shortTitle: 'ENG v IND · 2nd ODI',
  overs: 50,
  video: {
    provider: 'youtube' as const,
    id: 'UnRMj4ZC12o',
    title: "Topley Makes History at Lord's | ODI IN FULL | England v India 2022",
    owner: 'England & Wales Cricket Board',
    url: 'https://www.youtube.com/watch?v=UnRMj4ZC12o',
  },
  teams: {
    England: { id: 'ENG', name: 'England', short: 'ENG', colour: '#e5484d' },
    India: { id: 'IND', name: 'India', short: 'IND', colour: '#4f8cff' },
  } as Record<string, { id: string; name: string; short: string; colour: string }>,
};

export const PLAYER_META: Record<string, { name: string; short: string; role: 'bat' | 'bowl' | 'all' | 'wk'; story: string }> = {
  // India
  'RG Sharma': { name: 'Rohit Sharma', short: 'Rohit', role: 'bat', story: "India's captain and opener; the only batter with three ODI double-hundreds." },
  'S Dhawan': { name: 'Shikhar Dhawan', short: 'Dhawan', role: 'bat', story: 'Left-handed opener who saves his best for ICC events; famous for the thigh-slap celebration.' },
  'V Kohli': { name: 'Virat Kohli', short: 'Kohli', role: 'bat', story: 'Run machine with over 40 ODI hundreds; chasing a target is his favourite sport.' },
  'RR Pant': { name: 'Rishabh Pant', short: 'Pant', role: 'wk', story: 'Fearless keeper-batter who plays shots nobody else would even try.' },
  'SA Yadav': { name: 'Suryakumar Yadav', short: 'Surya', role: 'bat', story: '360-degree batter who scoops and ramps the quicks for fun.' },
  'HH Pandya': { name: 'Hardik Pandya', short: 'Hardik', role: 'all', story: "Seam-bowling all-rounder and big hitter; India's finisher when it gets tight." },
  'RA Jadeja': { name: 'Ravindra Jadeja', short: 'Jadeja', role: 'all', story: 'Left-arm spinner, gun fielder, and the sword-twirling celebration after a fifty.' },
  'Mohammed Shami': { name: 'Mohammed Shami', short: 'Shami', role: 'bowl', story: 'Seamer with a beautifully upright seam; lethal with the new ball.' },
  'JJ Bumrah': { name: 'Jasprit Bumrah', short: 'Bumrah', role: 'bowl', story: "Unique slingy action and yorkers on demand; India's spearhead." },
  'YS Chahal': { name: 'Yuzvendra Chahal', short: 'Chahal', role: 'bowl', story: 'Leg-spinner and former junior chess player who loves tempting batters into a slog.' },
  'M Prasidh Krishna': { name: 'Prasidh Krishna', short: 'Prasidh', role: 'bowl', story: 'Tall fast bowler from Karnataka who hits the deck hard.' },
  // England
  'JJ Roy': { name: 'Jason Roy', short: 'Roy', role: 'bat', story: 'Explosive opener who tries to set the tone in the first over.' },
  'JM Bairstow': { name: 'Jonny Bairstow', short: 'Bairstow', role: 'bat', story: 'Powerful opener; once he is in, big hundreds tend to follow.' },
  'JE Root': { name: 'Joe Root', short: 'Root', role: 'bat', story: "England's most elegant run-scorer; makes batting look easy." },
  'BA Stokes': { name: 'Ben Stokes', short: 'Stokes', role: 'all', story: 'Big-match all-rounder and the hero of the 2019 World Cup final at this very ground.' },
  'JC Buttler': { name: 'Jos Buttler', short: 'Buttler', role: 'wk', story: "England's white-ball captain and keeper; can hit any ball anywhere." },
  'LS Livingstone': { name: 'Liam Livingstone', short: 'Livingstone', role: 'all', story: 'Six-hitting machine who bowls both off-spin and leg-spin.' },
  'MM Ali': { name: 'Moeen Ali', short: 'Moeen', role: 'all', story: 'Off-spinning all-rounder with one of the prettiest cover drives around.' },
  'DJ Willey': { name: 'David Willey', short: 'Willey', role: 'all', story: 'Left-arm swing bowler who loves a new ball and a cloudy sky.' },
  'C Overton': { name: 'Craig Overton', short: 'Overton', role: 'bowl', story: 'Tall Somerset seamer who gets awkward bounce.' },
  'BA Carse': { name: 'Brydon Carse', short: 'Carse', role: 'bowl', story: 'Skiddy, aggressive fast bowler from Durham.' },
  'RJW Topley': { name: 'Reece Topley', short: 'Topley', role: 'bowl', story: 'Very tall left-arm seamer whose career was nearly ended by repeated back injuries.' },
};
