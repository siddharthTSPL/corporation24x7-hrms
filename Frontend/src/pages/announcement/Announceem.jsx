import React, { useState } from 'react';
import { useGetAnnouncements, useGetAnnouncement } from '../../auth/server-state/employee/employeeannounce/employeeannounce.hook';
import { X, Megaphone, Clock, Tag, ChevronRight, Rss, AlertTriangle, Info, Star } from 'lucide-react';

/* ── TOKENS ─────────────────────────────────── */
const C = {
  bg:      '#0f0d0b',
  surface: '#181512',
  card:    '#1e1a16',
  cardHov: '#242018',
  border:  '#2e2820',
  gold:    '#c9a84c',
  goldL:   '#e8c97a',
  goldFog: '#c9a84c18',
  cream:   '#f0ead8',
  muted:   '#7a6e5e',
  mutedL:  '#a09080',
  red:     '#e05a3a',
  redL:    '#e05a3a18',
  blue:    '#4a90d9',
  blueL:   '#4a90d918',
  green:   '#5aa87a',
  greenL:  '#5aa87a18',
  white:   '#ffffff',
};

/* ── AUDIENCE / PRIORITY TAGS ────────────────── */
const PRIORITY_META = {
  high:   { label: 'Urgent',  color: C.red,   bg: C.redL,   Icon: AlertTriangle },
  medium: { label: 'Info',    color: C.blue,  bg: C.blueL,  Icon: Info },
  low:    { label: 'General', color: C.green, bg: C.greenL, Icon: Star },
};

/* ── HELPERS ─────────────────────────────────── */
const fmtDate = d => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
};

const fmtTime = d => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const excerpt = (text, len = 130) => {
  if (!text) return '';
  return text.length > len ? text.slice(0, len).trimEnd() + '…' : text;
};

/* ── PRIORITY PILL ───────────────────────────── */
const PriorityPill = ({ priority }) => {
  const m = PRIORITY_META[priority] || PRIORITY_META.low;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
      background: m.bg, color: m.color, padding: '3px 10px',
      borderRadius: 99, fontSize: 11, fontWeight: 700,
      letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'monospace',
      border: `1px solid ${m.color}30` }}>
      <m.Icon size={10} /> {m.label}
    </span>
  );
};

