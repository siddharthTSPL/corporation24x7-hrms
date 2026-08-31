import React, { useMemo, useState } from 'react';
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
  History,
  Building2,
} from 'lucide-react';

import {
  useGetAllShifts,
  useCreateShift,
  useUpdateShift,
  useSetDefaultShift,
  useDeleteShift,
  useAssignShiftToUser,
  useGetShiftHistory,
  useEditShiftAssignment,
  useDeleteShiftAssignment,
} from '../../auth/server-state/shift/shift.hook';

import {
  useGetPolicy,
  useSetPolicy,
  useListGroups,
  useCreateGroup,
  useAddGroupMembers,
  useRemoveGroupMember,
  useGetWeekSchedules,
  useSetWeekSchedule,
  useSetWeekScheduleForMonth,
  useListHolidays,
  useBulkAddHolidays,
  useBulkEditHolidays,
  useDeleteHoliday,
  useSetEmployeeOverride,
  useRemoveEmployeeOverride,
} from '../../auth/server-state/holidaypolicy/holidaypolicy.hook';

import { useGetAllEmployee } from '../../auth/server-state/adminother/adminother.hook';

import {
  useGetAllDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '../../auth/server-state/department/department.hook';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABEL = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
const ROLE_OPTIONS = [
  { role: 'employee', model: 'User', label: 'Employee' },
  { role: 'manager', model: 'Manager', label: 'Manager' },
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
  const push = (type, message) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  };
  return { toasts, notify: push };
}

