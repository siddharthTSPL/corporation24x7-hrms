import React, { useState } from "react";
import {
  useGetAnnouncements,
  useGetAnnouncement,
} from "../../auth/server-state/employee/employeeannounce/employeeannounce.hook";
import { usePermissionStore } from "../../auth/store/permission/permissionStore";

const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"});
};

const fmtTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
};

const excerpt = (text, len=130) => {
  if (!text) return "";
  return text.length>len ? text.slice(0,len).trimEnd()+"…" : text;
};

const PRIORITY_META = {
  high:   { label:"Urgent",  cls:"bg-[rgba(205,22,110,0.10)] border border-[rgba(205,22,110,0.25)] text-[#730042]" },
  medium: { label:"Info",    cls:"bg-[rgba(115,0,66,0.10)] border border-[rgba(115,0,66,0.15)] text-[#730042]" },
  low:    { label:"General", cls:"bg-[rgba(249,248,242,0.9)] border border-[rgba(115,0,66,0.15)] text-[#730042]" },
};

function PriorityPill({ priority }) {
  const m = PRIORITY_META[priority]||PRIORITY_META.low;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-widest uppercase ${m.cls}`}>
      {m.label}
    </span>
  );
}

function Spinner() {
  return (
    <div className="w-9 h-9 rounded-full border-[3px] border-[rgba(115,0,66,0.10)] border-t-[#CD166E] animate-spin" />
  );
}

function DetailModal({ id, onClose }) {
  const { data, isLoading } = useGetAnnouncement(id);
  const ann = data?.announcement;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
      style={{background:"rgba(115,0,66,0.18)",backdropFilter:"blur(4px)"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}
    >
      <div className="bg-[#F9F8F2] rounded-2xl border border-[rgba(205,22,110,0.25)] w-full max-w-xl max-h-[88vh] overflow-y-auto shadow-[0_24px_48px_rgba(115,0,66,0.12)]">
        <div className="bg-white px-5 sm:px-6 py-4 border-b border-[rgba(115,0,66,0.10)] flex items-center justify-between rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[rgba(205,22,110,0.10)] border border-[rgba(205,22,110,0.25)] flex items-center justify-center flex-shrink-0">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#CD166E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span className="text-[11px] font-medium tracking-[.14em] uppercase text-[#730042]">Announcement detail</span>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[rgba(115,0,66,0.10)] border-none cursor-pointer text-[#730042] text-base flex items-center justify-center hover:bg-[rgba(115,0,66,0.15)] transition-colors"
          >✕</button>
        </div>

        <div className="px-5 sm:px-7 py-6 sm:py-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Spinner/>
              <p className="text-[13px] text-[rgba(115,0,66,0.45)] m-0">Loading…</p>
            </div>
          ) : ann ? (
            <>
              <div className="flex items-center gap-2.5 flex-wrap mb-4">
                {ann.priority && <PriorityPill priority={ann.priority}/>}
                {ann.category && (
                  <span className="text-[10.5px] tracking-widest uppercase text-[rgba(115,0,66,0.45)]">{ann.category}</span>
                )}
                <span className="ml-auto text-[11px] text-[rgba(115,0,66,0.45)]">
                  {fmtDate(ann.createdAt)} · {fmtTime(ann.createdAt)}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-semibold text-[#730042] leading-snug tracking-tight m-0">
                {ann.title}
              </h2>

              <div className="h-px bg-[rgba(205,22,110,0.20)] my-4 sm:my-5" />

              <p className="text-[15px] text-[rgba(115,0,66,0.55)] leading-[1.85] m-0">
                {ann.content||ann.message||ann.description||"No content available."}
              </p>

              {ann.postedBy && (
                <div className="mt-6 pt-4 border-t border-[rgba(115,0,66,0.10)] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[rgba(205,22,110,0.10)] border border-[rgba(205,22,110,0.25)] flex items-center justify-center text-[15px] font-semibold text-[#730042] flex-shrink-0">
                    {(ann.postedBy?.f_name||ann.postedBy?.name||"A")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#730042] m-0">
                      {ann.postedBy?.f_name ? `${ann.postedBy.f_name} ${ann.postedBy.l_name||""}` : ann.postedBy?.name||"Admin"}
                    </p>
                    <p className="text-[11px] text-[rgba(115,0,66,0.45)] m-0">{ann.postedBy?.role||"Management"}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-[rgba(115,0,66,0.45)] text-center py-8">Announcement not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AnnCard({ ann, index, onClick, isFeatured }) {
  return (
    <div
      onClick={()=>onClick(ann._id)}
      className={`bg-white border border-[rgba(115,0,66,0.15)] rounded-2xl cursor-pointer transition-all duration-200 hover:border-[rgba(205,22,110,0.45)] hover:-translate-y-1 relative overflow-hidden ${
        isFeatured ? "p-6 sm:p-8" : "p-5 sm:p-6"
      }`}
    >
      {isFeatured && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#CD166E]" />}

      <div className="flex items-center justify-between gap-2 mb-3.5 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {ann.priority && <PriorityPill priority={ann.priority}/>}
          {isFeatured && (
            <span className="text-[10px] font-medium text-[#CD166E] tracking-[.14em] uppercase flex items-center gap-1">
              <svg width="8" height="8" viewBox="0 0 10 10" fill="#CD166E"><circle cx="5" cy="5" r="5"/></svg>
              Featured
            </span>
          )}
        </div>
        <span className="text-[11px] text-[rgba(115,0,66,0.45)] tracking-wide">{fmtDate(ann.createdAt)}</span>
      </div>

      <h3 className={`font-semibold text-[#730042] leading-snug mb-2.5 tracking-tight ${isFeatured?"text-xl sm:text-2xl":"text-base sm:text-lg"}`}>
        {ann.title}
      </h3>

      <p className="text-[13.5px] text-[rgba(115,0,66,0.55)] leading-[1.75] mb-4">
        {excerpt(ann.content||ann.message||ann.description, isFeatured?200:100)}
      </p>

      <div className="flex items-center justify-between pt-3.5 border-t border-[rgba(115,0,66,0.10)]">
        {ann.category
          ? <span className="text-[10.5px] text-[rgba(115,0,66,0.45)] tracking-widest uppercase">{ann.category}</span>
          : <span/>
        }
        <span className="text-[11.5px] font-medium text-[#CD166E] tracking-wide uppercase flex items-center gap-1 hover:text-[#730042] transition-colors">
          Read more ›
        </span>
      </div>
    </div>
  );
}

