import React, { useState } from 'react';
import {
  useApplyLeave,
  useGetAllLeaves,
  useDeleteLeave,
  useEditLeave,
  useGetAllLeaveHistory,
} from '../../auth/server-state/employee/employeeleave/employeeleave.hook';
import { useGetMeUser } from '../../auth/server-state/employee/employeeauth/employeeauth.hook';
import {
  X, Calendar, CheckCircle, XCircle, Clock,
  Plus, Trash2, Edit2, ChevronRight, ArrowRight,
} from 'lucide-react';

/* ── DESIGN TOKENS ─────────────────────────── */
const C = {
  wine:    '#730042',
  wineD:   '#4d002c',
  wineM:   '#8c0050',
  wineL:   '#f5eaf0',
  wineFog: '#faf3f7',
  cream:   '#f9f8f2',
  slate:   '#2c2c3a',
  muted:   '#8a8a9a',
  line:    '#ede8eb',
  white:   '#ffffff',
  green:   '#1a6b3c',
  greenL:  '#eaf4ee',
  red:     '#b91c1c',
  redL:    '#fef2f2',
  blue:    '#1e40af',
  blueL:   '#eff6ff',
  amber:   '#92400e',
  amberL:  '#fffbeb',
};

/* ── LEAVE TYPE CONFIG ──────────────────────── */
const LEAVE_TYPES = [
  { value: 'el',          label: 'Earned Leave',    short: 'EL',   color: C.wine },
  { value: 'sl',          label: 'Sick Leave',      short: 'SL',   color: '#9b4d6e' },
  { value: 'ml',          label: 'Maternity Leave', short: 'ML',   color: '#c2637a', restricted: 'ml' },
  { value: 'pl',          label: 'Paternity Leave', short: 'PL',   color: '#b07850', restricted: 'pl' },
  { value: 'half_day_el', label: 'Half Day EL',     short: '1/2 EL', color: '#7a3060' },
  { value: 'half_day_sl', label: 'Half Day SL',     short: '1/2 SL', color: '#a05070' },
];

/* ── STATUS CONFIG ──────────────────────────── */
const STATUS = {
  pending_manager:     { label: 'Pending Manager', dot: C.amber,  bg: C.amberL, Icon: Clock },
  'pending_r-manager': { label: 'Pending Manager', dot: C.amber,  bg: C.amberL, Icon: Clock },
  forwarded_admin:     { label: 'Forwarded HR',    dot: C.blue,   bg: C.blueL,  Icon: ChevronRight },
  forwarded_toHr:      { label: 'Forwarded HR',    dot: C.blue,   bg: C.blueL,  Icon: ChevronRight },
  approved_manager:    { label: 'Approved',        dot: C.green,  bg: C.greenL, Icon: CheckCircle },
  'approved_r-manager':{ label: 'Approved',        dot: C.green,  bg: C.greenL, Icon: CheckCircle },
  approved_by_hr:      { label: 'Approved by HR',  dot: C.green,  bg: C.greenL, Icon: CheckCircle },
  approved_admin:      { label: 'Approved',        dot: C.green,  bg: C.greenL, Icon: CheckCircle },
  rejected_manager:    { label: 'Rejected',        dot: C.red,    bg: C.redL,   Icon: XCircle },
  rejected_by_hr:      { label: 'Rejected by HR',  dot: C.red,    bg: C.redL,   Icon: XCircle },
  rejected_admin:      { label: 'Rejected',        dot: C.red,    bg: C.redL,   Icon: XCircle },
};

const JOURNEY_STEPS = ['Submitted', 'Manager Review', 'HR / Admin', 'Approved'];

/* ── HELPERS ────────────────────────────────── */
const fmt = d =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const daysBetween = (s, e) => {
  if (!s || !e) return 0;
  const n = Math.floor((new Date(e) - new Date(s)) / 86400000) + 1;
  return n > 0 ? n : 0;
};

