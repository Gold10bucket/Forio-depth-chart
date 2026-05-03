const { useState, useMemo, useEffect, useRef, useCallback } = React;

// ---------- visual primitives ----------
function Pitch({ roster, selected, onSelect, swap }) {
  return (
    <div className="pitch-wrap">
      <svg className="pitch-svg" viewBox="0 0 100 140" preserveAspectRatio="none">
        {Array.from({ length: 14 }).map((_, i) => (
          <rect key={i} x="0" y={i * 10} width="100" height="10"
                fill={i % 2 ? "var(--turf-a)" : "var(--turf-b)"} />
        ))}
        <rect x="2" y="2" width="96" height="136" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".35" />
        <line x1="2" y1="70" x2="98" y2="70" stroke="rgba(255,255,255,.55)" strokeWidth=".35" />
        <circle cx="50" cy="70" r="9" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".35" />
        <circle cx="50" cy="70" r=".6" fill="rgba(255,255,255,.7)" />
        <rect x="22" y="2" width="56" height="16" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".35" />
        <rect x="36" y="2" width="28" height="6" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".35" />
        <path d="M 38 18 A 12 12 0 0 0 62 18" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".35" />
        <rect x="22" y="122" width="56" height="16" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".35" />
        <rect x="36" y="132" width="28" height="6" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".35" />
        <path d="M 38 122 A 12 12 0 0 1 62 122" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".35" />
      </svg>

      {POSITIONS.map(p => {
        const slot = roster[p.id] || [];
        const player = slot[0];
        const isSel = selected === p.id;
        const isSwap = swap && swap.from === p.id;
        const empty = !player;
        return (
          <button
            key={p.id}
            className={`token ${isSel ? "is-selected" : ""} ${isSwap ? "is-swap" : ""} ${empty ? "is-empty" : ""}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onClick={() => onSelect(p.id)}
          >
            <div className="token-shirt">
              <div className="token-stripes" />
              <div className="token-num">{empty ? "—" : player.n}</div>
            </div>
            <div className="token-name">
              <span className="token-name-pos">{p.label}</span>
              <span className="token-name-text">
                {empty ? "LIBERO" : player.name.split(" ").slice(-1)[0].toUpperCase()}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function DepthList({ posId, roster, onSetStarter, onEdit, onDelete, highlight, editMode }) {
  const players = roster[posId] || [];
  const labels = ["1ª", "2ª", "3ª", "4ª"];
  if (players.length === 0) {
    return (
      <div className={`depth-card is-empty ${highlight ? "is-highlight" : ""}`}>
        <div className="depth-card-head">
          <span className="depth-card-pos">{posId}</span>
          <span className="depth-card-count">libero</span>
        </div>
        <div className="depth-empty">
          <span className="depth-empty-dash">—</span>
          <span className="depth-empty-label">Nessun giocatore assegnato</span>
        </div>
      </div>
    );
  }
  return (
    <div className={`depth-card ${highlight ? "is-highlight" : ""}`}>
      <div className="depth-card-head">
        <span className="depth-card-pos">{posId}</span>
        <span className="depth-card-count">{players.length} in rosa</span>
      </div>
      <ol className="depth-list">
        {players.map((pl, i) => {
          const isStarter = i === 0;
          const isYouth = pl.birthYear >= 2006;
          return (
            <li
              key={pl.id || pl.n}
              className={`depth-row ${isStarter ? "is-starter" : ""} ${isYouth ? "is-youth" : ""}`}
              onClick={() => !editMode && onSetStarter(posId, pl.id)}
            >
              <span className="depth-rank">{isStarter ? "XI" : (labels[i] || `${i+1}ª`)}</span>
              <span className="depth-num">{String(pl.n).padStart(2, "0")}</span>
              <div className="depth-meta">
                <span className="depth-name">{pl.name}</span>
                <span className="depth-info">{pl.info}</span>
              </div>
              <div className="depth-stats">
                <span className="depth-byear">{pl.birthYear || "—"}</span>
                {editMode && (
                  <span className="depth-row-actions">
                    <button className="row-act" title="Modifica" onClick={(e)=>{e.stopPropagation();onEdit(pl);}}>✎</button>
                    <button className="row-act row-act-del" title="Rimuovi" onClick={(e)=>{e.stopPropagation();if(confirm(`Rimuovere ${pl.name}?`))onDelete(pl.id);}}>×</button>
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------- roster editor (add/edit player) ----------
function PlayerEditor({ initial, onSave, onCancel }) {
  const [number, setNumber] = useState(initial?.n ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [birthYear, setBirthYear] = useState(initial?.birthYear ?? "");
  const [position, setPosition] = useState(initial?.position ?? "ST");
  const isEdit = !!initial;

  const save = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      number: Number(number) || 0,
      name: name.trim(),
      birthYear: birthYear ? Number(birthYear) : null,
      position,
    });
  };

  return (
    <form className="editor-form" onSubmit={save}>
      <div className="editor-row">
        <label>Numero</label>
        <input type="number" min="1" max="99" value={number}
               onChange={(e)=>setNumber(e.target.value)} placeholder="10" />
      </div>
      <div className="editor-row">
        <label>Nome</label>
        <input type="text" value={name} onChange={(e)=>setName(e.target.value)}
               placeholder="L. Iaccarino" required autoFocus={!isEdit} />
      </div>
      <div className="editor-row">
        <label>Anno</label>
        <input type="number" min="1950" max="2015" value={birthYear}
               onChange={(e)=>setBirthYear(e.target.value)} placeholder="2006" />
      </div>
      <div className="editor-row">
        <label>Ruolo</label>
        <select value={position} onChange={(e)=>setPosition(e.target.value)}>
          {POSITIONS.map(p => <option key={p.id} value={p.id}>{p.id}</option>)}
        </select>
      </div>
      <div className="editor-actions">
        <button type="button" className="reset-btn" onClick={onCancel}>Annulla</button>
        <button type="submit" className="reset-btn editor-submit">{isEdit ? "Salva" : "Aggiungi"}</button>
      </div>
    </form>
  );
}

// ---------- main app ----------
function App() {
  const [tweaks, setTweak] = useTweaks(window.TWEAK_DEFAULTS);

  const [roster, setRoster] = useState(window.ROSTER);
  const [selected, setSelected] = useState("ST");
  const [swap, setSwap] = useState(null);
  const [toast, setToast] = useState(null);
  const [status, setStatus] = useState("connecting"); // connecting | live | offline | error
  const [editMode, setEditMode] = useState(false);
  const [editing, setEditing] = useState(null); // null | "new" | playerObject
  const [tab, setTab] = useState("depth"); // "depth" | "prospects"
  const [prospects, setProspects] = useState([]);
  const [editingProspect, setEditingProspect] = useState(null); // null | "new" | prospectObj
  const [converting, setConverting] = useState(null); // prospect being converted

  // ---- initial load + realtime subscription ----
  const reload = useCallback(async (which) => {
    try {
      if (!which || which === "players") {
        const rows = await SB.fetchAll();
        const grouped = SB.groupRoster(rows);
        window.ROSTER = grouped;
        setRoster(grouped);
      }
      if (!which || which === "prospects") {
        const list = await SB.fetchProspects();
        setProspects(list);
      }
    } catch (err) {
      console.error("[depth] fetch failed", err);
      setStatus("error");
      setToast("Errore di connessione");
      setTimeout(() => setToast(null), 2400);
    }
  }, []);

  useEffect(() => {
    reload();
    const unsub = SB.subscribe(
      (which) => reload(which),
      (s) => {
        if (s === "SUBSCRIBED") setStatus("live");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("offline");
      }
    );
    return () => { try { unsub(); } catch (_) {} };
  }, [reload]);

  const showToast = (msg, ms = 2000) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  // ---- mutations (optimistic UI not strictly needed — realtime is fast) ----
  const setStarter = async (posId, playerId) => {
    const slot = roster[posId] || [];
    const idx = slot.findIndex(p => p.id === playerId);
    if (idx <= 0) return;
    setSwap({ from: posId });
    setTimeout(() => setSwap(null), 700);
    try {
      await SB.setStarter(posId, playerId);
      const pl = slot[idx];
      showToast(`${pl.name} promosso titolare · ${posId}`);
    } catch (err) {
      console.error(err); showToast("Errore salvataggio");
    }
  };

  const handleAdd = async (p) => {
    try {
      await SB.addPlayer(p);
      setEditing(null);
      showToast(`${p.name} aggiunto · ${p.position}`);
    } catch (err) { console.error(err); showToast("Errore: " + err.message); }
  };

  const handleEditSave = async (p) => {
    try {
      await SB.updatePlayer(editing.id, {
        number: p.number, name: p.name, birthYear: p.birthYear, position: p.position,
      });
      setEditing(null);
      showToast(`${p.name} aggiornato`);
    } catch (err) { console.error(err); showToast("Errore: " + err.message); }
  };

  const handleDelete = async (id) => {
    try {
      await SB.deletePlayer(id);
      showToast("Giocatore rimosso");
    } catch (err) { console.error(err); showToast("Errore: " + err.message); }
  };

  // ---- prospect mutations ----
  const handleProspectAdd = async (p) => {
    try {
      await SB.addProspect(p);
      setEditingProspect(null);
      showToast(`${p.name} aggiunto alla shortlist`);
    } catch (err) { console.error(err); showToast("Errore: " + err.message); }
  };

  const handleProspectEditSave = async (p) => {
    try {
      await SB.updateProspect(editingProspect.id, p);
      setEditingProspect(null);
      showToast(`${p.name} aggiornato`);
    } catch (err) { console.error(err); showToast("Errore: " + err.message); }
  };

  const handleProspectDelete = async (id) => {
    try {
      await SB.deleteProspect(id);
      showToast("Prospect rimosso");
    } catch (err) { console.error(err); showToast("Errore: " + err.message); }
  };

  const handleProspectStatus = async (id, status) => {
    try { await SB.updateProspect(id, { status }); }
    catch (err) { console.error(err); showToast("Errore: " + err.message); }
  };

  const handleConvertConfirm = async ({ number, position }) => {
    if (!converting) return;
    try {
      await SB.convertProspectToPlayer(converting, { number, position });
      const name = converting.name;
      setConverting(null);
      setTab("depth");
      showToast(`${name} aggiunto alla rosa · ${position}`);
    } catch (err) { console.error(err); showToast(err.message || "Errore conversione"); }
  };

  const groups = [
    { title: "Attaccanti",     ids: ["LW", "ST", "RW"] },
    { title: "Centrocampisti", ids: ["LCM", "CM", "RCM"] },
    { title: "Difensori",      ids: ["LB", "LCB", "RCB", "RB"] },
    { title: "Portieri",       ids: ["GK"] },
  ];

  const totalPlayers = Object.values(roster).reduce((s, a) => s + (a?.length || 0), 0);

  return (
    <div className={`app tone-${tweaks.pitchTone} layout-${tweaks.layout} name-${tweaks.nameStyle} ${tweaks.showStripes ? "" : "no-stripes"}`}
         style={{ "--accent": tweaks.accent }}>
      <header className="crest-bar">
        <div className="crest-left">
          <img src={window.LOGO_DATA_URL || "assets/realforio-logo.png"} alt="Real Forio" className="crest" />
          <div className="crest-meta">
            <div className="crest-eyebrow">
              Lavagna Tattica · 2025/26
              <span className={`live-dot live-${status}`} title={
                status === "live" ? "Sincronizzato"
                : status === "connecting" ? "Connessione..."
                : status === "offline" ? "Offline"
                : "Errore"
              } />
            </div>
            <h1 className="crest-title">Real Forio 2014</h1>
            <div className="crest-sub">Gerarchie di Rosa — 4 / 3 / 3 · {totalPlayers} in rosa</div>
          </div>
        </div>
      </header>

      <div className="tab-bar no-print">
        <button className={`tab-btn ${tab === "depth" ? "is-active" : ""}`}
                onClick={() => setTab("depth")}>
          Gerarchie · Rosa
        </button>
        <button className={`tab-btn ${tab === "prospects" ? "is-active" : ""}`}
                onClick={() => setTab("prospects")}>
          Shortlist · Prospect
          <span className="tab-badge">{prospects.length}</span>
        </button>
      </div>

      {tab === "depth" && (
      <div className="formation-strip">
        <span className="form-num">4</span>
        <span className="form-dot" />
        <span className="form-num">3</span>
        <span className="form-dot" />
        <span className="form-num">3</span>
        <span className="form-flow">POR · DIF · CEN · ATT →</span>
        <div className="strip-actions no-print">
          <button className={`reset-btn ${editMode ? "is-active" : ""}`}
                  onClick={() => setEditMode(v => !v)}>
            {editMode ? "✓ Fine" : "✎ Modifica rosa"}
          </button>
          {editMode && (
            <button className="reset-btn editor-submit" onClick={() => setEditing("new")}>
              + Aggiungi
            </button>
          )}
        </div>
      </div>
      )}

      {tab === "prospects" && (
        <ProspectBoard
          prospects={prospects}
          roster={roster}
          onAdd={() => setEditingProspect("new")}
          onEdit={(p) => setEditingProspect(p)}
          onDelete={handleProspectDelete}
          onStatusChange={handleProspectStatus}
          onConvert={(p) => setConverting(p)}
        />
      )}

      {tab === "depth" && (
      <main className="board">
        <section className="pitch-col">
          <Pitch roster={roster} selected={selected} onSelect={setSelected} swap={swap} />
          <div className="pitch-legend">
            <span><i className="dot dot-starter" /> Formazione titolare</span>
            <span><i className="dot dot-bench" /> Clicca un ruolo per le gerarchie</span>
            <span className="legend-spacer" />
            <span className="legend-pos">Selezionato: <b>{selected}</b></span>
          </div>
        </section>

        <aside className="depth-col">
          {groups.map(g => (
            <div key={g.title} className="depth-group">
              <div className="depth-group-head">
                <span className="depth-group-title">{g.title}</span>
                <span className="depth-group-rule" />
                <span className="depth-group-count">{g.ids.reduce((s,id)=>s+(roster[id]?.length||0),0)}</span>
              </div>
              <div className="depth-grid">
                {g.ids.map(id => (
                  <DepthList key={id} posId={id} roster={roster}
                             onSetStarter={setStarter}
                             onEdit={(pl)=>setEditing({...pl, position:id})}
                             onDelete={handleDelete}
                             highlight={selected === id}
                             editMode={editMode} />
                ))}
              </div>
            </div>
          ))}
        </aside>
      </main>
      )}

      {/* Prospect editor modal */}
      {editingProspect && (
        <div className="modal-veil" onClick={(e)=>{if(e.target===e.currentTarget)setEditingProspect(null);}}>
          <div className="modal-card modal-card-wide">
            <div className="modal-head">
              <span className="modal-title">
                {editingProspect === "new" ? "Aggiungi prospect" : "Modifica prospect"}
              </span>
              <button className="modal-close" onClick={()=>setEditingProspect(null)}>×</button>
            </div>
            <ProspectEditor
              initial={editingProspect === "new" ? null : editingProspect}
              onSave={editingProspect === "new" ? handleProspectAdd : handleProspectEditSave}
              onCancel={() => setEditingProspect(null)}
            />
          </div>
        </div>
      )}

      {/* Convert prospect → roster modal */}
      {converting && (
        <div className="modal-veil" onClick={(e)=>{if(e.target===e.currentTarget)setConverting(null);}}>
          <div className="modal-card">
            <div className="modal-head">
              <span className="modal-title">Aggiungi alla rosa</span>
              <button className="modal-close" onClick={()=>setConverting(null)}>×</button>
            </div>
            <ConvertProspectDialog
              prospect={converting}
              roster={roster}
              onConfirm={handleConvertConfirm}
              onCancel={() => setConverting(null)}
            />
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {editing && (
        <div className="modal-veil" onClick={(e)=>{if(e.target===e.currentTarget)setEditing(null);}}>
          <div className="modal-card">
            <div className="modal-head">
              <span className="modal-title">
                {editing === "new" ? "Aggiungi giocatore" : "Modifica giocatore"}
              </span>
              <button className="modal-close" onClick={()=>setEditing(null)}>×</button>
            </div>
            <PlayerEditor
              initial={editing === "new" ? null : editing}
              onSave={editing === "new" ? handleAdd : handleEditSave}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      <TweaksPanel title="Personalizza">
        <TweakSection title="Campo">
          <TweakRadio label="Tonalità" value={tweaks.pitchTone}
            onChange={(v)=>setTweak("pitchTone", v)}
            options={[
              {value:"classic", label:"Classico"},
              {value:"night",   label:"Notte"},
              {value:"mono",    label:"Mono"},
            ]} />
          <TweakToggle label="Strisce sulle maglie"
            value={tweaks.showStripes}
            onChange={(v)=>setTweak("showStripes", v)} />
        </TweakSection>
        <TweakSection title="Disposizione">
          <TweakRadio label="Layout" value={tweaks.layout}
            onChange={(v)=>setTweak("layout", v)}
            options={[
              {value:"split", label:"Affiancato"},
              {value:"stack", label:"Sovrapposto"},
            ]} />
          <TweakRadio label="Etichetta giocatore" value={tweaks.nameStyle}
            onChange={(v)=>setTweak("nameStyle", v)}
            options={[
              {value:"surname", label:"Cognome"},
              {value:"full",    label:"Completo"},
              {value:"number",  label:"#Solo"},
            ]} />
        </TweakSection>
        <TweakSection title="Brand">
          <TweakColor label="Colore club" value={tweaks.accent}
            onChange={(v)=>setTweak("accent", v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