function NoPermission() {
  return (
    <div className="min-h-screen bg-[#F9F8F2] flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full border-[1.5px] border-[rgba(205,22,110,0.25)] flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#CD166E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <h3 className="text-2xl font-semibold text-[#730042] mb-2">Access Restricted</h3>
        <p className="text-[13px] text-[rgba(115,0,66,0.45)]">
          You don't have permission to view announcements. Contact your administrator.
        </p>
      </div>
    </div>
  );
}

export default function Announceem() {
  const can = usePermissionStore(state=>state.can);
  const hasPermission = can("announcements.can_view_announcements");

  const { data, isLoading, isError } = useGetAnnouncements();
  const [selectedId, setSelectedId] = useState(null);

  if (!hasPermission) return <NoPermission/>;

  const announcements = data?.announcements||[];

  return (
    <div className="min-h-screen bg-[#F9F8F2]">
      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .ann-fadein{animation:fadeUp 0.4s ease both;}
      `}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        <div className="flex items-center gap-2.5 mb-5 ann-fadein" style={{animationDelay:".05s"}}>
          <div className="w-8 h-px bg-[#730042]"/>
          <span className="text-[11px] font-medium tracking-[.18em] uppercase text-[#730042]">Company Bulletin</span>
          <div className="ml-auto flex items-center gap-1.5 bg-[rgba(115,0,66,0.10)] border border-[rgba(115,0,66,0.25)] px-3 py-1 rounded-full">
            <div className="w-1.5 h-1.5 rounded-full bg-[#CD166E]" style={{animation:"blink 1.8s ease-in-out infinite"}}/>
            <span className="text-[10px] font-medium tracking-[.14em] uppercase text-[#730042]">Live</span>
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-semibold text-[#730042] tracking-tight leading-[1.1] mb-1 ann-fadein" style={{animationDelay:".1s"}}>
          Announce<span className="text-[#CD166E]">ments</span>
        </h1>

        <div className="flex items-center gap-3.5 mt-4 mb-8 ann-fadein" style={{animationDelay:".15s"}}>
          <div className="flex-1 h-px bg-[rgba(115,0,66,0.25)]"/>
          <span className="text-[11px] text-[rgba(115,0,66,0.45)] tracking-wide">
            {announcements.length} {announcements.length===1?"post":"posts"}
          </span>
          <div className="flex-1 h-px bg-[rgba(115,0,66,0.25)]"/>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Spinner/>
            <p className="text-[13px] text-[rgba(115,0,66,0.45)] m-0">Loading announcements…</p>
          </div>
        )}

        {isError && (
          <div className="text-center py-20">
            <p className="text-[#CD166E] font-medium text-[15px] mb-1.5">Failed to load announcements</p>
            <p className="text-[13px] text-[rgba(115,0,66,0.45)]">Please try refreshing the page.</p>
          </div>
        )}

        {!isLoading && !isError && announcements.length===0 && (
          <div className="text-center py-20 px-4">
            <div className="w-16 h-16 rounded-full border-[1.5px] border-[rgba(205,22,110,0.25)] flex items-center justify-center mx-auto mb-5">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CD166E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-[#730042] mb-2">Nothing yet</h3>
            <p className="text-[13px] text-[rgba(115,0,66,0.45)]">New announcements will appear here.</p>
          </div>
        )}

        {!isLoading && announcements.length>0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {announcements.map((ann,i)=>(
              <div key={ann._id} className={`ann-fadein ${i===0?"sm:col-span-2":"col-span-1"}`} style={{animationDelay:`${i*0.06}s`}}>
                <AnnCard ann={ann} index={i} onClick={setSelectedId} isFeatured={i===0}/>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedId && <DetailModal id={selectedId} onClose={()=>setSelectedId(null)}/>}
    </div>
  );
}