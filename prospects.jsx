// prospects.jsx — shortlist board with category groups, filters, and convert action.

const { useState: useStateP, useMemo: useMemoP } = React;

// ---------- nationality flag (best-effort) ----------
const NAT_FLAGS = {
  "Italia": "🇮🇹", "Francia": "🇫🇷", "Spagna": "🇪🇸", "Romania": "🇷🇴",
  "Argentina": "🇦🇷", "Senegal": "🇸🇳", "Burkina Faso": "🇧🇫",
  "Colombia": "🇨🇴", "Gambia": "🇬🇲", "Algeria": "🇩🇿", "Scozia": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Svizzera": "🇨🇭",
};
const flagFor = (nat) => NAT_FLAGS[nat] || "";

// ---------- status meta ----------
const STATUS_META = {
  monitoring:  { label: "Monitorato",   cls: "status-monitor" },
  contacted:   { label: "Contattato",   cls: "status-contact" },
  negotiating: { label: "Trattativa",   cls: "status-nego"    },
  rejected:    { label: "Scartato",     cls: "status-reject"  },
};

// ---------- single card ----------
function ProspectCard({ p, onConvert, onEdit, onDelete, onStatusChange, onMoveUp, onMoveDown }) {
  const isYouth = p.birthYear >= 2006;
  const age = p.birthYear ? (2026 - p.birthYear) : null;
  const short = SB.POSITION_KEYS.includes(p.category)
    ? p.category
    : (SB.CATEGORY_SHORT[p.category] || p.category.slice(0,3).toUpperCase());
  const stat = STATUS_META[p.status] || STATUS_META.monitoring;

  return (
    <div className={`pcard ${isYouth ? "is-youth" : ""}`}>
      <div className="pcard-stripe" />
      <div className="pcard-body">
        <div className="pcard-top">
          <div className="pcard-role">{short}</div>
          <div className="pcard-name-block">
            <div className="pcard-name">
              {p.name}
              {p.nationality && <span className="pcard-flag" title={p.nationality}>{flagFor(p.nationality)}</span>}
              {isYouth && <span className="pcard-tag">Under</span>}
            </div>
            <div className="pcard-sub">
              {p.category}
              {age != null && <span> · {age} anni ({p.birthYear})</span>}
            </div>
          </div>
          <select className={`pcard-status ${stat.cls}`}
                  value={p.status || "monitoring"}
                  onClick={(e)=>e.stopPropagation()}
                  onChange={(e)=>onStatusChange(p.id, e.target.value)}>
            {Object.entries(STATUS_META).map(([k,m]) =>
              <option key={k} value={k}>{m.label}</option>
            )}
          </select>
        </div>

        <div className="pcard-meta">
          <span className="pcard-club">{p.currentClub || "—"}</span>
          {p.heightCm && <span className="pcard-chip">{p.heightCm} cm</span>}
          {p.foot && <span className="pcard-chip">{p.foot[0].toUpperCase() + p.foot.slice(1)}</span>}
          {p.minutes != null && <span className="pcard-chip pcard-chip-min">{p.minutes}'</span>}
        </div>

        {p.agent && <div className="pcard-agent"><span>Procuratore</span> {p.agent}</div>}
        {p.scoutNotes && <div className="pcard-notes">"{p.scoutNotes}"</div>}

        <div className="pcard-actions">
          {onMoveUp   && <button className="pcard-btn pcard-btn-move" onClick={onMoveUp}   title="Sposta su">↑</button>}
          {onMoveDown && <button className="pcard-btn pcard-btn-move" onClick={onMoveDown} title="Sposta giù">↓</button>}
          {p.profileUrl && (
            <a className="pcard-btn pcard-btn-view" href={p.profileUrl}
               target="_blank" rel="noopener noreferrer">Visualizza ↗</a>
          )}
          <button className="pcard-btn pcard-btn-edit" onClick={()=>onEdit(p)}>✎ Note</button>
          <button className="pcard-btn pcard-btn-del"
                  onClick={()=>{ if(confirm(`Rimuovere ${p.name} dalla shortlist?`)) onDelete(p.id); }}>×</button>
          <button className="pcard-btn pcard-btn-convert" onClick={()=>onConvert(p)}>→ ROSA</button>
        </div>
      </div>
    </div>
  );
}

// ---------- prospect editor (notes / status / metadata) ----------
const TM_SERVER = "http://localhost:7654";

function ProspectEditor({ initial, onSave, onCancel }) {
  const isEdit = !!initial;

  const [tmUrl, setTmUrl] = useStateP("");
  const [scraping, setScraping] = useStateP(false);
  const [scrapeError, setScrapeError] = useStateP("");
  const [scraped, setScraped] = useStateP(false);

  const [form, setForm] = useStateP(() => ({
    category:    initial?.category    ?? "ST",
    name:        initial?.name        ?? "",
    birthYear:   initial?.birthYear   ?? "",
    nationality: initial?.nationality ?? "",
    heightCm:    initial?.heightCm    ?? "",
    foot:        initial?.foot        ?? "",
    currentClub: initial?.currentClub ?? "",
    agent:       initial?.agent       ?? "",
    minutes:     initial?.minutes     ?? "",
    profileUrl:  initial?.profileUrl  ?? "",
    status:      initial?.status      ?? "monitoring",
    scoutNotes:  initial?.scoutNotes  ?? "",
  }));
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const fetchFromTM = async () => {
    const url = tmUrl.trim();
    if (!url) return;
    setScraping(true);
    setScrapeError("");
    try {
      const res = await fetch(`${TM_SERVER}/scrape?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setForm(f => ({
        ...f,
        category:    data.category    || f.category,
        name:        data.name        || f.name,
        birthYear:   data.birthYear   ?? f.birthYear,
        nationality: data.nationality || f.nationality,
        heightCm:    data.heightCm    ?? f.heightCm,
        foot:        data.foot        || f.foot,
        currentClub: data.currentClub || f.currentClub,
        agent:       data.agent       || f.agent,
        minutes:     data.minutes     ?? f.minutes,
        profileUrl:  data.profileUrl  || url,
      }));
      setScraped(true);
    } catch (err) {
      if (err.name === "TypeError") {
        setScrapeError("Server non attivo — avvia tm_server.py per usare questa funzione.");
      } else {
        setScrapeError(err.message || "Errore durante lo scraping.");
      }
    } finally {
      setScraping(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      category:    form.category,
      name:        form.name.trim(),
      birthYear:   form.birthYear   ? Number(form.birthYear)   : null,
      nationality: form.nationality.trim() || null,
      heightCm:    form.heightCm    ? Number(form.heightCm)    : null,
      foot:        form.foot.trim() || null,
      currentClub: form.currentClub.trim() || null,
      agent:       form.agent.trim() || null,
      minutes:     form.minutes     ? Number(form.minutes)     : null,
      profileUrl:  form.profileUrl.trim() || null,
      status:      form.status,
      scoutNotes:  form.scoutNotes.trim() || null,
    });
  };

  return (
    <form className="editor-form editor-form-wide" onSubmit={submit}>

      {/* ── Optional TM enrichment bar (new prospects only) ── */}
      {!isEdit && (
        <div className="tm-enrich">
          <div className="tm-enrich-row">
            <span className="tm-enrich-label">TM</span>
            <input
              className="tm-enrich-input"
              type="url"
              placeholder="Incolla link Transfermarkt per compilare automaticamente…"
              value={tmUrl}
              onChange={(e) => { setTmUrl(e.target.value); setScrapeError(""); setScraped(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); fetchFromTM(); } }}
            />
            <button className="tm-enrich-btn" type="button"
                    disabled={!tmUrl.trim() || scraping} onClick={fetchFromTM}>
              {scraping ? "…" : scraped ? "✓" : "Recupera"}
            </button>
          </div>
          {scrapeError && <div className="tm-enrich-error">{scrapeError}</div>}
        </div>
      )}

      <div className="editor-row">
        <label>Categoria</label>
        <select value={form.category} onChange={set("category")}>
          {SB.POSITION_KEYS.map(k =>
            <option key={k} value={k}>{k}</option>
          )}
        </select>
      </div>
      <div className="editor-row">
        <label>Nome</label>
        <input type="text" value={form.name} onChange={set("name")} required autoFocus />
      </div>
      <div className="editor-grid-2">
        <div className="editor-row">
          <label>Anno</label>
          <input type="number" min="1950" max="2015" value={form.birthYear} onChange={set("birthYear")} />
        </div>
        <div className="editor-row">
          <label>Altezza (cm)</label>
          <input type="number" min="140" max="220" value={form.heightCm} onChange={set("heightCm")} />
        </div>
      </div>
      <div className="editor-grid-2">
        <div className="editor-row">
          <label>Piede</label>
          <select value={form.foot} onChange={set("foot")}>
            <option value="">—</option>
            <option value="destro">destro</option>
            <option value="sinistro">sinistro</option>
            <option value="ambidestro">ambidestro</option>
          </select>
        </div>
        <div className="editor-row">
          <label>Nazionalità</label>
          <input type="text" value={form.nationality} onChange={set("nationality")} placeholder="Italia" />
        </div>
      </div>
      <div className="editor-row">
        <label>Squadra</label>
        <input type="text" value={form.currentClub} onChange={set("currentClub")} />
      </div>
      <div className="editor-grid-2">
        <div className="editor-row">
          <label>Procuratore</label>
          <input type="text" value={form.agent} onChange={set("agent")} />
        </div>
        <div className="editor-row">
          <label>Minuti giocati</label>
          <input type="number" min="0" value={form.minutes} onChange={set("minutes")} />
        </div>
      </div>
      <div className="editor-row">
        <label>Link profilo</label>
        <input type="url" value={form.profileUrl} onChange={set("profileUrl")}
               placeholder="https://www.transfermarkt.it/..." />
      </div>
      <div className="editor-row">
        <label>Stato</label>
        <select value={form.status} onChange={set("status")}>
          {Object.entries(STATUS_META).map(([k,m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
      </div>
      <div className="editor-row">
        <label>Note scout</label>
        <textarea rows="3" value={form.scoutNotes} onChange={set("scoutNotes")}
                  placeholder="Veloce sulla fascia, gioca a piede invertito..." />
      </div>
      <div className="editor-actions">
        <button type="button" className="reset-btn" onClick={onCancel}>Annulla</button>
        <button type="submit" className="reset-btn editor-submit">{isEdit ? "Salva" : "Aggiungi"}</button>
      </div>
    </form>
  );
}

// ---------- convert modal ----------
function ConvertProspectDialog({ prospect, roster, onConfirm, onCancel }) {
  const suggested = SB.POSITION_KEYS.includes(prospect.category)
    ? prospect.category
    : (SB.CATEGORY_TO_POSITION[prospect.category] || "ST");
  const [position, setPosition] = useStateP(suggested);
  const usedNumbers = useMemoP(() => {
    const all = [];
    for (const k of Object.keys(roster || {})) for (const pl of (roster[k]||[])) all.push(pl.n);
    return new Set(all);
  }, [roster]);
  const suggestedNum = useMemoP(() => {
    for (let n = 1; n <= 99; n++) if (!usedNumbers.has(n)) return n;
    return "";
  }, [usedNumbers]);
  const [number, setNumber] = useStateP(suggestedNum);

  const submit = (e) => {
    e.preventDefault();
    onConfirm({
      number: Number(number) || 0,
      position,
    });
  };

  return (
    <form className="editor-form" onSubmit={submit}>
      <div className="convert-summary">
        <div className="convert-name">{prospect.name}</div>
        <div className="convert-sub">
          {prospect.category}
          {prospect.birthYear && ` · ${2026 - prospect.birthYear} anni`}
          {prospect.currentClub && ` · ${prospect.currentClub}`}
        </div>
      </div>
      <div className="editor-row">
        <label>Posizione in rosa</label>
        <select value={position} onChange={(e)=>setPosition(e.target.value)}>
          {SB.POSITION_KEYS.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <div className="editor-row">
        <label>Numero maglia</label>
        <input type="number" min="1" max="99" value={number}
               onChange={(e)=>setNumber(e.target.value)} required />
        {usedNumbers.has(Number(number)) && (
          <small style={{color:"#c8302a"}}>Numero già in uso</small>
        )}
      </div>
      <div className="editor-actions">
        <button type="button" className="reset-btn" onClick={onCancel}>Annulla</button>
        <button type="submit" className="reset-btn editor-submit"
                disabled={!number || usedNumbers.has(Number(number))}>
          → Aggiungi alla rosa
        </button>
      </div>
    </form>
  );
}

// ---------- main board ----------
function ProspectBoard({ prospects, roster, onConvert, onEdit, onDelete, onStatusChange, onAdd, prospectOrder, onReorder }) {
  const [search, setSearch] = useStateP("");
  const [filterCat, setFilterCat] = useStateP("all");
  const [filterStatus, setFilterStatus] = useStateP("all");
  const [filterUnder, setFilterUnder] = useStateP(false);
  const [sortBy, setSortBy] = useStateP("category");

  const filtered = useMemoP(() => {
    const s = search.trim().toLowerCase();
    return prospects.filter(p => {
      if (filterCat !== "all" && p.category !== filterCat) return false;
      if (filterStatus !== "all" && p.status !== filterStatus) return false;
      if (filterUnder && !(p.birthYear >= 2006)) return false;
      if (s) {
        const blob = `${p.name} ${p.currentClub || ""} ${p.agent || ""}`.toLowerCase();
        if (!blob.includes(s)) return false;
      }
      return true;
    });
  }, [prospects, search, filterCat, filterStatus, filterUnder]);

  const sorted = useMemoP(() => {
    const arr = [...filtered];
    if (sortBy === "name")         arr.sort((a,b) => a.name.localeCompare(b.name));
    else if (sortBy === "year")    arr.sort((a,b) => (b.birthYear||0) - (a.birthYear||0));
    else if (sortBy === "minutes") arr.sort((a,b) => (b.minutes||0) - (a.minutes||0));
    else if (sortBy === "manual") {
      if (prospectOrder && prospectOrder.length) {
        const idx = new Map(prospectOrder.map((id, i) => [id, i]));
        arr.sort((a, b) => (idx.has(a.id) ? idx.get(a.id) : 9999) - (idx.has(b.id) ? idx.get(b.id) : 9999));
      }
    } else {
      arr.sort((a,b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    }
    return arr;
  }, [filtered, sortBy, prospectOrder]);

  const moveInOrder = (id, dir) => {
    const ids = sorted.map(p => p.id);
    const i = ids.indexOf(id);
    if (dir === "up"   && i > 0)              { [ids[i-1], ids[i]] = [ids[i], ids[i-1]]; }
    if (dir === "down" && i < ids.length - 1) { [ids[i], ids[i+1]] = [ids[i+1], ids[i]]; }
    onReorder && onReorder(ids);
  };

  const grouped = useMemoP(() => {
    if (sortBy !== "category") return null;
    const g = {};
    for (const p of sorted) (g[p.category] = g[p.category] || []).push(p);
    return g;
  }, [sorted, sortBy]);

  const categories = SB.POSITION_KEYS;
  const isManual = sortBy === "manual";

  return (
    <div className="prospect-board">
      <div className="prospect-toolbar no-print">
        <input className="prospect-search" type="search" placeholder="Cerca giocatore, squadra, procuratore..."
               value={search} onChange={(e)=>setSearch(e.target.value)} />
        <select value={filterCat} onChange={(e)=>setFilterCat(e.target.value)}>
          <option value="all">Tutti i ruoli</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)}>
          <option value="all">Tutti gli stati</option>
          {Object.entries(STATUS_META).map(([k,m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
        <label className="prospect-toggle">
          <input type="checkbox" checked={filterUnder} onChange={(e)=>setFilterUnder(e.target.checked)} />
          Solo Under
        </label>
        <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
          <option value="category">Ordina: Categoria</option>
          <option value="year">Ordina: Anno (giovani)</option>
          <option value="minutes">Ordina: Minuti giocati</option>
          <option value="name">Ordina: Nome</option>
          <option value="manual">Ordina: Personalizzato ↕</option>
        </select>
        <span className="prospect-count">{sorted.length} di {prospects.length}</span>
        <button className="reset-btn editor-submit prospect-add" onClick={onAdd}>+ Prospect</button>
      </div>

      {sorted.length === 0 && (
        <div className="prospect-empty">Nessun prospect corrisponde ai filtri.</div>
      )}

      {grouped ? (
        <div className="prospect-groups">
          {Object.keys(grouped).sort().map(cat => (
            <div key={cat} className="prospect-group">
              <div className="prospect-group-head">
                <span className="prospect-group-title">{cat}</span>
                <span className="prospect-group-rule" />
                <span className="prospect-group-count">{grouped[cat].length}</span>
              </div>
              <div className="prospect-grid">
                {grouped[cat].map(p => (
                  <ProspectCard key={p.id} p={p}
                    onConvert={onConvert} onEdit={onEdit} onDelete={onDelete}
                    onStatusChange={onStatusChange} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="prospect-grid">
          {sorted.map((p, i) => (
            <ProspectCard key={p.id} p={p}
              onConvert={onConvert} onEdit={onEdit} onDelete={onDelete}
              onStatusChange={onStatusChange}
              onMoveUp={isManual && i > 0                  ? () => moveInOrder(p.id, "up")   : null}
              onMoveDown={isManual && i < sorted.length - 1 ? () => moveInOrder(p.id, "down") : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// expose to global scope so app.jsx can use them
window.ProspectBoard = ProspectBoard;
window.ProspectEditor = ProspectEditor;
window.ConvertProspectDialog = ConvertProspectDialog;
window.PROSPECT_STATUS_META = STATUS_META;
