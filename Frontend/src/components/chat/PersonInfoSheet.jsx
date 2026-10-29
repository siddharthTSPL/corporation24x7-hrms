import { FaTimes } from "react-icons/fa";
import Avatar from "./Avatar";

export default function PersonInfoSheet({ person, onClose }) {
  if (!person) return null;

  const fields = [
    ["Designation", person.designation],
    ["Department", person.department],
  ].filter(([, value]) => value);

  return (
    <div className="fixed inset-0 z-[97] bg-black/45 flex items-center justify-center p-4" onClick={onClose}>
      <section className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Contact information</h3>
          <button type="button" onClick={onClose} title="Close" className="w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 flex items-center justify-center">
            <FaTimes />
          </button>
        </div>
        <div className="flex flex-col items-center px-6 py-6">
          <Avatar name={person.name} photo={person.photo} size={76} seed={person.key} />
          <p className="mt-3 text-base font-bold text-gray-900 text-center">{person.name || "Unknown"}</p>
          {person.role && <p className="text-xs text-gray-500 mt-1">{person.role}</p>}
        </div>
        <dl className="px-5 pb-5 divide-y divide-gray-100">
          {fields.map(([label, value]) => (
            <div key={label} className="py-2.5">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
              <dd className="mt-0.5 text-sm text-gray-800 break-words">{value}</dd>
            </div>
          ))}
          {!fields.length && <p className="text-xs text-gray-400 text-center">No additional details available.</p>}
        </dl>
      </section>
    </div>
  );
}
