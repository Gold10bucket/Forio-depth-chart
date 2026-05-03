// roster.jsx — defines POSITIONS (static layout) and a loader that pulls
// the live roster from Supabase. Player data now lives in the cloud.

const POSITIONS = [
  { id: "ST",  label: "ST",  x: 50, y: 18, role: "FWD" },
  { id: "LW",  label: "LW",  x: 18, y: 24, role: "FWD" },
  { id: "RW",  label: "RW",  x: 82, y: 24, role: "FWD" },
  { id: "LCM", label: "LCM", x: 30, y: 46, role: "MID" },
  { id: "CM",  label: "CM",  x: 50, y: 52, role: "MID" },
  { id: "RCM", label: "RCM", x: 70, y: 46, role: "MID" },
  { id: "LB",  label: "LB",  x: 12, y: 70, role: "DEF" },
  { id: "LCB", label: "LCB", x: 36, y: 74, role: "DEF" },
  { id: "RCB", label: "RCB", x: 64, y: 74, role: "DEF" },
  { id: "RB",  label: "RB",  x: 88, y: 70, role: "DEF" },
  { id: "GK",  label: "GK",  x: 50, y: 92, role: "GK"  },
];

window.POSITIONS = POSITIONS;
// ROSTER is now populated at runtime from Supabase (see app.jsx loader).
window.ROSTER = window.ROSTER || Object.fromEntries(POSITIONS.map(p => [p.id, []]));