/* ── DETAIL MODAL ────────────────────────────── */
const DetailModal = ({ id, onClose }) => {
  const { data, isLoading } = useGetAnnouncement(id);
  const ann = data?.announcement;

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: '#000000cc',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 20, backdropFilter: 'blur(6px)' }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 20, width: '100%', maxWidth: 620,
        maxHeight: '88vh', overflowY: 'auto',
        boxShadow: `0 40px 100px #000000aa, 0 0 0 1px ${C.gold}22` }}>

        {/* Modal top bar */}
        <div style={{ padding: '20px 26px', borderBottom: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: `linear-gradient(135deg, ${C.card} 0%, ${C.surface} 100%)`,
          borderRadius: '20px 20px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10,
              background: C.goldFog, border: `1px solid ${C.gold}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Megaphone size={16} color={C.gold} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.gold,
              textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
              Announcement Detail
            </span>
          </div>
          <button onClick={onClose} style={{ background: C.border, border: 'none',
            borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
            color: C.mutedL, display: 'flex', alignItems: 'center',
            justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        {/* Modal body */}
        <div style={{ padding: '28px 28px 32px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`,
                borderTopColor: C.gold, borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ color: C.muted, margin: 0, fontSize: 13 }}>Loading...</p>
            </div>
          ) : ann ? (
            <>
              {/* Meta row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                flexWrap: 'wrap', marginBottom: 18 }}>
                {ann.priority && <PriorityPill priority={ann.priority} />}
                {ann.category && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                    color: C.muted, fontSize: 11, fontFamily: 'monospace',
                    textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    <Tag size={10} /> {ann.category}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: C.muted,
                  fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={10} /> {fmtDate(ann.createdAt)} · {fmtTime(ann.createdAt)}
                </span>
              </div>

              {/* Title */}
              <h2 style={{ margin: '0 0 20px', fontSize: 26, fontWeight: 900,
                color: C.cream, lineHeight: 1.2, letterSpacing: '-0.3px' }}>
                {ann.title}
              </h2>

              {/* Divider */}
              <div style={{ height: 1, background: `linear-gradient(90deg, ${C.gold}60, transparent)`,
                marginBottom: 24 }} />

              {/* Body */}
              <p style={{ margin: 0, fontSize: 15.5, color: C.mutedL, lineHeight: 1.8 }}>
                {ann.content || ann.message || ann.description || 'No content available.'}
              </p>

              {/* Footer */}
              {ann.postedBy && (
                <div style={{ marginTop: 28, paddingTop: 18, borderTop: `1px solid ${C.border}`,
                  display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%',
                    background: C.goldFog, border: `1px solid ${C.gold}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: C.gold }}>
                    {(ann.postedBy?.f_name || ann.postedBy?.name || 'A')[0].toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.cream }}>
                      {ann.postedBy?.f_name ? `${ann.postedBy.f_name} ${ann.postedBy.l_name || ''}` : ann.postedBy?.name || 'Admin'}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: C.muted }}>
                      {ann.postedBy?.role || 'Management'}
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: C.muted, textAlign: 'center', padding: '32px 0' }}>
              Announcement not found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── CARD ────────────────────────────────────── */
const AnnCard = ({ ann, index, onClick }) => {
  const [hov, setHov] = useState(false);
  const isFeatured = index === 0;

  return (
    <div onClick={() => onClick(ann._id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? C.cardHov : C.card,
        border: `1px solid ${hov ? C.gold + '40' : C.border}`,
        borderRadius: 16,
        padding: isFeatured ? '28px 28px 24px' : '22px 24px 20px',
        cursor: 'pointer',
        transition: 'all 0.22s ease',
        boxShadow: hov ? `0 8px 32px #000000aa, 0 0 0 1px ${C.gold}18` : '0 2px 8px #00000060',
        transform: hov ? 'translateY(-2px)' : 'none',
        gridColumn: isFeatured ? 'span 2' : 'span 1',
        animation: `fadeUp 0.4s ease both`,
        animationDelay: `${index * 0.07}s`,
        position: 'relative',
        overflow: 'hidden',
      }}>

      {/* Featured glow accent */}
      {isFeatured && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${C.gold}, ${C.goldL}, transparent)` }} />
      )}

      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start',
        justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {ann.priority && <PriorityPill priority={ann.priority} />}
          {isFeatured && (
            <span style={{ fontSize: 10, fontWeight: 800, color: C.gold,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Rss size={9} /> Featured
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace',
          whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={10} /> {fmtDate(ann.createdAt)}
        </span>
      </div>

      {/* Title */}
      <h3 style={{ margin: '0 0 10px', fontSize: isFeatured ? 22 : 16,
        fontWeight: 800, color: hov ? C.cream : '#d8cfc0',
        lineHeight: 1.25, letterSpacing: '-0.2px',
        transition: 'color 0.2s' }}>
        {ann.title}
      </h3>

      {/* Excerpt */}
      <p style={{ margin: '0 0 18px', fontSize: 13.5, color: C.muted, lineHeight: 1.7 }}>
        {excerpt(ann.content || ann.message || ann.description, isFeatured ? 200 : 100)}
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {ann.category && (
          <span style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace',
            textTransform: 'uppercase', letterSpacing: '0.07em',
            display: 'flex', alignItems: 'center', gap: 4 }}>
            <Tag size={10} /> {ann.category}
          </span>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center',
          gap: 4, fontSize: 12, fontWeight: 700, color: hov ? C.gold : C.muted,
          transition: 'color 0.2s' }}>
          Read more <ChevronRight size={13} />
        </span>
      </div>
    </div>
  );
};

/* ── MAIN ────────────────────────────────────── */
const Announceem = () => {
  const { data, isLoading, isError } = useGetAnnouncements();
  const [selectedId, setSelectedId] = useState(null);

  const announcements = data?.announcements || [];

  return (
    <div style={{ background: C.bg, minHeight: '100vh',
      fontFamily: "'Playfair Display', 'Georgia', serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800;900&family=Syne+Mono&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
        button, span, p, a { font-family: 'Playfair Display', Georgia, serif; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ marginBottom: 44, animation: 'fadeUp 0.5s ease both' }}>
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10,
              background: C.goldFog, border: `1px solid ${C.gold}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Megaphone size={17} color={C.gold} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.gold,
              textTransform: 'uppercase', letterSpacing: '0.16em',
              fontFamily: 'monospace' }}>
              Company Bulletin
            </span>
            {/* Live indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5,
              marginLeft: 'auto', padding: '4px 10px', background: C.greenL,
              borderRadius: 99, border: `1px solid ${C.green}30` }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%',
                background: C.green, animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: C.green,
                fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Live
              </span>
            </div>
          </div>

          <h1 style={{ margin: '0 0 10px', fontSize: 42, fontWeight: 900,
            color: C.cream, letterSpacing: '-1px', lineHeight: 1.05 }}>
            Announcements
          </h1>

          {/* Ruled line with count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
            <div style={{ flex: 1, height: 1,
              background: `linear-gradient(90deg, ${C.gold}60, ${C.border})` }} />
            <span style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace',
              whiteSpace: 'nowrap' }}>
              {announcements.length} {announcements.length === 1 ? 'post' : 'posts'}
            </span>
          </div>
        </div>

        {/* ── LOADING ── */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
            <div style={{ width: 42, height: 42, border: `3px solid ${C.border}`,
              borderTopColor: C.gold, borderRadius: '50%',
              animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: C.muted, margin: 0, fontSize: 13, fontFamily: 'monospace' }}>
              Loading announcements...
            </p>
          </div>
        )}

        {/* ── ERROR ── */}
        {isError && (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <AlertTriangle size={40} color={C.red} style={{ marginBottom: 14 }} />
            <p style={{ color: C.red, fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>
              Failed to load announcements
            </p>
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
              Please try refreshing the page.
            </p>
          </div>
        )}

        {/* ── EMPTY ── */}
        {!isLoading && !isError && announcements.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%',
              background: C.goldFog, border: `1px solid ${C.gold}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px' }}>
              <Megaphone size={30} color={C.gold} />
            </div>
            <h3 style={{ color: C.cream, margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>
              Nothing yet
            </h3>
            <p style={{ color: C.muted, margin: 0, fontSize: 14 }}>
              New announcements will appear here.
            </p>
          </div>
        )}

        {/* ── GRID ── */}
        {!isLoading && announcements.length > 0 && (
          <div style={{ display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 16 }}>
            {announcements.map((ann, i) => (
              <AnnCard key={ann._id} ann={ann} index={i} onClick={setSelectedId} />
            ))}
          </div>
        )}
      </div>

      {/* ── DETAIL MODAL ── */}
      {selectedId && (
        <DetailModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
};

export default Announceem;