const isPending = s => s === 'pending_manager' || s === 'pending_r-manager';
const EMPTY = { leaveType: '', startDate: '', endDate: '', reason: '' };
const todayStr = () => new Date().toISOString().split('T')[0];

const stepIdx = status => {
  if (!status || status === 'submitted') return 0;
  if (isPending(status)) return 1;
  if (status.includes('forwarded')) return 2;
  if (status.includes('approved')) return 3;
  return -1;
};

/* ── ATOMS ──────────────────────────────────── */
const StatusPill = ({ status }) => {
  const s = STATUS[status] || { label: status || 'Unknown', dot: C.muted, bg: '#f5f5f5' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
      background: s.bg, color: s.dot, padding: '4px 12px',
      borderRadius: 99, fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {s.label}
    </span>
  );
};

const TypeTag = ({ value }) => {
  const t = LEAVE_TYPES.find(x => x.value === value) || { short: (value || '?').toUpperCase(), color: C.wine };
  return (
    <span style={{ background: t.color + '15', color: t.color, border: `1px solid ${t.color}25`,
      padding: '3px 11px', borderRadius: 99, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.03em' }}>
      {t.short}
    </span>
  );
};

/* ── JOURNEY TRACKER ────────────────────────── */
const Journey = ({ leave }) => {
  if (!leave) return (
    <div style={{ textAlign: 'center', padding: '44px 0', color: C.muted }}>
      <Calendar size={38} style={{ opacity: 0.25, display: 'block', margin: '0 auto 12px' }} />
      <p style={{ margin: 0, fontSize: 14 }}>No leave applications yet.</p>
    </div>
  );

  const idx = stepIdx(leave.status);
  const rejected = leave.status?.includes('rejected');
  const leaveLabel = LEAVE_TYPES.find(t => t.value === leave.leaveType)?.label || leave.leaveType;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12, marginBottom: 30 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.09em', color: C.muted, fontFamily: 'monospace' }}>Latest Application</p>
          <h3 style={{ margin: '5px 0 0', fontSize: 18, fontWeight: 800, color: C.wineD }}>
            {leaveLabel}
          </h3>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: C.muted }}>
            {fmt(leave.startDate)} to {fmt(leave.endDate)} &middot; {leave.days} day{leave.days !== 1 ? 's' : ''}
          </p>
        </div>
        <StatusPill status={leave.status} />
      </div>

      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {JOURNEY_STEPS.map((step, i) => {
          const done    = !rejected && i < idx;
          const current = !rejected && i === idx;
          const isLast  = i === JOURNEY_STEPS.length - 1;
          const showRejected = rejected && i === JOURNEY_STEPS.length - 1;

          return (
            <React.Fragment key={step}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: showRejected ? C.red : (done || current) ? C.wine : C.line,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: current ? `0 0 0 5px ${C.wine}20` : 'none',
                  border: current ? `2.5px solid ${C.wineD}` : '2.5px solid transparent',
                  transition: 'all 0.3s',
                }}>
                  {showRejected
                    ? <XCircle size={18} color="#fff" />
                    : (done || current)
                      ? <CheckCircle size={18} color="#fff" />
                      : <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.muted }} />}
                </div>
                <span style={{ fontSize: 11, fontWeight: current ? 800 : 500, textAlign: 'center',
                  lineHeight: 1.3, paddingInline: 2,
                  color: showRejected ? C.red : (done || current) ? C.wineD : C.muted }}>
                  {showRejected ? 'Rejected' : step}
                </span>
              </div>
              {!isLast && (
                <div style={{ flex: 2, height: 3, marginTop: 19, position: 'relative', borderRadius: 4, background: C.line, overflow: 'hidden' }}>
                  {!rejected && i < idx && (
                    <div style={{ position: 'absolute', inset: 0, background: C.wine, borderRadius: 4 }} />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {leave.reason && (
        <div style={{ marginTop: 22, padding: '12px 16px', background: C.wineFog,
          borderLeft: `3px solid ${C.wine}`, borderRadius: '0 10px 10px 0',
          fontSize: 13.5, color: C.slate, lineHeight: 1.6 }}>
          <span style={{ fontWeight: 700, color: C.wineD }}>Reason:</span> {leave.reason}
        </div>
      )}
    </div>
  );
};

/* ── BALANCE CARD ───────────────────────────── */
const BalCard = ({ label, value, color, sub }) => (
  <div style={{ background: C.white, borderRadius: 16, padding: '20px 22px',
    borderTop: `3px solid ${color}`,
    boxShadow: '0 1px 4px #00000008, 0 4px 16px #00000006',
    display: 'flex', flexDirection: 'column', gap: 4,
    transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${color}28`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 1px 4px #00000008, 0 4px 16px #00000006'; }}>
    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.09em', color: C.muted, fontFamily: 'monospace' }}>{label}</p>
    <p style={{ margin: 0, fontSize: 36, fontWeight: 900, color, lineHeight: 1.05 }}>{value ?? 0}</p>
    <p style={{ margin: 0, fontSize: 11.5, color: C.muted }}>{sub || 'days available'}</p>
  </div>
);

/* ── FORM ───────────────────────────────────── */
const Field = ({ label, error, children }) => (
  <div style={{ marginBottom: 18 }}>
    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700,
      color: C.slate, marginBottom: 7, textTransform: 'uppercase',
      letterSpacing: '0.07em', fontFamily: 'monospace' }}>
      {label} <span style={{ color: C.red }}>*</span>
    </label>
    {children}
    {error && <p style={{ color: C.red, fontSize: 12, marginTop: 5 }}>{error}</p>}
  </div>
);

const iStyle = err => ({
  width: '100%', padding: '11px 14px',
  border: `1.5px solid ${err ? C.red : C.line}`,
  borderRadius: 10, fontSize: 14, outline: 'none',
  background: err ? C.redL : '#fafaf9', color: C.slate,
  fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.2s',
});

const LeaveForm = ({ form, onChange, errors, types, accent }) => {
  const days = daysBetween(form.startDate, form.endDate);
  return (
    <>
      {errors.submit && (
        <div style={{ marginBottom: 18, padding: '12px 16px', background: C.redL,
          border: `1px solid ${C.red}30`, borderRadius: 10, color: C.red, fontSize: 13.5 }}>
          {errors.submit}
        </div>
      )}
      <Field label="Leave Type" error={errors.leaveType}>
        <select name="leaveType" value={form.leaveType} onChange={onChange} style={iStyle(errors.leaveType)}>
          <option value="">Select a type...</option>
          {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Start Date" error={errors.startDate}>
          <input type="date" name="startDate" value={form.startDate}
            onChange={onChange} min={todayStr()} style={iStyle(errors.startDate)} />
        </Field>
        <Field label="End Date" error={errors.endDate}>
          <input type="date" name="endDate" value={form.endDate}
            onChange={onChange} min={form.startDate || todayStr()} style={iStyle(errors.endDate)} />
        </Field>
      </div>
      {days > 0 && (
        <div style={{ margin: '-4px 0 18px', padding: '10px 14px',
          background: accent + '12', border: `1px solid ${accent}28`,
          borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
          color: accent, fontWeight: 700, fontSize: 13.5 }}>
          <Calendar size={15} /> {days} {days === 1 ? 'day' : 'days'} requested
        </div>
      )}
      <Field label="Reason" error={errors.reason}>
        <textarea name="reason" value={form.reason} onChange={onChange} rows={4}
          placeholder="Briefly explain the reason for your leave..."
          style={{ ...iStyle(errors.reason), resize: 'vertical' }} />
      </Field>
      <p style={{ fontSize: 11.5, color: C.muted, marginTop: -10, marginBottom: 20, fontFamily: 'monospace' }}>
        {form.reason.length} / 500 chars (min 10)
      </p>
    </>
  );
};

/* ── MODAL ──────────────────────────────────── */
const Modal = ({ open, onClose, title, accent, children }) => {
  if (!open) return null;
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: '#1a001088',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 20, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: C.white, borderRadius: 22, width: '100%', maxWidth: 540,
        maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px #00000040' }}>
        <div style={{ background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
          padding: '22px 28px', borderRadius: '22px 22px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, color: C.white, fontSize: 17, fontWeight: 800 }}>{title}</h2>
          <button onClick={onClose} style={{ background: '#ffffff25', border: 'none',
            borderRadius: 8, padding: '6px 7px', cursor: 'pointer', color: C.white,
            display: 'flex', alignItems: 'center' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '26px 28px' }}>{children}</div>
      </div>
    </div>
  );
};

/* ── MAIN COMPONENT ─────────────────────────── */
const LeaveTableem = () => {
  const [showApply, setShowApply] = useState(false);
  const [showEdit,  setShowEdit]  = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const [errors,    setErrors]    = useState({});

  const { data: userData }                             = useGetMeUser();
  const { data: balanceData, isLoading: balLoading }   = useGetAllLeaves();
  const { data: historyData, isLoading: histLoading }  = useGetAllLeaveHistory();
  const applyMut  = useApplyLeave();
  const deleteMut = useDeleteLeave();
  const editMut   = useEditLeave();

  const user    = userData?.user;
  const balance = balanceData || {};
  const history = historyData?.leaves || [];
  const latest  = history[0] || null;
  const loading = balLoading || histLoading;

  const availTypes = LEAVE_TYPES.filter(t => {
    if (t.restricted === 'ml') return user?.gender === 'female' && user?.marital_status === 'married';
    if (t.restricted === 'pl') return user?.gender === 'male'   && user?.marital_status === 'married';
    return true;
  });

  const onChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.leaveType) e.leaveType = 'Select a leave type';
    if (!form.startDate) e.startDate = 'Required';
    if (!form.endDate)   e.endDate   = 'Required';
    if ((form.reason || '').trim().length < 10) e.reason = 'Minimum 10 characters required';
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate))
      e.endDate = 'End date cannot precede start date';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const closeApply = () => { setShowApply(false); setForm(EMPTY); setErrors({}); };
  const closeEdit  = () => { setShowEdit(false);  setSelected(null); setForm(EMPTY); setErrors({}); };

  const handleApply = async e => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await applyMut.mutateAsync(form);
      closeApply();
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Failed to submit leave' });
    }
  };

  const openEdit = leave => {
    setSelected(leave);
    setForm({
      leaveType: leave.leaveType,
      startDate: new Date(leave.startDate).toISOString().split('T')[0],
      endDate:   new Date(leave.endDate).toISOString().split('T')[0],
      reason:    leave.reason,
    });
    setShowEdit(true);
  };

  const handleEdit = async e => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await editMut.mutateAsync({ id: selected._id, ...form });
      closeEdit();
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Failed to update leave' });
    }
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this leave application?')) return;
    try { await deleteMut.mutateAsync(id); }
    catch (err) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const balCards = [
    { label: 'Earned Leave',        value: balance.EL,  color: C.wine },
    { label: 'Sick Leave',          value: balance.SL,  color: '#9b4d6e' },
    ...(user?.gender === 'female' && user?.marital_status === 'married'
      ? [{ label: 'Maternity Leave', value: balance.ML, color: '#c2637a' }] : []),
    ...(user?.gender === 'male' && user?.marital_status === 'married'
      ? [{ label: 'Paternity Leave', value: balance.PL, color: '#b07850' }] : []),
    { label: 'Past Balance Credit', value: balance.pbc, color: '#7a5080', sub: 'days credited' },
    { label: 'Leave Without Pay',   value: balance.lwp, color: '#a0413d', sub: 'days used' },
  ];

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', background: C.cream }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 42, height: 42, border: `3px solid ${C.wineL}`,
          borderTopColor: C.wine, borderRadius: '50%',
          animation: 'spin 0.75s linear infinite', margin: '0 auto 14px' }} />
        <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Loading...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  /* ── SECTION LABEL ── */
  const SectionLabel = ({ children }) => (
    <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.13em', color: C.muted, fontFamily: 'monospace' }}>
      {children}
    </p>
  );

  return (
    <div style={{ background: C.cream, minHeight: '100vh', fontFamily: "'Fraunces', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700;9..144,800;9..144,900&display=swap');
        * { box-sizing: border-box; }
        select, input, textarea, button { font-family: 'Fraunces', Georgia, serif; }
        input[type=date]::-webkit-calendar-picker-indicator { opacity: 0.35; cursor: pointer; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: ${C.wine}30; border-radius: 10px; }
        .card { animation: fadeUp 0.4s ease both; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
        tbody tr { transition: background 0.15s; }
        tbody tr:hover { background: ${C.wineFog}; }
      `}</style>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '36px 24px' }}>

        {/* HEADER */}
        <div className="card" style={{ display: 'flex', alignItems: 'flex-end',
          justifyContent: 'space-between', marginBottom: 36,
          flexWrap: 'wrap', gap: 16, animationDelay: '0s' }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.15em', color: C.wine, fontFamily: 'monospace' }}>
              Employee Portal
            </p>
            <h1 style={{ margin: '6px 0 4px', fontSize: 34, fontWeight: 900,
              color: C.wineD, letterSpacing: '-0.5px', lineHeight: 1.08 }}>
              Leave Management
            </h1>
            <p style={{ margin: 0, color: C.muted, fontSize: 14 }}>
              Track balances · Apply · Monitor approvals
            </p>
          </div>
          <button onClick={() => setShowApply(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            background: `linear-gradient(135deg, ${C.wine} 0%, ${C.wineM} 100%)`,
            color: C.white, border: 'none', padding: '13px 24px',
            borderRadius: 13, fontSize: 14.5, fontWeight: 800,
            cursor: 'pointer', boxShadow: `0 6px 24px ${C.wine}44`,
            fontFamily: 'inherit', letterSpacing: '0.01em',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 32px ${C.wine}55`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = `0 6px 24px ${C.wine}44`; }}>
            <Plus size={18} /> Apply for Leave
          </button>
        </div>

        {/* BALANCE */}
        <section style={{ marginBottom: 36 }}>
          <SectionLabel>Leave Balance</SectionLabel>
          <div style={{ display: 'grid', gap: 14,
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
            {balCards.map((c, i) => (
              <div key={c.label} className="card" style={{ animationDelay: `${0.05 + i * 0.06}s` }}>
                <BalCard {...c} />
              </div>
            ))}
          </div>
        </section>

        {/* LATEST STATUS */}
        <section className="card" style={{ marginBottom: 36, animationDelay: '0.3s' }}>
          <SectionLabel>Latest Leave Status</SectionLabel>
          <div style={{ background: C.white, borderRadius: 20, padding: '28px 32px',
            boxShadow: '0 2px 8px #00000008, 0 8px 32px #0000000a',
            border: `1px solid ${C.line}` }}>
            <Journey leave={latest} />
          </div>
        </section>

        {/* HISTORY TABLE */}
        <section className="card" style={{ animationDelay: '0.38s' }}>
          <SectionLabel>Leave History</SectionLabel>
          <div style={{ background: C.white, borderRadius: 20, overflow: 'hidden',
            boxShadow: '0 2px 8px #00000008, 0 8px 32px #0000000a',
            border: `1px solid ${C.line}` }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '64px 24px' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.wineL,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px' }}>
                  <Calendar size={28} color={C.wine} />
                </div>
                <p style={{ fontWeight: 800, fontSize: 16, color: C.slate, margin: '0 0 6px' }}>
                  No leave records yet
                </p>
                <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                  Click <strong style={{ color: C.wine }}>Apply for Leave</strong> to submit your first request
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: C.wineFog, borderBottom: `2px solid ${C.wine}18` }}>
                      {['Type', 'Duration', 'Days', 'Reason', 'Status', 'Applied', 'Actions'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '13px 18px',
                          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.1em', color: C.wine,
                          whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((leave, i) => (
                      <tr key={leave._id || i} style={{ borderBottom: `1px solid ${C.line}` }}>
                        <td style={{ padding: '14px 18px' }}>
                          <TypeTag value={leave.leaveType} />
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: 13, color: C.slate }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{fmt(leave.startDate)}</div>
                            <div style={{ color: C.muted, fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                              <ArrowRight size={10} /> {fmt(leave.endDate)}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <span style={{ fontWeight: 900, fontSize: 24, color: C.wine, fontFamily: 'monospace' }}>
                            {leave.days}
                          </span>
                        </td>
                        <td style={{ padding: '14px 18px', maxWidth: 200 }}>
                          <span style={{ fontSize: 13, color: C.muted,
                            display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                            title={leave.reason}>{leave.reason}</span>
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <StatusPill status={leave.status} />
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: 12, color: C.muted,
                          whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                          {fmt(leave.createdAt)}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          {isPending(leave.status) && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => openEdit(leave)} title="Edit"
                                style={{ background: C.blueL, border: 'none', borderRadius: 8,
                                  padding: '7px 8px', cursor: 'pointer', color: C.blue,
                                  display: 'flex', alignItems: 'center' }}>
                                <Edit2 size={14} />
                              </button>
                              <button onClick={() => handleDelete(leave._id)} title="Delete"
                                style={{ background: C.redL, border: 'none', borderRadius: 8,
                                  padding: '7px 8px', cursor: 'pointer', color: C.red,
                                  display: 'flex', alignItems: 'center' }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* APPLY MODAL */}
      <Modal open={showApply} onClose={closeApply} title="Apply for Leave" accent={C.wine}>
        <form onSubmit={handleApply}>
          <LeaveForm form={form} onChange={onChange} errors={errors} types={availTypes} accent={C.wine} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={applyMut.isLoading}
              style={{ flex: 1, background: C.wine, color: C.white, border: 'none',
                padding: '13px', borderRadius: 11, fontSize: 14.5, fontWeight: 700,
                cursor: applyMut.isLoading ? 'not-allowed' : 'pointer',
                opacity: applyMut.isLoading ? 0.65 : 1, fontFamily: 'inherit' }}>
              {applyMut.isLoading ? 'Submitting...' : 'Submit Request'}
            </button>
            <button type="button" onClick={closeApply}
              style={{ padding: '13px 22px', border: `1.5px solid ${C.line}`,
                background: 'transparent', borderRadius: 11, fontSize: 14.5,
                fontWeight: 600, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>

      {/* EDIT MODAL */}
      <Modal open={showEdit} onClose={closeEdit} title="Edit Leave Request" accent={C.blue}>
        <form onSubmit={handleEdit}>
          <LeaveForm form={form} onChange={onChange} errors={errors} types={availTypes} accent={C.blue} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={editMut.isLoading}
              style={{ flex: 1, background: C.blue, color: C.white, border: 'none',
                padding: '13px', borderRadius: 11, fontSize: 14.5, fontWeight: 700,
                cursor: editMut.isLoading ? 'not-allowed' : 'pointer',
                opacity: editMut.isLoading ? 0.65 : 1, fontFamily: 'inherit' }}>
              {editMut.isLoading ? 'Updating...' : 'Update Request'}
            </button>
            <button type="button" onClick={closeEdit}
              style={{ padding: '13px 22px', border: `1.5px solid ${C.line}`,
                background: 'transparent', borderRadius: 11, fontSize: 14.5,
                fontWeight: 600, color: C.muted, cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default LeaveTableem;