function ToastStack({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed top-3 right-3 left-3 sm:left-auto sm:top-4 sm:right-4 z-[100] flex flex-col gap-2 w-auto sm:w-full sm:max-w-sm">
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
          <span className="break-words">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4 md:p-6">
      <div
        className={`w-full ${
          wide ? 'sm:max-w-2xl lg:max-w-3xl' : 'sm:max-w-md md:max-w-lg'
        } bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto`}
      >
        <div className="flex items-center justify-between px-4 sm:px-5 md:px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="text-base md:text-lg font-semibold text-slate-800 truncate pr-3">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 -mr-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
        <div className="p-4 sm:p-5 md:p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 sm:py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#730042]/30 focus:border-[#730042] transition-colors';

function Button({ children, onClick, variant = 'primary', className = '', disabled, type = 'button' }) {
  const styles = {
    primary: 'bg-[#730042] text-white hover:bg-[#5A0033] shadow-sm shadow-[#730042]/10',
    ghost: 'bg-white text-[#730042] border border-[#730042] hover:bg-[#F9F0F5]',
    danger: 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50',
    subtle: 'bg-[#F9F0F5] text-[#730042] hover:bg-[#F3D9E7]',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function DayPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2">
      {DAYS.map((d) => {
        const active = value.includes(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(active ? value.filter((x) => x !== d) : [...value, d])}
            className={`min-w-[42px] px-2.5 py-2 sm:py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              active ? 'bg-[#730042] border-[#730042] text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-[#730042]'
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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 md:px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#F9F0F5] text-[#730042] flex items-center justify-center shrink-0">
            <Icon className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-semibold text-slate-800 truncate">{title}</h2>
            {subtitle && <p className="text-xs md:text-sm text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="w-full sm:w-auto">{action}</div>}
      </div>
      <div className="p-4 sm:p-5 md:p-6">{children}</div>
    </div>
  );
}

function EmptyRow({ text }) {
  return <div className="text-sm text-slate-400 text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl">{text}</div>;
}

function personLabel(p) {
  const name = `${p?.f_name || ''} ${p?.l_name || ''}`.trim() || p?.uid || 'Unnamed';
  const extra = p?.designation || p?.department || p?.work_email;
  return extra ? `${name} — ${extra}` : name;
}

function usePeopleByRole() {
  const { data, isLoading } = useGetAllEmployee();

  const all = useMemo(() => {
    const raw = data?.users || [];
    return Array.isArray(raw) ? raw : [];
  }, [data]);

  const employees = useMemo(() => all.filter((p) => p.type === 'employee'), [all]);
  const managers = useMemo(() => all.filter((p) => p.type === 'manager'), [all]);

  return {
    byRole: { employee: employees, manager: managers },
    isLoading,
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
  minMinutesBeforeCheckout: 10,
  absentBelowMinutes: 120,
  halfDayBelowMinutes: 180,
};

function formatDateTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shiftLabel(shift) {
  if (!shift) return 'Org default';
  return `${shift.name} (${shift.startTime}–${shift.endTime})`;
}

function actorLabel(actor, model) {
  if (!actor) return model || 'Unknown';
  const name = `${actor.f_name || ''} ${actor.l_name || ''}`.trim();
  return name || actor.email || model;
}

function ShiftHistoryModal({ open, onClose, employeeId, role, personName, shifts, notify }) {
  const { data, isLoading } = useGetShiftHistory(employeeId, role);
  const editMutation = useEditShiftAssignment();
  const deleteMutation = useDeleteShiftAssignment();
  const [editingId, setEditingId] = useState(null);
  const [editShiftId, setEditShiftId] = useState('');

  const history = data?.history || [];

  const startEdit = (entry) => {
    setEditingId(entry._id);
    setEditShiftId(entry.shift?._id || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditShiftId('');
  };

  const saveEdit = (entry) => {
    editMutation.mutate(
      { historyId: entry._id, data: { shift_id: editShiftId || null } },
      {
        onSuccess: () => {
          notify('success', 'History entry updated');
          cancelEdit();
        },
        onError: (e) => notify('error', errMsg(e, 'Could not update history entry')),
      }
    );
  };

  const removeEntry = (entry) => {
    deleteMutation.mutate(entry._id, {
      onSuccess: () => notify('success', 'History entry deleted'),
      onError: (e) => notify('error', errMsg(e, 'Could not delete history entry')),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={personName ? `Shift history — ${personName}` : 'Shift history'} wide>
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <EmptyRow text="No shift assignments recorded yet for this person." />
      ) : (
        <div className="flex flex-col divide-y divide-slate-100">
          {history.map((entry) => {
            const isEditing = editingId === entry._id;
            return (
              <div key={entry._id} className="py-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 break-words">
                      <span className="text-slate-400">{shiftLabel(entry.previous_shift)}</span>
                      <span className="mx-1.5 text-slate-300">→</span>
                      <span className="font-medium">{shiftLabel(entry.shift)}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1 break-words">
                      {formatDateTime(entry.createdAt)} · by {actorLabel(entry.assigned_by, entry.assigned_by_model)}
                    </p>
                    {entry.note && <p className="text-xs text-slate-500 mt-1 italic break-words">"{entry.note}"</p>}
                  </div>
                  {!isEditing && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => startEdit(entry)}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        title="Edit this entry"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeEntry(entry)}
                        disabled={deleteMutation.isPending}
                        className="p-2 rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                        title="Delete this entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-slate-50 rounded-lg p-3">
                    <select className={`${inputCls} sm:w-auto sm:flex-1 sm:min-w-[160px]`} value={editShiftId} onChange={(e) => setEditShiftId(e.target.value)}>
                      <option value="">Org default</option>
                      {shifts.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <Button onClick={() => saveEdit(entry)} disabled={editMutation.isPending} className="text-xs py-1.5 flex-1 sm:flex-none">
                        {editMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                      </Button>
                      <Button variant="ghost" onClick={cancelEdit} className="text-xs py-1.5 flex-1 sm:flex-none">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function ShiftsPanel({ notify }) {
  const { data: shiftsData, isLoading: loading } = useGetAllShifts();
  const shifts = shiftsData?.shifts || [];

  const { byRole: people, isLoading: peopleLoading } = usePeopleByRole();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyShiftForm);
  const [assignForm, setAssignForm] = useState({ employee_id: '', role: 'employee', shift_id: '' });
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const createShiftMutation = useCreateShift();
  const updateShiftMutation = useUpdateShift();
  const setDefaultMutation = useSetDefaultShift();
  const deleteShiftMutation = useDeleteShift();
  const assignShiftMutation = useAssignShiftToUser();

  const saving = createShiftMutation.isPending || updateShiftMutation.isPending;
  const assigning = assignShiftMutation.isPending;

  const selectedPerson = (people?.[assignForm.role] || []).find((p) => p._id === assignForm.employee_id);
  const selectedPersonName = selectedPerson ? personLabel(selectedPerson) : '';

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
      minMinutesBeforeCheckout: shift.minMinutesBeforeCheckout ?? 10,
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

    const onError = (e) => notify('error', errMsg(e, 'Could not save shift'));

    if (editing) {
      updateShiftMutation.mutate(
        { id: editing._id, data: form },
        {
          onSuccess: () => {
            notify('success', 'Shift updated');
            setModalOpen(false);
          },
          onError,
        }
      );
    } else {
      createShiftMutation.mutate(form, {
        onSuccess: () => {
          notify('success', 'Shift created');
          setModalOpen(false);
        },
        onError,
      });
    }
  };

  const makeDefault = (id) => {
    setDefaultMutation.mutate(id, {
      onSuccess: () => notify('success', 'Default shift updated'),
      onError: (e) => notify('error', errMsg(e, 'Could not set default')),
    });
  };

  const removeShift = (shift) => {
    if (shift.isDefault) {
      notify('error', 'Set another shift as default before deactivating this one');
      return;
    }
    deleteShiftMutation.mutate(shift._id, {
      onSuccess: () => notify('success', 'Shift deactivated'),
      onError: (e) => notify('error', errMsg(e, 'Could not deactivate shift')),
    });
  };

  const submitAssign = () => {
    if (!assignForm.employee_id) {
      notify('error', 'Please select a person');
      return;
    }
    assignShiftMutation.mutate(
      {
        employee_id: assignForm.employee_id,
        role: assignForm.role,
        shift_id: assignForm.shift_id || null,
      },
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
    <div className="flex flex-col gap-5 sm:gap-6 min-w-0">
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
        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : shifts.length === 0 ? (
          <EmptyRow text="No shifts yet. Create the first one to get started." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {shifts.map((s) => (
              <div key={s._id} className="rounded-xl border border-slate-200 p-4 flex flex-col gap-3 hover:border-[#730042] transition-colors min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-slate-800 text-sm truncate">{s.name}</h3>
                      {s.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md shrink-0">
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
                  <button onClick={() => openEdit(s)} className="p-2 -mr-1 -mt-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 shrink-0">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                  <span>Grace</span>
                  <span className="text-slate-700 font-medium text-right">{s.graceMinutes} min</span>
                  <span>Early check-in</span>
                  <span className="text-slate-700 font-medium text-right">{s.earlyBufferMinutes} min</span>
                  <span>Checkout opens after</span>
                  <span className="text-slate-700 font-medium text-right">{s.minMinutesBeforeCheckout ?? 10} min</span>
                  <span>Absent below</span>
                  <span className="text-slate-700 font-medium text-right">{s.absentBelowMinutes} min</span>
                  <span>Half-day below</span>
                  <span className="text-slate-700 font-medium text-right">{s.halfDayBelowMinutes} min</span>
                </div>
                <div className="flex gap-2 pt-1 flex-wrap">
                  {!s.isDefault && (
                    <Button
                      variant="subtle"
                      className="flex-1 text-xs py-2 sm:py-1.5 min-w-[110px]"
                      onClick={() => makeDefault(s._id)}
                      disabled={setDefaultMutation.isPending}
                    >
                      Set default
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    className="flex-1 text-xs py-2 sm:py-1.5 min-w-[110px]"
                    onClick={() => removeShift(s)}
                    disabled={deleteShiftMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Deactivate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard icon={UserPlus} title="Assign shift to a person" subtitle="Choose who follows which shift; leave shift empty to use the org default">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
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
          <Button onClick={submitAssign} disabled={assigning} className="w-full lg:w-auto lg:h-[42px]">
            {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign'}
          </Button>
        </div>
        <div className="pt-3">
          <Button
            variant="ghost"
            onClick={() => {
              if (!assignForm.employee_id) {
                notify('error', 'Select a person above first');
                return;
              }
              setHistoryModalOpen(true);
            }}
            className="text-xs w-full sm:w-auto"
          >
            <History className="w-3.5 h-3.5" /> View shift history
          </Button>
        </div>
      </SectionCard>

      <ShiftHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        employeeId={assignForm.employee_id}
        role={assignForm.role}
        personName={selectedPersonName}
        shifts={shifts}
        notify={notify}
      />

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
          <Field label="Checkout opens after (minutes)">
            <input
              type="number"
              className={inputCls}
              value={form.minMinutesBeforeCheckout}
              onChange={(e) => setForm((f) => ({ ...f, minMinutesBeforeCheckout: Number(e.target.value) }))}
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
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-5">
          <Button variant="ghost" onClick={() => setModalOpen(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={submitShift} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Save changes' : 'Create shift'}
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
    <div className="flex flex-col gap-4 min-w-0 max-w-2xl mx-auto w-full">
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5 lg:gap-2">
        {DAYS.map((d) => (
          <div key={d} className="text-[10px] sm:text-[11px] lg:text-xs font-semibold uppercase text-slate-400 text-center py-1">
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
              className={`aspect-square rounded-lg text-[11px] sm:text-xs lg:text-sm font-medium flex flex-col items-center justify-center gap-0.5 border transition-colors ${
                holiday
                  ? isEditingThis
                    ? 'bg-[#730042] border-[#730042] text-white'
                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-400'
                  : inSelection
                  ? 'bg-[#F3D9E7] border-[#730042] text-[#730042]'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-[#730042]'
              }`}
            >
              <span>{day}</span>
              {holiday && <span className="w-1 h-1 rounded-full bg-current" />}
            </button>
          );
        })}
      </div>

      {rangeStart && !editingHoliday && (
        <div className="rounded-xl border border-[#E8D5E2] bg-[#F9F0F5] p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#730042] uppercase tracking-wide mb-1.5">
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
            <Button variant="ghost" onClick={clearSelection} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={submitRange} disabled={adding || !rangeName.trim()} className="flex-1 sm:flex-none">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add holiday'}
            </Button>
          </div>
        </div>
      )}

      {editingHoliday && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{toISODate(editingHoliday.date)}</p>
            <input className={inputCls} value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" onClick={() => setEditingHoliday(null)} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button variant="danger" onClick={submitDelete} disabled={deleting} className="flex-1 sm:flex-none">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </>
              )}
            </Button>
            <Button onClick={submitEdit} disabled={editing || !editName.trim()} className="flex-1 sm:flex-none">
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
  const { data: holidaysData, isLoading: loading } = useListHolidays(filter);
  const holidays = holidaysData?.holidays || [];

  const bulkAddMutation = useBulkAddHolidays();
  const bulkEditMutation = useBulkEditHolidays();
  const deleteHolidayMutation = useDeleteHoliday();

  const addRange = (dates, name, onDone) => {
    bulkAddMutation.mutate(
      { holidays: dates.map((date) => ({ date, name })) },
      {
        onSuccess: (res) => {
          notify('success', dates.length > 1 ? `Holiday added for ${dates.length} days` : 'Holiday added');
          onDone();
        },
        onError: (e) => notify('error', errMsg(e, 'Could not add holiday')),
      }
    );
  };

  const editHoliday = (holiday, name, onDone) => {
    bulkEditMutation.mutate(
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
    deleteHolidayMutation.mutate(id, {
      onSuccess: () => {
        notify('success', 'Holiday removed');
        onDone();
      },
      onError: (e) => notify('error', errMsg(e, 'Could not remove holiday')),
    });
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6 min-w-0">
      <SectionCard icon={CalendarDays} title="Holiday calendar" subtitle="Dates the whole organisation gets off, regardless of week-off policy">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
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

        {loading ? (
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
            adding={bulkAddMutation.isPending}
            editing={bulkEditMutation.isPending}
            deleting={deleteHolidayMutation.isPending}
          />
        )}
      </SectionCard>
    </div>
  );
}

function WeekOffPanel({ notify }) {
  const { byRole: people, isLoading: peopleLoading } = usePeopleByRole();

  const { data: policyData, isLoading: policyLoading } = useGetPolicy();
  const policy = policyData?.policy?.weekOffType || 'sunday';
  const setPolicyMutation = useSetPolicy();

  const { data: groupsData } = useListGroups();
  const groups = groupsData?.groups || [];
  const createGroupMutation = useCreateGroup();
  const addGroupMembersMutation = useAddGroupMembers();
  const removeGroupMemberMutation = useRemoveGroupMember();

  const [groupName, setGroupName] = useState('');
  const [memberDraft, setMemberDraft] = useState({});

  const [scheduleFilter, setScheduleFilter] = useState(today());
  const { data: schedulesData } = useGetWeekSchedules(scheduleFilter);
  const schedules = schedulesData?.schedules || [];

  const [weekForm, setWeekForm] = useState({ weekStartDate: '', offDays: [], group: '' });
  const [monthForm, setMonthForm] = useState({ month: today().month, year: today().year, offDays: [], group: '' });
  const setWeekScheduleMutation = useSetWeekSchedule();
  const setMonthScheduleMutation = useSetWeekScheduleForMonth();

  const [overrideForm, setOverrideForm] = useState({ employee: '', role: 'employee', weekOffType: 'sunday', fixedOffDays: [] });
  const [removeEmployeeId, setRemoveEmployeeId] = useState('');
  const [removeRole, setRemoveRole] = useState('employee');
  const setOverrideMutation = useSetEmployeeOverride();
  const removeOverrideMutation = useRemoveEmployeeOverride();

  const savePolicy = (value) => {
    setPolicyMutation.mutate(
      { weekOffType: value },
      {
        onSuccess: () => notify('success', 'Week-off policy updated'),
        onError: (e) => notify('error', errMsg(e, 'Could not update policy')),
      }
    );
  };

  const createGroup = () => {
    if (!groupName.trim()) {
      notify('error', 'Group name is required');
      return;
    }
    createGroupMutation.mutate(
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
    addGroupMembersMutation.mutate(
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
    removeGroupMemberMutation.mutate(
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
    setWeekScheduleMutation.mutate(
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
    setMonthScheduleMutation.mutate(
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
    setOverrideMutation.mutate(
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
    removeOverrideMutation.mutate(removeEmployeeId, {
      onSuccess: () => {
        notify('success', 'Override removed, employee now follows org policy');
        setRemoveEmployeeId('');
      },
      onError: () => notify('error', 'Could not remove override'),
    });
  };

  const isRotational = policy === 'rotational';

  return (
    <div className="flex flex-col gap-5 sm:gap-6 min-w-0">
      <SectionCard icon={Settings2} title="Week-off policy" subtitle="Choose how weekly offs work across the organisation">
        {policyLoading ? (
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
                disabled={setPolicyMutation.isPending}
                className={`text-left p-4 rounded-xl border transition-colors min-h-[44px] ${
                  policy === opt.v ? 'border-[#730042] bg-[#F9F0F5] ring-1 ring-[#730042]' : 'border-slate-200 hover:border-[#730042]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{opt.label}</span>
                  {policy === opt.v && <Check className="w-4 h-4 text-[#730042] shrink-0" />}
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
              <Button onClick={createGroup} disabled={createGroupMutation.isPending} className="w-full sm:w-auto">
                <Plus className="w-4 h-4" /> Create
              </Button>
            </div>
            {groups.length === 0 ? (
              <EmptyRow text="No groups yet. The default schedule applies to everyone." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {groups.map((g) => (
                  <div key={g._id} className="rounded-xl border border-slate-200 p-4 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-800 mb-2 truncate">{g.name}</h4>
                    <div className="flex flex-col gap-1.5 mb-3 max-h-32 overflow-y-auto">
                      {(g.members || []).length === 0 && <p className="text-xs text-slate-400">No members yet</p>}
                      {(g.members || []).map((m) => (
                        <div key={String(m.employee)} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2.5 py-1.5 gap-2">
                          <span className="text-slate-600 truncate">
                            {m.employeeModel} · {String(m.employee).slice(-6)}
                          </span>
                          <button onClick={() => removeMember(g._id, m.employee)} className="text-slate-400 hover:text-rose-500 shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        className={`${inputCls} text-xs py-2 sm:py-1.5 sm:w-28`}
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
                        className={`${inputCls} text-xs py-2 sm:py-1.5`}
                        role={memberDraft[g._id]?.role || 'employee'}
                        value={memberDraft[g._id]?.employee || ''}
                        onChange={(v) => setMemberDraft((d) => ({ ...d, [g._id]: { ...d[g._id], employee: v } }))}
                        people={people}
                        loading={peopleLoading}
                        placeholder="Choose person"
                      />
                      <Button variant="subtle" className="py-2 sm:py-1.5 px-2.5 w-full sm:w-auto" onClick={() => addMember(g._id)} disabled={addGroupMembersMutation.isPending}>
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard icon={CalendarDays} title="Set off-days for a single week">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <Button onClick={submitWeekForm} disabled={setWeekScheduleMutation.isPending} className="w-full lg:h-[42px]">
                  {setWeekScheduleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save week'}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Button onClick={submitMonthForm} disabled={setMonthScheduleMutation.isPending} className="w-full lg:h-[42px]">
                  {setMonthScheduleMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply to month'}
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
            <div className="flex items-center gap-3 mb-4 flex-wrap">
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
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {toISODate(s.weekStartDate)} – {toISODate(s.weekEndDate)}
                      </p>
                      <p className="text-xs text-slate-400">{groups.find((g) => g._id === s.group)?.name || 'Default group'}</p>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {s.offDays.map((d) => (
                        <span key={d} className="text-[10px] font-semibold uppercase bg-[#F9F0F5] text-[#730042] px-2 py-1 rounded-md">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <Button onClick={submitOverride} disabled={setOverrideMutation.isPending} className="self-start w-full sm:w-auto">
              {setOverrideMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save override'}
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
            <Button variant="danger" onClick={submitRemoveOverride} className="self-start w-full sm:w-auto" disabled={removeOverrideMutation.isPending}>
              Remove override
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function DepartmentsPanel({ notify }) {
  const { data: deptData, isLoading: loading } = useGetAllDepartments();
  const departments = deptData?.departments || [];

  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', code: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const saving = createMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '' });
    setModalOpen(true);
  };

  const openEdit = (dept) => {
    setEditing(dept);
    setForm({ name: dept.name, code: dept.code || '' });
    setModalOpen(true);
  };

  const submitDepartment = () => {
    if (!form.name.trim()) {
      notify('error', 'Department name is required');
      return;
    }

    const onError = (e) => notify('error', errMsg(e, 'Could not save department'));

    if (editing) {
      updateMutation.mutate(
        { id: editing._id, data: form },
        {
          onSuccess: () => {
            notify('success', 'Department updated');
            setModalOpen(false);
          },
          onError,
        }
      );
    } else {
      createMutation.mutate(form, {
        onSuccess: () => {
          notify('success', 'Department added');
          setModalOpen(false);
        },
        onError,
      });
    }
  };

  const removeDepartment = (dept) => {
    deleteMutation.mutate(dept._id, {
      onSuccess: () => {
        notify('success', 'Department removed');
        setConfirmDelete(null);
      },
      onError: (e) => notify('error', errMsg(e, 'Could not remove department')),
    });
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6 min-w-0">
      <SectionCard
        icon={Building2}
        title="Departments"
        subtitle="Add your own departments — they show up instantly in onboarding and edit-department dropdowns"
        action={
          <Button onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="w-4 h-4" /> New department
          </Button>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : departments.length === 0 ? (
          <EmptyRow text="No departments yet. Add your first one." />
        ) : (
          <div className="flex flex-col gap-2">
            {departments.map((dept) => (
              <div
                key={dept._id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 sm:px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{dept.name}</p>
                  {dept.code && <p className="text-xs text-slate-400 mt-0.5">{dept.code}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEdit(dept)}
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-[#730042] transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(dept)}
                    className="p-2 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit department' : 'New department'}>
        <div className="p-4 sm:p-5 md:p-6 flex flex-col gap-4">
          <Field label="Name">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Engineering"
            />
          </Field>
          <Field label="Short code (optional)">
            <input
              className={inputCls}
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              placeholder="e.g. ENG"
            />
          </Field>
          <Button onClick={submitDepartment} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing ? 'Save changes' : 'Add department'}
          </Button>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Remove department">
        <div className="p-4 sm:p-5 md:p-6 flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            Remove <span className="font-medium text-slate-800">{confirmDelete?.name}</span>? It will no longer appear in onboarding or
            edit-department dropdowns, but employees already assigned to it are unaffected.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(null)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={() => removeDepartment(confirmDelete)} disabled={deleteMutation.isPending} className="flex-1">
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Remove'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const TABS = [
  { key: 'shifts', label: 'Shifts', icon: Clock },
  { key: 'holidays', label: 'Holidays', icon: CalendarDays },
  { key: 'weekoff', label: 'Week-off policy', icon: Settings2 },
  { key: 'departments', label: 'Departments', icon: Building2 },
];

export default function AdminManagement() {
  const [tab, setTab] = useState('shifts');
  const { toasts, notify } = useToasts();

  return (
    <div className="min-h-screen bg-slate-50 w-full max-w-full overflow-x-hidden">
      <ToastStack toasts={toasts} />
      <div className="max-w-6xl 2xl:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-5 sm:py-8 lg:py-10 min-w-0">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-[28px] font-bold text-slate-900 tracking-tight">Shift &amp; holiday management</h1>
          <p className="text-sm md:text-[15px] text-slate-500 mt-1.5 max-w-3xl">
            Configure working hours, the holiday calendar and week-off rules. Employees can only check in during their assigned shift window, and days
            marked as a holiday or week-off are automatically kept closed for check-in.
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
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? 'bg-[#730042] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === 'shifts' && <ShiftsPanel notify={notify} />}
        {tab === 'holidays' && <HolidaysPanel notify={notify} />}
        {tab === 'weekoff' && <WeekOffPanel notify={notify} />}
        {tab === 'departments' && <DepartmentsPanel notify={notify} />}
      </div>
    </div>
  );
}