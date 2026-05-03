// Supabase client — wires the depth chart to the shared cloud database.
// Loaded as a global from the CDN; exposes window.SB with everything the app needs.

(function () {
  const SUPABASE_URL  = "https://hqkpxiabebrresucxiay.supabase.co";
  const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhxa3B4aWFiZWJycmVzdWN4aWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzE1NTAsImV4cCI6MjA5MzE0NzU1MH0.xMFL9RlZyUpDIsFifRrwGYooYyJ-vTWYMkXhgOg81Ok";

  if (!window.supabase) {
    console.error("[supabase] CDN script not loaded — include supabase-js before this file.");
    return;
  }
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    realtime: { params: { eventsPerSecond: 5 } },
  });

  const POSITION_KEYS = ["GK","RB","RCB","LCB","LB","RCM","CM","LCM","RW","ST","LW"];

  // ---- queries ---------------------------------------------------------
  async function fetchAll() {
    const { data, error } = await client
      .from("players")
      .select("id,number,name,birth_year,position,depth_index")
      .order("position", { ascending: true })
      .order("depth_index", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  // Group flat rows into the {GK:[...], RB:[...], ...} shape the UI uses.
  function groupRoster(rows) {
    const out = Object.fromEntries(POSITION_KEYS.map(k => [k, []]));
    for (const r of rows) {
      if (!out[r.position]) out[r.position] = [];
      out[r.position].push({
        id: r.id,
        n: r.number,
        name: r.name,
        birthYear: r.birth_year,
        depthIndex: r.depth_index,
      });
    }
    for (const k of Object.keys(out)) {
      out[k].sort((a, b) => a.depthIndex - b.depthIndex);
    }
    return out;
  }

  // ---- mutations -------------------------------------------------------
  async function addPlayer({ number, name, birthYear, position }) {
    // New player goes to the end of its position's depth list.
    const { data: existing } = await client
      .from("players")
      .select("depth_index")
      .eq("position", position)
      .order("depth_index", { ascending: false })
      .limit(1);
    const next = existing && existing.length ? (existing[0].depth_index + 1) : 0;
    const { error } = await client.from("players").insert({
      number, name, birth_year: birthYear, position, depth_index: next,
    });
    if (error) throw error;
  }

  async function updatePlayer(id, patch) {
    const row = {};
    if ("number"     in patch) row.number     = patch.number;
    if ("name"       in patch) row.name       = patch.name;
    if ("birthYear"  in patch) row.birth_year = patch.birthYear;
    if ("position"   in patch) row.position   = patch.position;
    if ("depthIndex" in patch) row.depth_index = patch.depthIndex;
    const { error } = await client.from("players").update(row).eq("id", id);
    if (error) throw error;
  }

  async function deletePlayer(id) {
    const { error } = await client.from("players").delete().eq("id", id);
    if (error) throw error;
  }

  // Promote a player to starter within their position by reshuffling depth_index.
  // Other players slide down. Single round-trip via upsert.
  async function setStarter(position, playerId) {
    const { data: rows, error } = await client
      .from("players")
      .select("id,depth_index")
      .eq("position", position)
      .order("depth_index", { ascending: true });
    if (error) throw error;
    if (!rows || rows.length === 0) return;
    const starter = rows.find(r => r.id === playerId);
    if (!starter) return;
    const others = rows.filter(r => r.id !== playerId);
    const updates = [
      { id: starter.id, depth_index: 0 },
      ...others.map((r, i) => ({ id: r.id, depth_index: i + 1 })),
    ];
    // Use upsert for one batch; only depth_index changes.
    for (const u of updates) {
      const { error: e2 } = await client
        .from("players")
        .update({ depth_index: u.depth_index })
        .eq("id", u.id);
      if (e2) throw e2;
    }
  }

  // Move a player to a different position; lands at the bottom of the new list.
  async function movePlayer(playerId, newPosition) {
    const { data: existing } = await client
      .from("players")
      .select("depth_index")
      .eq("position", newPosition)
      .order("depth_index", { ascending: false })
      .limit(1);
    const next = existing && existing.length ? (existing[0].depth_index + 1) : 0;
    const { error } = await client
      .from("players")
      .update({ position: newPosition, depth_index: next })
      .eq("id", playerId);
    if (error) throw error;
  }

  // ---- prospects -------------------------------------------------------
  // Map CSV "Categoria" → pitch position key (suggestion only; user can override).
  const CATEGORY_TO_POSITION = {
    "Terzino sinistro":            "LB",
    "Terzino destro":              "RB",
    "Difensore centrale mancino":  "LCB",
    "Difensore centrale destro":   "RCB",
    "Play":                        "CM",
    "Mezzala":                     "RCM",
    "Trequartista":                "CM",
    "Ala destra":                  "RW",
    "Ala sinistra":                "LW",
    "Punta centrale":              "ST",
    "Portiere":                    "GK",
  };

  // Short labels for the role chip on each prospect card.
  const CATEGORY_SHORT = {
    "Terzino sinistro":           "TS",
    "Terzino destro":             "TD",
    "Difensore centrale mancino": "DCM",
    "Difensore centrale destro":  "DCD",
    "Play":                       "PLAY",
    "Mezzala":                    "MEZZ",
    "Trequartista":               "TRQ",
    "Ala destra":                 "AD",
    "Ala sinistra":               "AS",
    "Punta centrale":             "PC",
    "Portiere":                   "POR",
  };

  async function fetchProspects() {
    const { data, error } = await client
      .from("prospects")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data || []).map(r => ({
      id: r.id,
      category: r.category,
      name: r.name,
      birthDate: r.birth_date,
      birthYear: r.birth_year,
      nationality: r.nationality,
      heightCm: r.height_cm,
      foot: r.foot,
      currentClub: r.current_club,
      agent: r.agent,
      minutes: r.minutes,
      profileUrl: r.profile_url,
      status: r.status,
      scoutNotes: r.scout_notes,
    }));
  }

  async function addProspect(p) {
    const { error } = await client.from("prospects").insert({
      category: p.category,
      name: p.name,
      birth_date: p.birthDate || null,
      birth_year: p.birthYear || null,
      nationality: p.nationality || null,
      height_cm: p.heightCm || null,
      foot: p.foot || null,
      current_club: p.currentClub || null,
      agent: p.agent || null,
      minutes: p.minutes || null,
      profile_url: p.profileUrl || null,
      status: p.status || "monitoring",
      scout_notes: p.scoutNotes || null,
    });
    if (error) throw error;
  }

  async function updateProspect(id, patch) {
    const row = {};
    const map = {
      category: "category", name: "name", birthDate: "birth_date",
      birthYear: "birth_year", nationality: "nationality", heightCm: "height_cm",
      foot: "foot", currentClub: "current_club", agent: "agent",
      minutes: "minutes", profileUrl: "profile_url", status: "status",
      scoutNotes: "scout_notes",
    };
    for (const k of Object.keys(patch)) if (k in map) row[map[k]] = patch[k];
    const { error } = await client.from("prospects").update(row).eq("id", id);
    if (error) throw error;
  }

  async function deleteProspect(id) {
    const { error } = await client.from("prospects").delete().eq("id", id);
    if (error) throw error;
  }

  // Convert prospect → player atomically (within the limits of REST):
  // 1. Insert into players at end-of-depth for the chosen position
  // 2. Delete from prospects on success
  async function convertProspectToPlayer(prospect, { number, position, keepNotes }) {
    // depth at end of the position's existing list
    const { data: existing } = await client
      .from("players")
      .select("depth_index")
      .eq("position", position)
      .order("depth_index", { ascending: false })
      .limit(1);
    const next = existing && existing.length ? (existing[0].depth_index + 1) : 0;

    const { error: insErr } = await client.from("players").insert({
      number,
      name: prospect.name,
      birth_year: prospect.birthYear || null,
      position,
      depth_index: next,
    });
    if (insErr) throw insErr;

    const { error: delErr } = await client.from("prospects").delete().eq("id", prospect.id);
    if (delErr) {
      // Player got inserted but prospect couldn't be deleted — surface a soft warning,
      // don't roll back (the user has a duplicate to clean up manually).
      console.warn("[convert] player inserted but prospect not deleted:", delErr);
      throw new Error("Giocatore aggiunto, ma rimozione dalla shortlist fallita. Eliminalo manualmente.");
    }
  }

  // ---- realtime --------------------------------------------------------
  // Subscribe and receive a callback whenever any row changes.
  // Returns an `unsubscribe` function.
  function subscribe(onChange, onStatus) {
    const channel = client
      .channel("depth-live")
      .on("postgres_changes",
          { event: "*", schema: "public", table: "players" },
          () => onChange && onChange("players"))
      .on("postgres_changes",
          { event: "*", schema: "public", table: "prospects" },
          () => onChange && onChange("prospects"))
      .subscribe(status => onStatus && onStatus(status));
    return () => client.removeChannel(channel);
  }

  window.SB = {
    client,
    POSITION_KEYS,
    CATEGORY_TO_POSITION,
    CATEGORY_SHORT,
    fetchAll,
    groupRoster,
    addPlayer,
    updatePlayer,
    deletePlayer,
    setStarter,
    movePlayer,
    fetchProspects,
    addProspect,
    updateProspect,
    deleteProspect,
    convertProspectToPlayer,
    subscribe,
  };
})();
