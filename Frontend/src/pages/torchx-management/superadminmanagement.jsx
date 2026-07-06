import React, { useCallback, useMemo, useState } from 'react';
import {
  Clock,
  CalendarDays,
  Users,
  Settings2,
  Plus,
  X,
  Star,
  Trash2,
  Pencil,
  Check,
  AlertTriangle,
  Loader2,
  UserPlus,
  ShieldCheck,
} from 'lucide-react';
import {
  useGetAllShiftsSuperAdmin,
  useCreateShiftSuperAdmin,
  useUpdateShiftSuperAdmin,
  useSetDefaultShiftSuperAdmin,
  useDeleteShiftSuperAdmin,
  useAssignShiftToUserSuperAdmin,
} from '../../auth/server-state/superadmin/shift/sushift.hook';
import {
  useGetPolicySuperAdmin,
  useSetPolicySuperAdmin,
  useListGroupsSuperAdmin,
  useCreateGroupSuperAdmin,
  useAddGroupMembersSuperAdmin,
  useRemoveGroupMemberSuperAdmin,
  useSetWeekScheduleSuperAdmin,
  useSetWeekScheduleForMonthSuperAdmin,
  useGetWeekSchedulesSuperAdmin,
  useBulkAddHolidaysSuperAdmin,
  useBulkEditHolidaysSuperAdmin,
  useDeleteHolidaySuperAdmin,
  useListHolidaysSuperAdmin,
  useSetEmployeeOverrideSuperAdmin,
  useRemoveEmployeeOverrideSuperAdmin,
} from '../../auth/server-state/superadmin/holidaypolicy/suholidaypolicy.hook';
import {
  useGetAllEmployees,
  useGetAllManagers,
  useGetAllAdmins,
} from '../../auth/server-state/superadmin/other/suother.hook';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABEL = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
const ROLE_OPTIONS = [
  { role: 'employee', model: 'User', label: 'Employee' },
  { role: 'manager', model: 'Manager', label: 'Manager' },
  { role: 'admin', model: 'Admin', label: 'Admin' },
];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function today() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

function toISODate(d) {
  const dt = new Date(d);
  const off = dt.getTimezoneOffset();
  return new Date(dt.getTime() - off * 60000).toISOString().slice(0, 10);
}

function errMsg(e, fallback) {
  return e?.response?.data?.message || fallback;
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);
  return { toasts, notify: push };
}

function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm text-sm font-medium ${
            t.type === 'error'
              ? 'bg-rose-50/95 border-rose-200 text-rose-700'
              : 'bg-emerald-50/95 border-emerald-200 text-emerald-700'
          }`}
        >
          {t.type === 'error' ? <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> : <Check className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4">
      <div className={`w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500 transition-colors';

