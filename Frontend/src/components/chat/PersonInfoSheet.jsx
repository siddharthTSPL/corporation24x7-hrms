import { FaArrowLeft, FaBriefcase, FaBuilding, FaUserTie, FaCalendarAlt, FaPhoneAlt } from "react-icons/fa";
import Avatar from "./Avatar";

const displayDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

export default function PersonInfoSheet({ person, onClose }) {
  if (!person) return null;

  const fields = [
    [FaBriefcase, "Designation", person.designation, false],
    [FaBuilding, "Department", person.department, false],
    [FaUserTie, "Reporting manager", person.reportingManager, false],
    [FaCalendarAlt, "Joining date", displayDate(person.joinedAt), false],
    [FaPhoneAlt, "Phone number", person.phone, true],
  ].filter(([, , value]) => !!value);

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100">
        <button type="button" onClick={onClose} title="Back to chat" className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 flex items-center justify-center">
          <FaArrowLeft className="text-sm" />
        </button>
        <h3 className="text-base font-bold text-gray-900">Employee info</h3>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col items-center px-6 pt-6 pb-5 border-b border-gray-100">
          <Avatar name={person.name} photo={person.photo} size={76} seed={person.key} />
          <p className="mt-3 text-base font-bold text-gray-900 text-center">{person.name || "Unknown"}</p>
          {person.role && <p className="text-xs text-gray-500 mt-1">{person.role}</p>}
        </div>
        <dl className="px-5 pb-5">
          {fields.map(([Icon, label, value, isPhone]) => (
            <div key={label} className="flex items-start gap-3 border-b border-gray-100 py-3">
              <span className="mt-0.5 w-8 h-8 rounded-full bg-[#F6E8EF] text-[#730042] flex items-center justify-center shrink-0"><Icon className="text-xs" /></span>
              <span className="min-w-0 flex-1">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
                <dd className="mt-0.5 text-sm text-gray-800 break-words">
                  {isPhone ? <a className="hover:text-[#730042]" href={`tel:${value}`}>{value}</a> : value}
                </dd>
              </span>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
