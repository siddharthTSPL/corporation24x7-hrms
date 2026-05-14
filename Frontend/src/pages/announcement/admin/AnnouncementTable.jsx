import { PriorityBadge, AudienceBadge } from "../../../components/announcement/shared/Badges";
import { fmtShortDate } from "../../../components/announcement/shared/helpers";
import { AVATAR_BG } from "../../../components/announcement/shared/constants";
import { IconMegaphone, IconAlert, IconEdit, IconTrash } from "./Icons";
import { ImageOrPlaceholder, SkeletonRows } from "./AdminShared";

export default function AnnouncementTable({ announcements, isLoading, isError, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-[14px] border border-[#F4C0D1] overflow-hidden">

      {/* Table header bar */}
      <div className="px-5 py-4 border-b border-[#F4C0D1] flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[#730042]">All announcements</span>
        <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#FBEAF0] text-[#730042]">
          {announcements.length} total
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-[#F4C0D1]" style={{ background: "#F9F8F2" }}>
              {["Image", "Title & Message", "Audience", "Priority", "Expiry", "Created", "Actions"].map((h) => (
                <th key={h}
                  className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#993556]"
                  style={h === "Actions" ? { textAlign: "center" } : {}}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#FBEAF0]">
            {isLoading ? (
              <SkeletonRows />
            ) : isError ? (
              <tr>
                <td colSpan={7} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <IconAlert size={28} color="#A32D2D" />
                    <p className="text-[13px] font-semibold text-[#730042]">Failed to load announcements</p>
                    <p className="text-[11px] text-[#993556]">Check your network and try again</p>
                  </div>
                </td>
              </tr>
            ) : announcements.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#FBEAF0] flex items-center justify-center">
                      <IconMegaphone size={22} color="#CD166E" />
                    </div>
                    <p className="text-[13px] font-semibold text-[#730042]">No announcements yet</p>
                    <p className="text-[11px] text-[#993556]">Click "New Announcement" to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              announcements.map((item, idx) => (
                <tr key={item._id}
                  className="transition-colors duration-100"
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#FEF4F9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>

                  <td className="px-5 py-4">
                    <ImageOrPlaceholder
                      src={item.notice_image} alt="notice"
                      className="w-10 h-10 object-cover rounded-[9px] border border-[#F4C0D1]"
                      placeholderBg={AVATAR_BG[idx % AVATAR_BG.length]}
                    />
                  </td>

                  <td className="px-5 py-4 max-w-[200px]">
                    <p className="text-[13px] font-semibold text-[#730042] truncate">{item.title}</p>
                    <p className="text-[11px] text-[#993556] truncate mt-0.5">{item.message}</p>
                  </td>

                  <td className="px-5 py-4"><AudienceBadge audience={item.audience} /></td>
                  <td className="px-5 py-4"><PriorityBadge priority={item.priority} /></td>

                  <td className="px-5 py-4 text-[11px] text-[#B4B2A9]">
                    {item.expiresAt
                      ? fmtShortDate(item.expiresAt)
                      : <span className="text-[#D3D1C7]">—</span>}
                  </td>

                  <td className="px-5 py-4 text-[11px] text-[#B4B2A9]">
                    {fmtShortDate(item.createdAt)}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => onEdit(item)} title="Edit"
                        className="w-8 h-8 rounded-[8px] border border-[#F4C0D1] flex items-center justify-center text-[#993556] transition-all hover:bg-[#FBEAF0] hover:text-[#CD166E]"
                        style={{ background: "#F9F8F2" }}>
                        <IconEdit size={12} />
                      </button>
                      <button onClick={() => onDelete(item)} title="Delete"
                        className="w-8 h-8 rounded-[8px] border border-[#F4C0D1] flex items-center justify-center text-[#993556] transition-all hover:bg-[#FCEBEB] hover:text-[#A32D2D] hover:border-[#F7C1C1]"
                        style={{ background: "#F9F8F2" }}>
                        <IconTrash size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}