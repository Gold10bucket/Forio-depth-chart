const { useState, useMemo, useEffect, useRef, useCallback } = React;

// ---------- visual primitives ----------
function Pitch({ roster, selected, onSelect, swap, prospectsByPos, onDragPlayer, onDropOnPos, dragActive }) {
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
        const prospectCount = (prospectsByPos && prospectsByPos[p.id]?.length) || 0;
        const topProspect = empty ? (prospectsByPos && prospectsByPos[p.id]?.[0]) : null;
        const isDragging = dragActive && dragActive.fromPos === p.id && dragActive.playerId === player?.id;
        const isDropTarget = dragActive && dragActive.fromPos !== p.id;
        return (
          <button
            key={p.id}
            className={`token ${isSel ? "is-selected" : ""} ${isSwap ? "is-swap" : ""} ${empty && !topProspect ? "is-empty" : ""} ${isDragging ? "is-dragging" : ""} ${isDropTarget ? "is-drop-target" : ""} ${topProspect ? "is-prospect-fill" : ""}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            draggable={!empty}
            onDragStart={(e) => {
              if (empty) { e.preventDefault(); return; }
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", player.id);
              onDragPlayer && onDragPlayer({ playerId: player.id, fromPos: p.id });
            }}
            onDragEnd={() => onDragPlayer && onDragPlayer(null)}
            onDragOver={(e) => { if (dragActive) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
            onDrop={(e) => {
              e.preventDefault();
              if (!dragActive) return;
              onDropOnPos && onDropOnPos(p.id);
            }}
            onClick={() => onSelect(p.id)}
          >
            <div className="token-shirt">
              <div className="token-stripes" />
              <div className="token-num">{topProspect ? "★" : (empty ? "—" : player.n)}</div>
            </div>
            {prospectCount > 0 && !topProspect && (
              <span className="token-prospect-badge" title={`${prospectCount} prospect`}>+{prospectCount}</span>
            )}
            <div className="token-name">
              <span className="token-name-pos">{p.label}</span>
              <span className="token-name-text">
                {topProspect
                  ? topProspect.name.split(" ").slice(-1)[0].toUpperCase()
                  : (empty ? "LIBERO" : player.name.split(" ").slice(-1)[0].toUpperCase())}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

const PROSPECT_STATUS = {
  monitoring:  { label: "Monitorato", cls: "ps-monitor" },
  contacted:   { label: "Contattato", cls: "ps-contact" },
  negotiating: { label: "Trattativa", cls: "ps-nego"    },
  rejected:    { label: "Scartato",   cls: "ps-reject"  },
};

function DepthList({ posId, roster, prospectsForPos, onSetStarter, onEdit, onDelete, onConvertProspect, onEditProspect, onDragPlayer, onDropOnPos, dragActive, highlight, editMode, onProspectStatusChange, onReorderDepth, prospectOrder, onProspectOrderChange }) {
  const players = roster[posId] || [];
  const rawProspects = prospectsForPos || [];
  const labels = ["1ª", "2ª", "3ª", "4ª"];
  const empty = players.length === 0 && rawProspects.length === 0;
  const isDropTarget = dragActive && dragActive.fromPos !== posId;
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragRowRef = useRef(null); // set synchronously in onDragStart, no stale-closure issues
  const [prospDragIdx, setProspDragIdx] = useState(null);
  const [prospDragOver, setProspDragOver] = useState(null);

  const prospects = useMemo(() => {
    if (!prospectOrder) return rawProspects;
    const idx = new Map(prospectOrder.map((id, i) => [id, i]));
    return [...rawProspects].sort((a, b) => (idx.has(a.id) ? idx.get(a.id) : 999) - (idx.has(b.id) ? idx.get(b.id) : 999));
  }, [rawProspects, prospectOrder]);

  const saveProspOrder = (ids) => {
    onProspectOrderChange && onProspectOrderChange(posId, ids);
  };

  const moveProspect = (id, dir) => {
    const ids = prospects.map(p => p.id);
    const i = ids.indexOf(id);
    if (dir === "up"   && i > 0)              { [ids[i-1], ids[i]] = [ids[i], ids[i-1]]; }
    if (dir === "down" && i < ids.length - 1) { [ids[i], ids[i+1]] = [ids[i+1], ids[i]]; }
    saveProspOrder(ids);
  };

  const handleProspDrop = (e, toIdx) => {
    e.preventDefault();
    e.stopPropagation();
    if (prospDragIdx === null || prospDragIdx === toIdx) { setProspDragIdx(null); setProspDragOver(null); return; }
    const ids = prospects.map(p => p.id);
    const [moved] = ids.splice(prospDragIdx, 1);
    ids.splice(toIdx, 0, moved);
    setProspDragIdx(null); setProspDragOver(null);
    saveProspOrder(ids);
  };

  const cardDragHandlers = {
    onDragOver: (e) => { if (dragActive && dragActive.fromPos !== posId) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } },
    onDrop: (e) => { e.preventDefault(); if (dragActive && dragActive.fromPos !== posId) onDropOnPos && onDropOnPos(posId); },
  };

  const handleRowDrop = (e, toIdx) => {
    e.preventDefault();
    e.stopPropagation();
    const fromIdx = dragRowRef.current;
    dragRowRef.current = null;
    if (fromIdx === null || fromIdx === toIdx) { setDragOverIdx(null); return; }
    const reordered = [...players];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setDragOverIdx(null);
    onReorderDepth && onReorderDepth(posId, reordered.map(pl => pl.id));
  };

  if (empty) {
    return (
      <div className={`depth-card is-empty ${highlight ? "is-highlight" : ""} ${isDropTarget ? "is-drop-target" : ""}`} {...cardDragHandlers}>
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
    <div className={`depth-card ${highlight ? "is-highlight" : ""} ${isDropTarget ? "is-drop-target" : ""}`} {...cardDragHandlers}>
      <div className="depth-card-head">
        <span className="depth-card-pos">{posId}</span>
        <span className="depth-card-count">
          {players.length} in rosa{prospects.length > 0 && ` · ${prospects.length} prospect`}
        </span>
      </div>
      {players.length > 0 && (
        <ol className="depth-list">
          {players.map((pl, i) => {
            const isStarter = i === 0;
            const isYouth = pl.birthYear >= 2006;
            const isDragging = dragActive && dragActive.playerId === pl.id;
            const isDragOver = dragOverIdx === i && dragActive?.fromPos === posId && !isDragging;
            return (
              <li
                key={pl.id || pl.n}
                className={`depth-row ${isStarter ? "is-starter" : ""} ${isYouth ? "is-youth" : ""} ${isDragging ? "is-dragging" : ""} ${isDragOver ? "is-drag-over" : ""}`}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", pl.id);
                  dragRowRef.current = i; // synchronous — no React batching delay
                  onDragPlayer && onDragPlayer({ playerId: pl.id, fromPos: posId });
                }}
                onDragEnd={() => { dragRowRef.current = null; setDragOverIdx(null); onDragPlayer && onDragPlayer(null); }}
                onDragOver={(e) => {
                  if (dragRowRef.current !== null) { e.preventDefault(); e.stopPropagation(); setDragOverIdx(i); }
                }}
                onDrop={(e) => handleRowDrop(e, i)}
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
      )}
      {prospects.length > 0 && (
        <>
          <div className="depth-prospect-divider">
            <span>Prospect osservati</span>
            <span className="depth-prospect-rule" />
          </div>
          <ol className="depth-list depth-list-prospect">
            {prospects.map((pr, pi) => {
              const isYouth = pr.birthYear >= 2006;
              const isDraggingP = prospDragIdx === pi;
              const isDragOverP = prospDragOver === pi && !isDraggingP;
              return (
                <li key={pr.id}
                    className={`depth-row depth-row-prospect ${isYouth ? "is-youth" : ""} ${isDraggingP ? "is-dragging" : ""} ${isDragOverP ? "is-drag-over" : ""}`}
                    draggable
                    onDragStart={(e) => { e.stopPropagation(); e.dataTransfer.effectAllowed = "move"; setProspDragIdx(pi); }}
                    onDragEnd={(e) => { e.stopPropagation(); setProspDragIdx(null); setProspDragOver(null); }}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setProspDragOver(pi); }}
                    onDrop={(e) => handleProspDrop(e, pi)}>
                  <span className="depth-rank depth-rank-prospect prosp-drag-handle" title="Trascina per riordinare">⠿</span>
                  <span className="depth-num depth-num-prospect">★</span>
                  <div className="depth-meta">
                    <span className="depth-name">{pr.name}</span>
                    <span className="depth-info">{pr.currentClub || pr.category}</span>
                  </div>
                  <div className="depth-stats">
                    <select
                      className={`depth-prospect-status ${(PROSPECT_STATUS[pr.status] || PROSPECT_STATUS.monitoring).cls}`}
                      value={pr.status || "monitoring"}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); onProspectStatusChange && onProspectStatusChange(pr.id, e.target.value); }}
                    >
                      {Object.entries(PROSPECT_STATUS).map(([k, m]) =>
                        <option key={k} value={k}>{m.label}</option>
                      )}
                    </select>
                    <span className="depth-byear">{pr.birthYear || "—"}</span>
                    <span className="depth-row-actions">
                      <button className="row-act prosp-move" title="Su"   onClick={(e)=>{e.stopPropagation();moveProspect(pr.id,"up");}}>↑</button>
                      <button className="row-act prosp-move" title="Giù"  onClick={(e)=>{e.stopPropagation();moveProspect(pr.id,"down");}}>↓</button>
                      <button className="row-act" title="Info e note"
                              onClick={(e)=>{e.stopPropagation();onEditProspect && onEditProspect(pr);}}>ℹ</button>
                      {pr.profileUrl && (
                        <a className="row-act" href={pr.profileUrl} target="_blank" rel="noopener noreferrer"
                           title="Transfermarkt" onClick={(e)=>e.stopPropagation()}>↗</a>
                      )}
                      <button className="row-act row-act-promote" title="Aggiungi alla rosa"
                              onClick={(e)=>{e.stopPropagation();onConvertProspect(pr);}}>→</button>
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
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
  const [prospects, setProspects] = useState([]);
  const [editingProspect, setEditingProspect] = useState(null);
  const [converting, setConverting] = useState(null);
  const [dragInfo, setDragInfo] = useState(null);
  const [prospectOrders, setProspectOrders] = useState(() => {
    const out = {};
    const keys = SB.POSITION_KEYS;
    for (const k of keys) {
      try {
        const v = localStorage.getItem(`pord_${k}`);
        if (v) out[k] = JSON.parse(v);
      } catch (_) {}
    }
    return out;
  });
  const reorderingRef = useRef(false);

  // ---- initial load + realtime subscription ----
  const reload = useCallback(async (which) => {
    if (reorderingRef.current) return; // suppress intermediate reloads during reorder
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

  // ---- mutations ----
  const setStarter = async (posId, playerId) => {
    const slot = roster[posId] || [];
    const idx = slot.findIndex(p => p.id === playerId);
    if (idx <= 0) return;
    // Optimistic: move to front immediately so pitch updates without waiting for DB
    setRoster(prev => {
      const s = [...(prev[posId] || [])];
      const [promoted] = s.splice(idx, 1);
      s.unshift(promoted);
      return { ...prev, [posId]: s };
    });
    setSwap({ from: posId });
    setTimeout(() => setSwap(null), 700);
    reorderingRef.current = true;
    try {
      await SB.setStarter(posId, playerId);
      showToast(`${slot[idx].name} promosso titolare · ${posId}`);
    } catch (err) {
      console.error(err); showToast("Errore salvataggio");
    } finally {
      reorderingRef.current = false;
      reload("players");
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

  const handleProspectOrderChange = (posId, ids) => {
    localStorage.setItem(`pord_${posId}`, JSON.stringify(ids));
    setProspectOrders(prev => ({ ...prev, [posId]: ids }));
  };

  const handleReorderDepth = async (posId, playerIds) => {
    reorderingRef.current = true;
    setRoster(prev => {
      const slot = prev[posId] || [];
      const ordered = playerIds.map(id => slot.find(p => p.id === id)).filter(Boolean);
      return { ...prev, [posId]: ordered };
    });
    try { await SB.reorderPosition(posId, playerIds); }
    catch (err) { console.error(err); showToast("Errore nel riordinamento"); }
    finally {
      reorderingRef.current = false;
      reload("players");
    }
  };

  const handleConvertConfirm = async ({ number, position }) => {
    if (!converting) return;
    try {
      await SB.convertProspectToPlayer(converting, { number, position });
      const name = converting.name;
      setConverting(null);
      showToast(`${name} aggiunto alla rosa · ${position}`);
    } catch (err) { console.error(err); showToast(err.message || "Errore conversione"); }
  };

  // ---- drag-and-drop ----
  const handleDropOnPos = async (toPos) => {
    if (!dragInfo) return;
    const { playerId, fromPos } = dragInfo;
    setDragInfo(null);
    if (fromPos === toPos) return;
    try {
      await SB.movePlayer(playerId, toPos);
      showToast(`Spostato → ${toPos}`);
    } catch (err) { console.error(err); showToast("Errore spostamento"); }
  };

  // Map prospects to pitch positions via category. Many CSV categories don't have
  // a 1:1 with the 11-position grid (e.g. "Mezzala" → could be RCM/LCM), so we
  // fan out one-to-many where needed.
  const prospectsByPos = useMemo(() => {
    const FANOUT = {
      "Difensore centrale mancino": ["LCB"],
      "Difensore centrale destro":  ["RCB"],
      "Terzino sinistro":           ["LB"],
      "Terzino destro":             ["RB"],
      "Play":                       ["CM"],
      "Mezzala":                    ["LCM", "RCM"],
      "Trequartista":               ["CM"],
      "Ala destra":                 ["RW"],
      "Ala sinistra":               ["LW"],
      "Punta centrale":             ["ST"],
      "Portiere":                   ["GK"],
    };
    const out = {};
    for (const pr of prospects) {
      const targets = FANOUT[pr.category] || [];
      for (const k of targets) (out[k] = out[k] || []).push(pr);
    }
    // Apply custom ordering per position so pitch shows the correct #1 prospect
    for (const k of Object.keys(out)) {
      const order = prospectOrders[k];
      if (order) {
        const idx = new Map(order.map((id, i) => [id, i]));
        out[k].sort((a, b) => (idx.has(a.id) ? idx.get(a.id) : 999) - (idx.has(b.id) ? idx.get(b.id) : 999));
      }
    }
    return out;
  }, [prospects, prospectOrders]);

  const groups = [
    { title: "Attaccanti",     ids: ["ST", "LW", "RW"] },
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

      <main className="board">
        <section className="pitch-col">
          <Pitch roster={roster} selected={selected} onSelect={setSelected} swap={swap}
                 prospectsByPos={prospectsByPos}
                 onDragPlayer={setDragInfo}
                 onDropOnPos={handleDropOnPos}
                 dragActive={dragInfo} />
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
                             prospectsForPos={prospectsByPos[id] || []}
                             onSetStarter={setStarter}
                             onEdit={(pl)=>setEditing({...pl, position:id})}
                             onDelete={handleDelete}
                             onConvertProspect={(pr)=>setConverting(pr)}
                             onDragPlayer={setDragInfo}
                             onDropOnPos={handleDropOnPos}
                             dragActive={dragInfo}
                             highlight={selected === id}
                             editMode={editMode}
                             onProspectStatusChange={handleProspectStatus}
                             onEditProspect={(pr) => setEditingProspect(pr)}
                             onReorderDepth={handleReorderDepth}
                             prospectOrder={prospectOrders[id] || null}
                             onProspectOrderChange={handleProspectOrderChange} />
                ))}
              </div>
            </div>
          ))}
        </aside>
      </main>


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