function Button({ children, onClick, variant = 'primary', className = '', disabled, type = 'button' }) {
  const styles = {
    primary: 'bg-violet-700 text-white hover:bg-violet-800 shadow-sm shadow-violet-900/10',
    ghost: 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50',
    subtle: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function DayPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {DAYS.map((d) => {
        const active = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(active ? value.filter((x) => x !== d) : [...value, d])}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              active ? 'bg-violet-700 border-violet-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300'
            }`}
          >
            {DAY_LABEL[d]}
          </button>
        );
      })}
    </div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, action, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center shrink-0">
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function EmptyRow({ text }) {
  return <div className="text-sm text-slate-400 text-center py-8 border border-dashed border-slate-200 rounded-xl">{text}</div>;
}

function personLabel(p) {
  const name = `${p?.f_name || ''} ${p?.l_name || ''}`.trim() || p?.uid || 'Unnamed';
  const extra = p?.designation || p?.department || p?.work_email || p?.email;
  return extra ? `${name} — ${extra}` : name;
}

function usePeopleByRole() {
  const employeesQuery = useGetAllEmployees();
  const managersQuery = useGetAllManagers();
  const adminsQuery = useGetAllAdmins();

  const employees = useMemo(() => {
    const raw = employeesQuery.data?.users || employeesQuery.data?.employees || employeesQuery.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [employeesQuery.data]);

  const managers = useMemo(() => {
    const raw = managersQuery.data?.managers || managersQuery.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [managersQuery.data]);

  const admins = useMemo(() => {
    const raw = adminsQuery.data?.admins || adminsQuery.data || [];
    return Array.isArray(raw) ? raw : [];
  }, [adminsQuery.data]);

  return {
    byRole: { employee: employees, manager: managers, admin: admins },
    isLoading: employeesQuery.isLoading || managersQuery.isLoading || adminsQuery.isLoading,
  };
}

function PersonSelect({ role, value, onChange, people, loading, className, placeholder = 'Select a person' }) {
  const list = people?.[role] || [];
  return (
    <select className={className || inputCls} value={value} onChange={(e) => onChange(e.target.value)} disabled={loading}>
      <option value="">{loading ? 'Loading…' : list.length ? placeholder : 'No one found'}</option>
      {list.map((p) => (
        <option key={p._id} value={p._id}>
          {personLabel(p)}
        </option>
      ))}
    </select>
  );
}

const emptyShiftForm = {
  name: '',
  startTime: '09:00',
  endTime: '18:00',
  graceMinutes: 15,
  earlyBufferMinutes: 60,
  absentBelowMinutes: 120,
  halfDayBelowMinutes: 180,
};

function ShiftsPanel({ notify }) {
  const shiftsQuery = useGetAllShiftsSuperAdmin();
  const shifts = shiftsQuery.data?.shifts || [];

  const { byRole: people, isLoading: peopleLoading } = usePeopleByRole();

  const createShift = useCreateShiftSuperAdmin();
  const updateShift = useUpdateShiftSuperAdmin();
  const setDefaultShift = useSetDefaultShiftSuperAdmin();
  const deleteShift = useDeleteShiftSuperAdmin();
  const assignShift = useAssignShiftToUserSuperAdmin();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyShiftForm);
  const [assignForm, setAssignForm] = useState({ employee_id: '', role: 'employee', shift_id: '' });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyShiftForm);
    setModalOpen(true);
  };

  const openEdit = (shift) => {
    setEditing(shift);
    setForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      graceMinutes: shift.graceMinutes,
      earlyBufferMinutes: shift.earlyBufferMinutes,
      absentBelowMinutes: shift.absentBelowMinutes,
      halfDayBelowMinutes: shift.halfDayBelowMinutes,
    });
    setModalOpen(true);
  };

  const submitShift = () => {
    if (!form.name || !form.startTime || !form.endTime) {
      notify('error', 'Name, start time and end time are required');
      return;
    }
    if (editing) {
      updateShift.mutate(
        { id: editing._id, data: form },
        {
          onSuccess: () => {
            notify('success', 'Shift updated');
            setModalOpen(false);
          },
          onError: (e) => notify('error', errMsg(e, 'Could not update shift')),
        }
      );
    } else {
      createShift.mutate(form, {
        onSuccess: () => {
          notify('success', 'Shift created');
          setModalOpen(false);
        },
        onError: (e) => notify('error', errMsg(e, 'Could not create shift')),
      });
    }
  };

  const makeDefault = (id) => {
    setDefaultShift.mutate(id, {
      onSuccess: () => notify('success', 'Default shift updated'),
      onError: (e) => notify('error', errMsg(e, 'Could not set default')),
    });
  };

  const removeShift = (shift) => {
    if (shift.isDefault) {
      notify('error', 'Set another shift as default before deactivating this one');
      return;
    }
    deleteShift.mutate(shift._id, {
      onSuccess: () => notify('success', 'Shift deactivated'),
      onError: (e) => notify('error', errMsg(e, 'Could not deactivate shift')),
    });
  };

  const submitAssign = () => {
    if (!assignForm.employee_id) {
      notify('error', 'Please select a person');
      return;
    }
    assignShift.mutate(
      { employee_id: assignForm.employee_id, role: assignForm.role, shift_id: assignForm.shift_id || null },
      {
        onSuccess: () => {
          notify('success', 'Shift assigned');
          setAssignForm({ employee_id: '', role: 'employee', shift_id: '' });
        },
        onError: (e) => notify('error', errMsg(e, 'Could not assign shift')),
      }
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionCard
        icon={Clock}
        title="Shifts"
        subtitle="Working hours, grace period and attendance thresholds"
        action={
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="w-4 h-4" /> New shift
          </Button>
        }
      >
        {shiftsQuery.isLoading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : shifts.length === 0 ? (
          <EmptyRow text="No shifts yet. Create the first one to get started." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {shifts.map((s) => (
              <div key={s._id} className="rounded-xl border border-slate-200 p-4 flex flex-col gap-3 hover:border-violet-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-semibold text-slate-800 text-sm">{s.name}</h3>
                      {s.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {s.startTime} – {s.endTime}
                      <span className="text-slate-300 mx-1.5">·</span>
                      {s.durationMinutes ? `${Math.round((s.durationMinutes / 60) * 10) / 10}h` : ''}
                    </p>
                  </div>
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                  <span>Grace</span>
                  <span className="text-slate-700 font-medium text-right">{s.graceMinutes} min</span>
                  <span>Early check-in</span>
                  <span className="text-slate-700 font-medium text-right">{s.earlyBufferMinutes} min</span>
                  <span>Absent below</span>
                  <span className="text-slate-700 font-medium text-right">{s.absentBelowMinutes} min</span>
                  <span>Half-day below</span>
                  <span className="text-slate-700 font-medium text-right">{s.halfDayBelowMinutes} min</span>
                </div>
                <div className="flex gap-2 pt-1">
                  {!s.isDefault && (
                    <Button variant="subtle" className="flex-1 text-xs py-1.5" onClick={() => makeDefault(s._id)}>
                      Set default
                    </Button>
                  )}
                  <Button variant="danger" className="flex-1 text-xs py-1.5" onClick={() => removeShift(s)}>
                    <Trash2 className="w-3.5 h-3.5" /> Deactivate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard icon={UserPlus} title="Assign shift to a person" subtitle="Choose who follows which shift; leave shift empty to use the org default">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <Field label="Role">
            <select
              className={inputCls}
              value={assignForm.role}
              onChange={(e) => setAssignForm((f) => ({ ...f, role: e.target.value, employee_id: '' }))}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Person">
            <PersonSelect
              role={assignForm.role}
              value={assignForm.employee_id}
              onChange={(v) => setAssignForm((f) => ({ ...f, employee_id: v }))}
              people={people}
              loading={peopleLoading}
            />
          </Field>
          <Field label="Shift">
            <select className={inputCls} value={assignForm.shift_id} onChange={(e) => setAssignForm((f) => ({ ...f, shift_id: e.target.value }))}>
              <option value="">Org default</option>
              {shifts.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Button onClick={submitAssign} disabled={assignShift.isPending} className="h-[38px]">
            {assignShift.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
          </Button>
        </div>
      </SectionCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit shift' : 'New shift'}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Name">
              <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. General Shift" />
            </Field>
          </div>
          <Field label="Start time">
            <input type="time" className={inputCls} value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
          </Field>
          <Field label="End time">
            <input type="time" className={inputCls} value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
          </Field>
          <Field label="Grace minutes">
            <input
              type="number"
              className={inputCls}
              value={form.graceMinutes}
              onChange={(e) => setForm((f) => ({ ...f, graceMinutes: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Early check-in buffer">
            <input
              type="number"
              className={inputCls}
              value={form.earlyBufferMinutes}
              onChange={(e) => setForm((f) => ({ ...f, earlyBufferMinutes: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Absent below (minutes)">
            <input
              type="number"
              className={inputCls}
              value={form.absentBelowMinutes}
              onChange={(e) => setForm((f) => ({ ...f, absentBelowMinutes: Number(e.target.value) }))}
            />
          </Field>
          <Field label="Half-day below (minutes)">
            <input
              type="number"
              className={inputCls}
              value={form.halfDayBelowMinutes}
              onChange={(e) => setForm((f) => ({ ...f, halfDayBelowMinutes: Number(e.target.value) }))}
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-5">
          <Button variant="ghost" onClick={() => setModalOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submitShift} disabled={createShift.isPending || updateShift.isPending}>
            {createShift.isPending || updateShift.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Save changes' : 'Create shift'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function ymd(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function startOfGridMonday(year, month) {
  const jsDay = new Date(year, month - 1, 1).getDay();
  return (jsDay + 6) % 7;
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function dateRangeInclusive(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const [lo, hi] = start <= end ? [start, end] : [end, start];
  const out = [];
  const cur = new Date(lo);
  while (cur <= hi) {
    out.push(toISODate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function HolidayCalendar({ month, year, holidays, onAddRange, onEditHoliday, onDeleteHoliday, adding, editing, deleting }) {
  const holidaysByDate = useMemo(() => {
    const map = {};
    holidays.forEach((h) => {
      map[toISODate(h.date)] = h;
    });
    return map;
  }, [holidays]);

  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [rangeName, setRangeName] = useState('');

  const [editingHoliday, setEditingHoliday] = useState(null);
  const [editName, setEditName] = useState('');

  const blanks = startOfGridMonday(year, month);
  const totalDays = daysInMonth(year, month);
  const cells = [];
  for (let i = 0; i < blanks; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  const selectedDates = rangeStart ? dateRangeInclusive(rangeStart, rangeEnd || rangeStart) : [];

  const clearSelection = () => {
    setRangeStart(null);
    setRangeEnd(null);
    setRangeName('');
  };

  const handleDayClick = (dateStr) => {
    const existing = holidaysByDate[dateStr];
    if (existing) {
      clearSelection();
      setEditingHoliday(existing);
      setEditName(existing.name);
      return;
    }
    setEditingHoliday(null);
    if (!rangeStart || (rangeStart && rangeEnd && rangeStart !== rangeEnd)) {
      setRangeStart(dateStr);
      setRangeEnd(dateStr);
    } else {
      setRangeEnd(dateStr);
    }
  };

  const submitRange = () => {
    if (!rangeName.trim() || !selectedDates.length) return;
    onAddRange(selectedDates, rangeName.trim(), clearSelection);
  };

  const submitEdit = () => {
    if (!editName.trim() || !editingHoliday) return;
    onEditHoliday(editingHoliday, editName.trim(), () => setEditingHoliday(null));
  };

  const submitDelete = () => {
    if (!editingHoliday) return;
    onDeleteHoliday(editingHoliday._id, () => setEditingHoliday(null));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {DAYS.map((d) => (
          <div key={d} className="text-[10px] sm:text-[11px] font-semibold uppercase text-slate-400 text-center py-1">
            {DAY_LABEL[d]}
          </div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`b-${idx}`} />;
          const dateStr = ymd(year, month, day);
          const holiday = holidaysByDate[dateStr];
          const inSelection = selectedDates.includes(dateStr);
          const isEditingThis = editingHoliday && toISODate(editingHoliday.date) === dateStr;
          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleDayClick(dateStr)}
              title={holiday ? holiday.name : 'Click to add a holiday'}
              className={`aspect-square rounded-lg text-[11px] sm:text-xs font-medium flex flex-col items-center justify-center gap-0.5 border transition-colors ${
                holiday
                  ? isEditingThis
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-400'
                  : inSelection
                  ? 'bg-violet-100 border-violet-400 text-violet-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
              }`}
            >
              <span>{day}</span>
              {holiday && <span className="w-1 h-1 rounded-full bg-current" />}
            </button>
          );
        })}
      </div>

      {rangeStart && !editingHoliday && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-1.5">
              {selectedDates.length > 1 ? `${selectedDates.length} days selected` : '1 day selected'}
            </p>
            <p className="text-xs text-slate-500 mb-2">
              {selectedDates[0]}
              {selectedDates.length > 1 ? ` – ${selectedDates[selectedDates.length - 1]}` : ''}
            </p>
            <input
              className={inputCls}
              placeholder="Holiday name, e.g. Diwali"
              value={rangeName}
              onChange={(e) => setRangeName(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={clearSelection}>
              Cancel
            </Button>
            <Button onClick={submitRange} disabled={adding || !rangeName.trim()}>
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add holiday'}
            </Button>
          </div>
        </div>
      )}

      {editingHoliday && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{toISODate(editingHoliday.date)}</p>
            <input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditingHoliday(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={submitDelete} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </>
              )}
            </Button>
            <Button onClick={submitEdit} disabled={editing || !editName.trim()}>
              {editing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400">
        Click an empty day to add a holiday. Click a second day to span a range, for a multi-day holiday. Click an existing holiday to edit or delete it.
      </p>
    </div>
  );
}

function HolidaysPanel({ notify }) {
  const [filter, setFilter] = useState(today());
  const holidaysQuery = useListHolidaysSuperAdmin(filter);
  const holidays = holidaysQuery.data?.holidays || [];

  const bulkAddHolidays = useBulkAddHolidaysSuperAdmin();
  const bulkEditHolidays = useBulkEditHolidaysSuperAdmin();
  const deleteHoliday = useDeleteHolidaySuperAdmin();

  const addRange = (dates, name, onDone) => {
    bulkAddHolidays.mutate(
      { holidays: dates.map((date) => ({ date, name })) },
      {
        onSuccess: () => {
          notify('success', dates.length > 1 ? `Holiday added for ${dates.length} days` : 'Holiday added');
          onDone();
        },
        onError: (e) => notify('error', errMsg(e, 'Could not add holiday')),
      }
    );
  };

  const editHoliday = (holiday, name, onDone) => {
    bulkEditHolidays.mutate(
      { holidays: [{ id: holiday._id, name }] },
      {
        onSuccess: () => {
          notify('success', 'Holiday updated');
          onDone();
        },
        onError: (e) => notify('error', errMsg(e, 'Could not update holiday')),
      }
    );
  };

  const deleteHolidayById = (id, onDone) => {
    deleteHoliday.mutate(id, {
      onSuccess: () => {
        notify('success', 'Holiday removed');
        onDone();
      },
      onError: (e) => notify('error', errMsg(e, 'Could not remove holiday')),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <SectionCard icon={CalendarDays} title="Holiday calendar" subtitle="Dates the whole organisation gets off, regardless of week-off policy">
        <div className="flex items-center gap-3 mb-4">
          <select className={`${inputCls} w-auto`} value={filter.month} onChange={(e) => setFilter((f) => ({ ...f, month: Number(e.target.value) }))}>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select className={`${inputCls} w-auto`} value={filter.year} onChange={(e) => setFilter((f) => ({ ...f, year: Number(e.target.value) }))}>
            {[filter.year - 1, filter.year, filter.year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {holidaysQuery.isLoading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <HolidayCalendar
            month={filter.month}
            year={filter.year}
            holidays={holidays}
            onAddRange={addRange}
            onEditHoliday={editHoliday}
            onDeleteHoliday={deleteHolidayById}
            adding={bulkAddHolidays.isPending}
            editing={bulkEditHolidays.isPending}
            deleting={deleteHoliday.isPending}
          />
        )}
      </SectionCard>
    </div>
  );
}

function WeekOffPanel({ notify }) {
  const { byRole: people, isLoading: peopleLoading } = usePeopleByRole();

  const policyQuery = useGetPolicySuperAdmin();
  const policy = policyQuery.data?.policy?.weekOffType || 'sunday';
  const setPolicy = useSetPolicySuperAdmin();

  const groupsQuery = useListGroupsSuperAdmin();
  const groups = groupsQuery.data?.groups || [];
  const createGroup = useCreateGroupSuperAdmin();
  const addGroupMembers = useAddGroupMembersSuperAdmin();
  const removeGroupMember = useRemoveGroupMemberSuperAdmin();

  const [groupName, setGroupName] = useState('');
  const [memberDraft, setMemberDraft] = useState({});

  const [scheduleFilter, setScheduleFilter] = useState(today());
  const schedulesQuery = useGetWeekSchedulesSuperAdmin(scheduleFilter);
  const schedules = schedulesQuery.data?.schedules || [];

  const setWeekSchedule = useSetWeekScheduleSuperAdmin();
  const setWeekScheduleForMonth = useSetWeekScheduleForMonthSuperAdmin();

  const [weekForm, setWeekForm] = useState({ weekStartDate: '', offDays: [], group: '' });
  const [monthForm, setMonthForm] = useState({ month: today().month, year: today().year, offDays: [], group: '' });

  const setEmployeeOverride = useSetEmployeeOverrideSuperAdmin();
  const removeEmployeeOverride = useRemoveEmployeeOverrideSuperAdmin();

  const [overrideForm, setOverrideForm] = useState({ employee: '', role: 'employee', weekOffType: 'sunday', fixedOffDays: [] });
  const [removeEmployeeId, setRemoveEmployeeId] = useState('');
  const [removeRole, setRemoveRole] = useState('employee');

  const savePolicy = (value) => {
    setPolicy.mutate(
      { weekOffType: value },
      {
        onSuccess: () => notify('success', 'Week-off policy updated'),
        onError: (e) => notify('error', errMsg(e, 'Could not update policy')),
      }
    );
  };

  const createGroupSubmit = () => {
    if (!groupName.trim()) {
      notify('error', 'Group name is required');
      return;
    }
    createGroup.mutate(
      { name: groupName.trim(), members: [] },
      {
        onSuccess: () => {
          notify('success', 'Group created');
          setGroupName('');
        },
        onError: (e) => notify('error', errMsg(e, 'Could not create group')),
      }
    );
  };

  const addMember = (groupId) => {
    const draft = memberDraft[groupId];
    if (!draft?.employee) {
      notify('error', 'Please select a person');
      return;
    }
    const roleInfo = ROLE_OPTIONS.find((r) => r.role === (draft.role || 'employee'));
    addGroupMembers.mutate(
      { groupId, data: { members: [{ employee: draft.employee, employeeModel: roleInfo.model }] } },
      {
        onSuccess: () => {
          notify('success', 'Member added');
          setMemberDraft((d) => ({ ...d, [groupId]: { employee: '', role: 'employee' } }));
        },
        onError: (e) => notify('error', errMsg(e, 'Could not add member')),
      }
    );
  };

  const removeMember = (groupId, employeeId) => {
    removeGroupMember.mutate(
      { groupId, employee: employeeId },
      {
        onSuccess: () => notify('success', 'Member removed'),
        onError: () => notify('error', 'Could not remove member'),
      }
    );
  };

  const submitWeekForm = () => {
    if (!weekForm.weekStartDate || weekForm.offDays.length === 0) {
      notify('error', 'Pick a week and at least one off day');
      return;
    }
    setWeekSchedule.mutate(
      { weekStartDate: weekForm.weekStartDate, offDays: weekForm.offDays, group: weekForm.group || null },
      {
        onSuccess: () => {
          notify('success', 'Week schedule saved');
          setWeekForm({ weekStartDate: '', offDays: [], group: '' });
        },
        onError: (e) => notify('error', errMsg(e, 'Could not save week schedule')),
      }
    );
  };

  const submitMonthForm = () => {
    if (monthForm.offDays.length === 0) {
      notify('error', 'Pick at least one off day');
      return;
    }
    setWeekScheduleForMonth.mutate(
      { month: monthForm.month, year: monthForm.year, offDays: monthForm.offDays, group: monthForm.group || null },
      {
        onSuccess: (res) => notify('success', `Applied to ${res.weeksSet?.length || 0} week(s)`),
        onError: (e) => notify('error', errMsg(e, 'Could not save month schedule')),
      }
    );
  };

  const submitOverride = () => {
    if (!overrideForm.employee) {
      notify('error', 'Please select a person');
      return;
    }
    const roleInfo = ROLE_OPTIONS.find((r) => r.role === overrideForm.role);
    setEmployeeOverride.mutate(
      {
        employee: overrideForm.employee,
        employeeModel: roleInfo.model,
        weekOffType: overrideForm.weekOffType,
        fixedOffDays: overrideForm.weekOffType === 'custom_fixed_days' ? overrideForm.fixedOffDays : undefined,
      },
      {
        onSuccess: () => {
          notify('success', 'Override saved');
          setOverrideForm({ employee: '', role: 'employee', weekOffType: 'sunday', fixedOffDays: [] });
        },
        onError: (e) => notify('error', errMsg(e, 'Could not save override')),
      }
    );
  };

  const submitRemoveOverride = () => {
    if (!removeEmployeeId) {
      notify('error', 'Please select a person');
      return;
    }
    removeEmployeeOverride.mutate(removeEmployeeId, {
      onSuccess: () => {
        notify('success', 'Override removed, employee now follows org policy');
        setRemoveEmployeeId('');
      },
      onError: () => notify('error', 'Could not remove override'),
    });
  };

  const isRotational = policy === 'rotational';

  return (
    <div className="flex flex-col gap-6">
      <SectionCard icon={Settings2} title="Week-off policy" subtitle="Choose how weekly offs work across the organisation">
        {policyQuery.isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { v: 'sunday', label: 'Sunday only', desc: 'Every employee is off on Sundays' },
              { v: 'sat_sun', label: 'Saturday & Sunday', desc: 'Weekend off, every week' },
              { v: 'rotational', label: 'Rotational', desc: 'Off-days change week to week per team' },
            ].map((opt) => (
              <button
                key={opt.v}
                onClick={() => savePolicy(opt.v)}
                disabled={setPolicy.isPending}
                className={`text-left p-4 rounded-xl border transition-colors ${
                  policy === opt.v ? 'border-violet-600 bg-violet-50/60 ring-1 ring-violet-600' : 'border-slate-200 hover:border-violet-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{opt.label}</span>
                  {policy === opt.v && <Check className="w-4 h-4 text-violet-600" />}
                </div>
                <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
              </button>
            ))}
          </div>
        )}
      </SectionCard>

      {isRotational && (
        <>
          <SectionCard icon={Users} title="Week-off groups" subtitle="Teams that can be given a different off-day in the same week">
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <input className={inputCls} placeholder="New group name, e.g. Group A" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              <Button onClick={createGroupSubmit} disabled={createGroup.isPending} className="sm:w-auto">
                <Plus className="w-4 h-4" /> Create
              </Button>
            </div>
            {groups.length === 0 ? (
              <EmptyRow text="No groups yet. The default schedule applies to everyone." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {groups.map((g) => (
                  <div key={g._id} className="rounded-xl border border-slate-200 p-4">
                    <h4 className="text-sm font-semibold text-slate-800 mb-2">{g.name}</h4>
                    <div className="flex flex-col gap-1.5 mb-3 max-h-32 overflow-y-auto">
                      {(g.members || []).length === 0 && <p className="text-xs text-slate-400">No members yet</p>}
                      {(g.members || []).map((m) => (
                        <div key={String(m.employee)} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2.5 py-1.5">
                          <span className="text-slate-600 truncate">
                            {m.employeeModel} · {String(m.employee).slice(-6)}
                          </span>
                          <button onClick={() => removeMember(g._id, m.employee)} className="text-slate-400 hover:text-rose-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        className={`${inputCls} text-xs py-1.5 sm:w-28`}
                        value={memberDraft[g._id]?.role || 'employee'}
                        onChange={(e) =>
                          setMemberDraft((d) => ({ ...d, [g._id]: { ...d[g._id], role: e.target.value, employee: '' } }))
                        }
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.role} value={r.role}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <PersonSelect
                        className={`${inputCls} text-xs py-1.5`}
                        role={memberDraft[g._id]?.role || 'employee'}
                        value={memberDraft[g._id]?.employee || ''}
                        onChange={(v) => setMemberDraft((d) => ({ ...d, [g._id]: { ...d[g._id], employee: v } }))}
                        people={people}
                        loading={peopleLoading}
                        placeholder="Choose person"
                      />
                      <Button variant="subtle" className="py-1.5 px-2.5" onClick={() => addMember(g._id)}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard icon={CalendarDays} title="Set off-days for a single week">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Week starting (any day in the week)">
                <input
                  type="date"
                  className={inputCls}
                  value={weekForm.weekStartDate}
                  onChange={(e) => setWeekForm((f) => ({ ...f, weekStartDate: e.target.value }))}
                />
              </Field>
              <Field label="Group (optional)">
                <select className={inputCls} value={weekForm.group} onChange={(e) => setWeekForm((f) => ({ ...f, group: e.target.value }))}>
                  <option value="">Default (ungrouped)</option>
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-end">
                <Button onClick={submitWeekForm} disabled={setWeekSchedule.isPending} className="w-full h-[38px]">
                  {setWeekSchedule.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save week'}
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <Field label="Off days">
                <DayPicker value={weekForm.offDays} onChange={(v) => setWeekForm((f) => ({ ...f, offDays: v }))} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard icon={CalendarDays} title="Apply the same off-days to a whole month">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Field label="Month">
                <select className={inputCls} value={monthForm.month} onChange={(e) => setMonthForm((f) => ({ ...f, month: Number(e.target.value) }))}>
                  {MONTH_NAMES.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Year">
                <input type="number" className={inputCls} value={monthForm.year} onChange={(e) => setMonthForm((f) => ({ ...f, year: Number(e.target.value) }))} />
              </Field>
              <Field label="Group (optional)">
                <select className={inputCls} value={monthForm.group} onChange={(e) => setMonthForm((f) => ({ ...f, group: e.target.value }))}>
                  <option value="">Default (ungrouped)</option>
                  {groups.map((g) => (
                    <option key={g._id} value={g._id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-end">
                <Button onClick={submitMonthForm} disabled={setWeekScheduleForMonth.isPending} className="w-full h-[38px]">
                  {setWeekScheduleForMonth.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply to month'}
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <Field label="Off days">
                <DayPicker value={monthForm.offDays} onChange={(v) => setMonthForm((f) => ({ ...f, offDays: v }))} />
              </Field>
            </div>
          </SectionCard>

          <SectionCard icon={CalendarDays} title="Current rotational schedule">
            <div className="flex items-center gap-3 mb-4">
              <select
                className={`${inputCls} w-auto`}
                value={scheduleFilter.month}
                onChange={(e) => setScheduleFilter((f) => ({ ...f, month: Number(e.target.value) }))}
              >
                {MONTH_NAMES.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                className={`${inputCls} w-auto`}
                value={scheduleFilter.year}
                onChange={(e) => setScheduleFilter((f) => ({ ...f, year: Number(e.target.value) }))}
              >
                {[scheduleFilter.year - 1, scheduleFilter.year, scheduleFilter.year + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            {schedules.length === 0 ? (
              <EmptyRow text="No weeks configured for this month yet" />
            ) : (
              <div className="flex flex-col divide-y divide-slate-100">
                {schedules.map((s) => (
                  <div key={s._id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {toISODate(s.weekStartDate)} – {toISODate(s.weekEndDate)}
                      </p>
                      <p className="text-xs text-slate-400">{groups.find((g) => g._id === s.group)?.name || 'Default group'}</p>
                    </div>
                    <div className="flex gap-1.5">
                      {s.offDays.map((d) => (
                        <span key={d} className="text-[10px] font-semibold uppercase bg-violet-50 text-violet-700 px-2 py-1 rounded-md">
                          {DAY_LABEL[d]}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </>
      )}

      <SectionCard icon={ShieldCheck} title="Individual overrides" subtitle="Give one person a different week-off rule than the rest of the org">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Set an override</p>
            <select
              className={inputCls}
              value={overrideForm.role}
              onChange={(e) => setOverrideForm((f) => ({ ...f, role: e.target.value, employee: '' }))}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label}
                </option>
              ))}
            </select>
            <PersonSelect
              role={overrideForm.role}
              value={overrideForm.employee}
              onChange={(v) => setOverrideForm((f) => ({ ...f, employee: v }))}
              people={people}
              loading={peopleLoading}
            />
            <select
              className={inputCls}
              value={overrideForm.weekOffType}
              onChange={(e) => setOverrideForm((f) => ({ ...f, weekOffType: e.target.value }))}
            >
              <option value="sunday">Sunday only</option>
              <option value="sat_sun">Saturday &amp; Sunday</option>
              <option value="custom_fixed_days">Custom fixed days</option>
              <option value="rotational">Follow org rotational schedule</option>
            </select>
            {overrideForm.weekOffType === 'custom_fixed_days' && (
              <DayPicker value={overrideForm.fixedOffDays} onChange={(v) => setOverrideForm((f) => ({ ...f, fixedOffDays: v }))} />
            )}
            <Button onClick={submitOverride} disabled={setEmployeeOverride.isPending} className="self-start">
              {setEmployeeOverride.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save override'}
            </Button>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Remove an override</p>
            <select className={inputCls} value={removeRole} onChange={(e) => { setRemoveRole(e.target.value); setRemoveEmployeeId(''); }}>
              {ROLE_OPTIONS.map((r) => (
                <option key={r.role} value={r.role}>
                  {r.label}
                </option>
              ))}
            </select>
            <PersonSelect role={removeRole} value={removeEmployeeId} onChange={setRemoveEmployeeId} people={people} loading={peopleLoading} />
            <Button variant="danger" onClick={submitRemoveOverride} disabled={removeEmployeeOverride.isPending} className="self-start">
              Remove override
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

const TABS = [
  { key: 'shifts', label: 'Shifts', icon: Clock },
  { key: 'holidays', label: 'Holidays', icon: CalendarDays },
  { key: 'weekoff', label: 'Week-off policy', icon: Settings2 },
];

export default function SuperAdminManagement() {
  const [tab, setTab] = useState('shifts');
  const { toasts, notify } = useToasts();

  return (
    <div className="min-h-screen bg-slate-50">
      <ToastStack toasts={toasts} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700 bg-violet-50 px-2.5 py-1 rounded-full mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Superadmin
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Shift &amp; holiday management</h1>
          <p className="text-sm text-slate-500 mt-1.5">
            Configure working hours, the holiday calendar and week-off rules across every organisation admin reports into. Employees can only check in
            during their assigned shift window, and holidays or week-offs keep check-in closed automatically.
          </p>
        </div>

        <div className="flex gap-1.5 p-1 bg-white border border-slate-200 rounded-xl w-full sm:w-fit mb-6 overflow-x-auto max-w-full">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? 'bg-violet-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'shifts' && <ShiftsPanel notify={notify} />}
        {tab === 'holidays' && <HolidaysPanel notify={notify} />}
        {tab === 'weekoff' && <WeekOffPanel notify={notify} />}
      </div>
    </div>
  );
}