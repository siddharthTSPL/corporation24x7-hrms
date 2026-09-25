import { useRef, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  Eye,
  Heart,
  Layers,
  Mail,
  PenLine,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import {
  auth,
  googleProvider,
  signInWithPopup,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  EMAIL_LINK_REDIRECT_URL,
  EMAIL_FOR_SIGNIN_KEY,
  postsCollection,
  subscribersCollection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from "../lib/Firebase";

// Point this at the actual file that exports the TorchX Talent logo used
// on the landing page (e.g. the `logo` import in landingpage.jsx). Adjust
// the relative path to match where this file lives in your project.
import talentLogo from "../assets/Vector.png";

const INK = "#1B0F14";
const MUTED = "#6E5A61";
const BEETROOT = "#7A004B"; // matches the Talent landing page's primary color
const TINT = "#FDF4F8"; // matches the Talent landing page's light tint
const BORDER = "rgba(27,15,20,0.09)";
const PAPER = "#FFFCFA";
const DANGER = "#B3261E";

/* ---------------------------------------------------------
   Category styling — each category gets its own accent color,
   tint, and a gradient used for card "covers" (no stock photos
   needed; the gradient + icon reads as a designed cover).
--------------------------------------------------------- */
const CATEGORY_META = {
  Product: {
    icon: Layers,
    color: "#2451C4",
    tint: "#EEF3FF",
    gradient: "linear-gradient(135deg, #24316B 0%, #3B5FD9 55%, #7C9CF2 100%)",
  },
  Guides: {
    icon: BookOpen,
    color: "#9A5B00",
    tint: "#FFF6E9",
    gradient: "linear-gradient(135deg, #6E4400 0%, #B4761A 55%, #EBB25C 100%)",
  },
  "Customer stories": {
    icon: Users,
    color: "#1B7A43",
    tint: "#EAFBF1",
    gradient: "linear-gradient(135deg, #0F4A29 0%, #1F8F51 55%, #63C88C 100%)",
  },
  Company: {
    icon: Sparkles,
    color: BEETROOT,
    tint: TINT,
    gradient: `linear-gradient(135deg, #3D0022 0%, ${BEETROOT} 55%, #C2126B 100%)`,
  },
};
const getCategoryMeta = (category) => CATEGORY_META[category] || CATEGORY_META.Company;

const initials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

/* Turns a raw Firebase error ("Firebase: Error (auth/popup-closed-by-user).")
   into something a reader can actually parse. */
const formatAuthError = (err) => {
  const raw = err?.message || "";
  const cleaned = raw
    .replace(/^Firebase:\s*/i, "")
    .replace(/\s*\(auth\/[a-z-]+\)\.?$/i, "")
    .trim();
  return cleaned || "Something went wrong. Please try again.";
};

// Where "Back" on the blog sends people — point this at the Talent landing page.
const HOME_FOOTER_URL = "/";

const getRelativeTime = (post) => {
  const raw = post?.createdAt;
  const jsDate = raw && typeof raw.toDate === "function" ? raw.toDate() : null;
  if (!jsDate) return post?.date || "Just now";

  const diffSec = Math.max(0, Math.floor((Date.now() - jsDate.getTime()) / 1000));
  if (diffSec < 60) return "Just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;

  return jsDate.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

const BLOG_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

  .tx-blog{ font-family:'DM Sans',sans-serif; color:${INK}; background:${PAPER}; }
  .tx-blog .font-display{ font-family:'Sora',sans-serif; }
  .tx-blog-scroll::-webkit-scrollbar{ height:0; width:6px; }
  .tx-blog-scroll::-webkit-scrollbar-thumb{ background:rgba(27,15,20,0.14); border-radius:99px; }

  .tx-header-shadow{ box-shadow:0 10px 30px -24px rgba(27,15,20,0.45); }

  .tx-live-dot{ display:inline-block; width:7px; height:7px; border-radius:999px; background:#22C55E; flex-shrink:0;
    animation:tx-pulse 2s infinite; }
  @keyframes tx-pulse{
    0%{ box-shadow:0 0 0 0 rgba(34,197,94,.45); }
    70%{ box-shadow:0 0 0 7px rgba(34,197,94,0); }
    100%{ box-shadow:0 0 0 0 rgba(34,197,94,0); }
  }

  .tx-cat-tab{ position:relative; white-space:nowrap; padding:.5rem .05rem; font-size:13.5px; font-weight:500;
    color:${MUTED}; border-bottom:2px solid transparent; transition:color .18s ease, border-color .18s ease; cursor:pointer; }
  .tx-cat-tab:hover{ color:${INK}; }
  .tx-cat-tab.active{ color:${INK}; font-weight:600; border-color:${BEETROOT}; }

  .tx-search{ position:relative; display:flex; align-items:center; }
  .tx-search svg{ position:absolute; left:.95rem; color:${MUTED}; pointer-events:none; }
  .tx-search input{ width:100%; border:1.5px solid ${BORDER}; border-radius:999px; padding:.68rem 1rem .68rem 2.5rem;
    font-size:13.5px; outline:none; background:#fff; transition:border-color .15s ease, box-shadow .15s ease; }
  .tx-search input:focus{ border-color:${BEETROOT}; box-shadow:0 0 0 3px ${TINT}; }

  .tx-cover-dots{ position:absolute; inset:0; opacity:.4; pointer-events:none;
    background-image:radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1px); background-size:16px 16px; }

  .tx-post-card{ position:relative; display:flex; flex-direction:column; overflow:hidden; border-radius:20px;
    border:1px solid ${BORDER}; background:#fff; cursor:pointer; transition:box-shadow .25s ease, border-color .25s ease, transform .25s ease; }
  .tx-post-card:hover{ box-shadow:0 26px 50px -30px rgba(27,15,20,0.3); border-color:rgba(122,0,75,0.18); transform:translateY(-2px); }
  .tx-cover{ position:relative; aspect-ratio:16/9; overflow:hidden; }

  .tx-new-badge{ display:inline-flex; align-items:center; gap:.3rem; border-radius:999px; padding:.2rem .55rem;
    font-size:10.5px; font-weight:600; background:#EAFBF1; color:#1B7A43; }

  .tx-stat-pill{ display:inline-flex; align-items:center; gap:.3rem; }

  .tx-auth-btn{ display:flex; align-items:center; justify-content:center; gap:.65rem; width:100%;
    padding:.8rem 1rem; border-radius:.75rem; font-size:14.5px; font-weight:600; cursor:pointer;
    transition:transform .15s ease, box-shadow .15s ease; }
  .tx-auth-btn:active{ transform:scale(0.98); }
  .tx-auth-btn:disabled{ cursor:not-allowed; }
  .tx-field{ width:100%; border:1.5px solid ${BORDER}; border-radius:.7rem; padding:.75rem .95rem;
    font-size:14.5px; outline:none; transition:border-color .15s ease, box-shadow .15s ease; background:#fff; }
  .tx-field:focus{ border-color:${BEETROOT}; box-shadow:0 0 0 3px ${TINT}; }
  .tx-editor-title{ font-family:'Sora',sans-serif; font-size:1.5rem; font-weight:700; line-height:1.3;
    width:100%; border:none; outline:none; resize:none; background:transparent; color:${INK}; }
  @media (min-width:640px){ .tx-editor-title{ font-size:1.85rem; line-height:1.27; } }
  .tx-editor-title::placeholder{ color:rgba(27,15,20,0.28); }
  .tx-editor-body{ font-family:'DM Sans',sans-serif; font-size:15.5px; line-height:1.7; width:100%;
    border:none; outline:none; resize:none; background:transparent; color:${INK}; min-height:40vh; }
  @media (min-width:640px){ .tx-editor-body{ font-size:16.5px; line-height:1.75; } }
  .tx-editor-body::placeholder{ color:rgba(27,15,20,0.32); }
  .tx-toast{ position:fixed; bottom:28px; left:50%; transform:translateX(-50%); z-index:80;
    background:${INK}; color:#fff; padding:.75rem 1.15rem; border-radius:.75rem; font-size:13.5px;
    font-weight:500; display:flex; align-items:center; gap:.55rem; box-shadow:0 16px 34px -12px rgba(0,0,0,0.4); }
  .tx-error{ font-size:12.5px; color:${DANGER}; }

  .tx-card-actions{ position:absolute; top:.65rem; right:.65rem; z-index:5; display:flex; gap:.4rem; }
  .tx-icon-btn{ display:flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:999px;
    border:none; background:rgba(255,255,255,0.92); color:${INK}; cursor:pointer; box-shadow:0 4px 14px -4px rgba(27,15,20,0.35);
    transition:transform .15s ease, background .15s ease; }
  .tx-icon-btn:hover{ transform:translateY(-1px); background:#fff; }
  .tx-icon-btn:disabled{ cursor:not-allowed; opacity:.55; transform:none; }
  .tx-icon-btn-danger{ color:${DANGER}; }
  .tx-icon-btn-danger:hover{ background:#FDECEB; }

  .tx-like-btn{ display:inline-flex; align-items:center; gap:.5rem; border-radius:999px; padding:.6rem 1.2rem;
    font-size:13px; font-weight:600; border:1.5px solid ${BORDER}; background:#fff; cursor:pointer;
    transition:transform .15s ease, background .15s ease, border-color .15s ease; }
  .tx-like-btn:hover{ transform:translateY(-1px); border-color:rgba(122,0,75,0.3); }
  .tx-like-btn.active{ background:${BEETROOT}; border-color:${BEETROOT}; color:#fff; }
  .tx-like-btn:disabled{ cursor:not-allowed; opacity:.6; transform:none; }

  .tx-hero-glow{ position:absolute; pointer-events:none; border-radius:999px; filter:blur(70px); opacity:.10; }

  .tx-eyebrow{ display:inline-flex; align-items:center; gap:.4rem; border-radius:999px; padding:.35rem .8rem;
    font-size:12px; font-weight:600; }

  /* OTP boxes for phone verification */
  .tx-otp-box{ width:clamp(34px,9vw,44px); height:clamp(42px,11vw,52px); text-align:center; font-size:1.15rem; font-weight:600;
    border:1.5px solid ${BORDER}; border-radius:.6rem; outline:none; background:#fff;
    transition:border-color .15s ease, box-shadow .15s ease; }
  .tx-otp-box:focus{ border-color:${BEETROOT}; box-shadow:0 0 0 3px ${TINT}; }

  /* The invisible reCAPTCHA still runs (Firebase Phone Auth requires the
     token), but the floating badge Google injects in the corner is hidden.
     A short text disclosure below the phone form covers Google's required
     attribution instead — see .tx-recaptcha-note. */
  .grecaptcha-badge{ visibility:hidden !important; opacity:0 !important; pointer-events:none !important; }
  .tx-recaptcha-note{ font-size:11px; line-height:1.5; color:${MUTED}; }
  .tx-recaptcha-note a{ color:${MUTED}; text-decoration:underline; text-underline-offset:2px; }
`;

function GoogleIcon({ className = "h-[18px] w-[18px]" }) {
  return (
    <svg viewBox="0 0 48 48" className={className}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.2-.1-2.4-.1-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6.9 29.5 5 24 5c-7.7 0-14.4 4.3-17.7 9.7z" />
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-1.8 14-5.4l-6.5-5.5C29.4 34.6 26.9 36 24 36c-5.4 0-9.9-3.4-11.3-8.2l-6.6 5.1C9.6 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 3.1-3.2 5.6-6.2 7l6.5 5.5C39.4 37.1 43.7 31.4 43.7 24c0-1.2-.1-2.4-.1-3.5z" />
    </svg>
  );
}

const CATEGORIES = ["All", "Product", "Guides", "Customer stories", "Company"];

/* NOTE: There is no local seed/demo data. The feed renders only documents
   that actually exist in Firestore's postsCollection (talent_blog_posts) —
   real posts someone published through the "Write" flow. */

function Masthead({ onWriteClick, syncing }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 border-b bg-[color:var(--paper)]/95 backdrop-blur-md transition-shadow duration-200 ${
        scrolled ? "tx-header-shadow" : ""
      }`}
      style={{ borderColor: BORDER, "--paper": PAPER }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-6 sm:py-4 lg:px-0">
        <a href={HOME_FOOTER_URL} className="flex items-center gap-2">
          <img src={talentLogo} alt="TorchX Talent" className="h-7 w-auto sm:h-8" />
        </a>

        <span className="h-5 w-px shrink-0" style={{ background: BORDER }} />

        <span className="font-display text-[15.5px] font-semibold tracking-tight sm:text-[17px]">
          Blog
        </span>

        {/* Everything on the right — the site "Back" link comes first so it
           sits furthest from the logo, followed by the live status and the
           Write button. This is the only "Back" control on the blog: it
           takes people straight to the TorchX Talent landing page. */}
        <div className="ml-auto flex items-center gap-3">
          <a
            href={HOME_FOOTER_URL}
            className="flex items-center gap-1.5 text-[13.5px] font-medium text-neutral-500 transition-colors hover:text-[--beetroot]"
            style={{ "--beetroot": BEETROOT }}
            title="Back to TorchX Talent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </a>

          <span
            className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium sm:flex"
            style={{ borderColor: BORDER, color: MUTED }}
            title={syncing ? "Connecting to live feed…" : "Live — new posts appear instantly"}
          >
            <span className="tx-live-dot" />
            {syncing ? "Connecting" : "Live"}
          </span>

          <button
            type="button"
            onClick={onWriteClick}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] font-semibold text-white transition-transform hover:scale-[1.03]"
            style={{ background: BEETROOT }}
          >
            <PenLine className="h-3.5 w-3.5" strokeWidth={2.2} />
            Write
          </button>
        </div>
      </div>
    </header>
  );
}

/* Small floating Edit/Delete icon buttons shown in the corner of a card,
   only for the signed-in author's own posts. No navigation involved —
   Edit opens the editor pre-filled, Delete asks to confirm then removes
   the post, both without leaving the feed. */
function CardOwnerActions({ post, onEdit, onDelete }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this post? This can't be undone.")) return;
    setDeleting(true);
    try {
      await onDelete(post);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="tx-card-actions">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(post);
        }}
        className="tx-icon-btn"
        title="Edit post"
        aria-label="Edit post"
      >
        <PenLine className="h-3.5 w-3.5" strokeWidth={2.2} />
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="tx-icon-btn tx-icon-btn-danger"
        title="Delete post"
        aria-label="Delete post"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
      </button>
    </div>
  );
}

function FeaturedCard({ post, canEdit, onEdit, onDelete, onOpen }) {
  const meta = getCategoryMeta(post.category);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onOpen(post)}
      className="group relative mt-10 cursor-pointer overflow-hidden rounded-[24px]"
      style={{ background: meta.gradient }}
    >
      {canEdit && <CardOwnerActions post={post} onEdit={onEdit} onDelete={onDelete} />}

      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-black/10 blur-3xl" />
      <div className="tx-cover-dots" />

      <div className="relative p-5 sm:p-8 md:p-11">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11.5px] font-medium text-white/85 backdrop-blur-sm sm:text-[12px]">
          <Sparkles className="h-3 w-3" strokeWidth={2.2} />
          Featured story
        </span>
        <h2 className="font-display mt-4 max-w-2xl text-[1.5rem] font-bold leading-[1.18] tracking-tight text-white sm:mt-5 sm:text-[1.9rem] md:text-[2.15rem]">
          {post.title}
        </h2>
        <p className="mt-3.5 max-w-xl text-[13.5px] leading-relaxed text-white/75 sm:mt-4 sm:text-[15px]">
          {post.excerpt}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-5 text-[12.5px] text-white/70">
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold text-white">
              {initials(post.author)}
            </span>
            {post.author}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3" />
            {getRelativeTime(post)}
          </span>
          <span className="tx-stat-pill">
            <Eye className="h-3 w-3" /> {post.views || 0}
          </span>
          <span className="tx-stat-pill">
            <Heart className="h-3 w-3" /> {post.likedBy?.length || 0}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

function PostCard({ post, index, canEdit, onEdit, onDelete, onOpen }) {
  const meta = getCategoryMeta(post.category);
  const Icon = meta.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(index, 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => onOpen(post)}
      className="tx-post-card"
    >
      <div className="tx-cover" style={{ background: meta.gradient }}>
        {canEdit && <CardOwnerActions post={post} onEdit={onEdit} onDelete={onDelete} />}
        <div className="tx-cover-dots" />
        <Icon className="absolute bottom-4 right-4 h-9 w-9 text-white/30" strokeWidth={1.5} />
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span
            className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={{ background: meta.tint, color: meta.color }}
          >
            {post.category}
          </span>
          {post.isLive && <span className="tx-new-badge">New</span>}
        </div>

        <h3 className="font-display mt-3.5 text-[1.05rem] font-bold leading-snug tracking-tight sm:text-[1.1rem]">
          {post.title}
        </h3>

        <p className="mt-2 flex-1 text-[13.5px] leading-relaxed" style={{ color: MUTED }}>
          {post.excerpt}
        </p>

        <div
          className="mt-4 flex items-center justify-between border-t pt-3.5 text-[11.5px]"
          style={{ borderColor: BORDER, color: MUTED }}
        >
          <span className="flex items-center gap-2 font-medium" style={{ color: INK }}>
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ background: meta.color }}
            >
              {initials(post.author)}
            </span>
            {post.author}
          </span>
          <span className="flex items-center gap-3">
            <span className="tx-stat-pill"><Eye className="h-3 w-3" /> {post.views || 0}</span>
            <span className="tx-stat-pill"><Heart className="h-3 w-3" /> {post.likedBy?.length || 0}</span>
          </span>
        </div>
      </div>
    </motion.article>
  );
}

/* NewsletterBand — saves each submitted email as its own document in
   Firestore's "talent_blog_subscribers" collection (see Firebase.js). */
function NewsletterBand({ onNotify }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isValidEmail = (val) => /\S+@\S+\.\S+/.test(val);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!isValidEmail(trimmed) || submitting) return;

    setSubmitting(true);
    try {
      await addDoc(subscribersCollection, {
        email: trimmed,
        subscribedAt: serverTimestamp(),
      });
      onNotify(`Thanks — new posts will land in ${trimmed}`);
      setEmail("");
    } catch (err) {
      onNotify("Couldn't subscribe — please try again");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="mt-16 overflow-hidden rounded-2xl border p-7 sm:p-9"
      style={{ borderColor: BORDER, background: `linear-gradient(135deg, ${INK} 0%, #3A1E28 100%)` }}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/80">
            <Send className="h-3 w-3" strokeWidth={2.2} />
            Stay in the loop
          </span>
          <h4 className="font-display mt-3 text-[1.25rem] font-bold tracking-tight text-white">
            New posts, straight to your inbox
          </h4>
          <p className="mt-1.5 max-w-md text-[13.5px] text-white/60">
            One email a month — HR playbooks, product notes, and stories. No spam, unsubscribe anytime.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full max-w-sm shrink-0 gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-[13.5px] text-white placeholder-white/40 outline-none transition-colors focus:border-white/40"
          />
          <button
            type="submit"
            disabled={submitting}
            className="shrink-0 rounded-full px-5 py-2.5 text-[13px] font-semibold text-white transition-transform hover:scale-[1.03] disabled:opacity-60"
            style={{ background: BEETROOT }}
          >
            {submitting ? "Subscribing…" : "Subscribe"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* Shown instead of the featured card + grid when there are zero real
   posts in Firestore yet. */
function EmptyFeed({ syncing, onWriteClick }) {
  if (syncing) {
    return (
      <p className="mt-16 border-t py-14 text-center text-[14px]" style={{ borderColor: BORDER, color: MUTED }}>
        Loading posts…
      </p>
    );
  }
  return (
    <div
      className="mt-16 flex flex-col items-center gap-4 rounded-2xl border py-16 text-center"
      style={{ borderColor: BORDER, background: TINT }}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full text-white"
        style={{ background: BEETROOT }}
      >
        <PenLine className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <div>
        <h4 className="font-display text-[1.1rem] font-bold tracking-tight">No posts yet</h4>
        <p className="mt-1 max-w-sm text-[13.5px]" style={{ color: MUTED }}>
          Nothing's been published on the TorchX Talent blog yet. Be the first to write something.
        </p>
      </div>
      <button
        type="button"
        onClick={onWriteClick}
        className="flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold text-white transition-transform hover:scale-[1.03]"
        style={{ background: BEETROOT }}
      >
        <PenLine className="h-3.5 w-3.5" strokeWidth={2.2} />
        Write the first post
      </button>
    </div>
  );
}

function FeedView({ posts, syncing, user, onWriteClick, onNotify, onEditPost, onDeletePost, onOpenPost }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");

  const isOwner = (post) => Boolean(user) && Boolean(post.authorUid) && user.uid === post.authorUid;

  const hasPosts = posts.length > 0;
  const featured = hasPosts ? posts.find((p) => p.featured) || posts[0] : null;
  const rest = hasPosts ? posts.filter((p) => p.id !== featured.id) : [];

  const byCategory =
    activeCategory === "All" ? rest : rest.filter((p) => p.category === activeCategory);

  const filtered = query.trim()
    ? byCategory.filter((p) =>
        `${p.title} ${p.excerpt}`.toLowerCase().includes(query.trim().toLowerCase())
      )
    : byCategory;

  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = cat === "All" ? rest.length : rest.filter((p) => p.category === cat).length;
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14 lg:px-0">
      {/* Hero — an editorial masthead for the section, not just a page title.
          A soft brand-colored glow sits behind the copy; everything else on
          the page stays quiet so this reads as the one deliberate moment. */}
      <div className="relative">
        <div
          className="tx-hero-glow -left-16 -top-24 h-72 w-72"
          style={{ background: BEETROOT }}
        />
        <div className="relative max-w-2xl">
          <span className="tx-eyebrow" style={{ background: TINT, color: BEETROOT }}>
            <Sparkles className="h-3 w-3" strokeWidth={2.2} />
            The TorchX Talent journal
          </span>
          <h1 className="font-display mt-5 text-[2.1rem] font-extrabold leading-[1.08] tracking-tight sm:text-[2.75rem] md:text-[3.1rem]">
            Notes on hiring, HR, and
            <br className="hidden sm:block" />
            building great teams
          </h1>
          <p className="mt-4 max-w-xl text-[14.5px] leading-relaxed sm:text-[16px]" style={{ color: MUTED }}>
            Product thinking, HR playbooks, and stories from people teams who've
            moved their workforce operations onto TorchX Talent.
          </p>
          <div className="mt-5 flex items-center gap-2 text-[12.5px] font-medium" style={{ color: MUTED }}>
            <span className="tx-live-dot" />
            {syncing
              ? "Connecting to the live feed…"
              : `Synced in real time · ${posts.length} ${posts.length === 1 ? "story" : "stories"}`}
          </div>
        </div>
      </div>

      {!hasPosts ? (
        <EmptyFeed syncing={syncing} onWriteClick={onWriteClick} />
      ) : (
        <>
          <FeaturedCard
            post={featured}
            canEdit={isOwner(featured)}
            onEdit={onEditPost}
            onDelete={onDeletePost}
            onOpen={onOpenPost}
          />

          <div className="mt-8 flex flex-col gap-4 sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
            <div className="tx-blog-scroll flex gap-4 overflow-x-auto pb-1 sm:gap-6">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`tx-cat-tab ${activeCategory === cat ? "active" : ""}`}
                >
                  {cat}
                  <span className="ml-1.5 opacity-60">{categoryCounts[cat]}</span>
                </button>
              ))}
            </div>

            <label className="tx-search w-full sm:w-64">
              <Search className="h-[15px] w-[15px]" strokeWidth={2} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search articles"
              />
            </label>
          </div>

          <div className="mt-8">
            {filtered.length === 0 ? (
              <p
                className="border-t py-14 text-center text-[14px]"
                style={{ borderColor: BORDER, color: MUTED }}
              >
                {query
                  ? `Nothing matches "${query}" — try a different search.`
                  : `Nothing filed under "${activeCategory}" yet — check back soon.`}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
                {filtered.map((post, i) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    index={i}
                    canEdit={isOwner(post)}
                    onEdit={onEditPost}
                    onDelete={onDeletePost}
                    onOpen={onOpenPost}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <NewsletterBand onNotify={onNotify} />

      <div
        className="mt-10 flex flex-col items-start gap-4 rounded-2xl border p-7 sm:flex-row sm:items-center sm:justify-between"
        style={{ borderColor: BORDER, background: TINT }}
      >
        <div>
          <h4 className="font-display text-[1.05rem] font-bold tracking-tight">Have something worth sharing?</h4>
          <p className="mt-1 text-[13.5px]" style={{ color: MUTED }}>
            Create an account and publish your first post in a few minutes.
          </p>
        </div>
        <button
          type="button"
          onClick={onWriteClick}
          className="flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold text-white transition-transform hover:scale-[1.03]"
          style={{ background: BEETROOT }}
        >
          <PenLine className="h-3.5 w-3.5" strokeWidth={2.2} />
          Start writing
        </button>
      </div>
    </div>
  );
}

/* ReaderView — the full-post reading page. Cards only ever show an
   excerpt; this is where the whole body lives, along with the live
   view count and the like button. Since the feed's onSnapshot already
   keeps `posts` current for every visitor, this view is just handed
   the current post object from that same live array — no second
   subscription needed, and likes/edits made elsewhere while someone
   is reading still show up without a refresh. */
function ReaderView({ post, user, onBack, onRequireAuth, onToggleLike }) {
  const meta = getCategoryMeta(post.category);
  const liked = Boolean(user) && (post.likedBy || []).includes(user.uid);

  // Count a view once per browser session, and never for the author's
  // own visits to their own post.
  useEffect(() => {
    const flag = `tx-talent-viewed-${post.id}`;
    if (sessionStorage.getItem(flag)) return;
    if (user && user.uid === post.authorUid) return;
    sessionStorage.setItem(flag, "1");
    updateDoc(doc(postsCollection, post.id), { views: increment(1) }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id]);

  const handleLikeClick = () => {
    if (!user) {
      onRequireAuth();
      return;
    }
    onToggleLike(post, liked);
  };

  return (
    <article className="mx-auto max-w-2xl px-4 pb-24 pt-8 sm:px-6 sm:pb-32 sm:pt-10 lg:px-0">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 text-[13.5px] font-medium text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Blog
      </button>

      <span
        className="mt-7 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ background: meta.tint, color: meta.color }}
      >
        {post.category}
      </span>

      <h1 className="font-display mt-4 text-[1.9rem] font-extrabold leading-[1.14] tracking-tight sm:text-[2.5rem]">
        {post.title}
      </h1>

      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-b py-4 text-[12.5px]" style={{ borderColor: BORDER, color: MUTED }}>
        <span className="flex items-center gap-2 font-medium" style={{ color: INK }}>
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10.5px] font-bold text-white"
            style={{ background: meta.color }}
          >
            {initials(post.author)}
          </span>
          {post.author}
        </span>
        <span className="h-3 w-px" style={{ background: BORDER }} />
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />
          {getRelativeTime(post)}
        </span>
        {post.readTime && (
          <>
            <span className="h-3 w-px" style={{ background: BORDER }} />
            <span>{post.readTime}</span>
          </>
        )}
        <span className="h-3 w-px" style={{ background: BORDER }} />
        <span className="tx-stat-pill"><Eye className="h-3.5 w-3.5" /> {post.views || 0} views</span>
      </div>

      <div className="font-body mt-9 whitespace-pre-wrap text-[16px] leading-[1.9] sm:text-[17px]">
        {post.body || post.excerpt}
      </div>

      <div className="mt-10 border-t pt-8" style={{ borderColor: BORDER }}>
        <button
          type="button"
          onClick={handleLikeClick}
          className={`tx-like-btn ${liked ? "active" : ""}`}
        >
          <Heart className="h-4 w-4" strokeWidth={2.2} fill={liked ? "currentColor" : "none"} />
          {post.likedBy?.length || 0} {(post.likedBy?.length || 0) === 1 ? "Like" : "Likes"}
        </button>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------
   AuthView — backed by real Firebase Authentication:
   - Google: signInWithPopup. Firebase renders Google's own
             account chooser, listing Google accounts already
             signed in on this browser — pick one and it signs
             straight in with no extra steps.
   - Email:  sendSignInLinkToEmail — Firebase's passwordless
             "email link" sign-in. This is the real, secure way
             Firebase verifies an email address without a
             backend: it emails a one-time link (not a typed
             code) that finishes sign-in when opened on this
             device. A numeric email code, like a phone flow,
             needs a server to generate/verify it — Firebase's
             client SDK alone can't do that safely.

   This screen only ever appears for someone who ISN'T signed
   in yet on this device — see the onAuthStateChanged listener
   in BlogPage below, which restores an existing sign-in on
   every visit so a returning author goes straight to the
   editor instead of seeing this again.

   Phone sign-in (RecaptchaVerifier + signInWithPhoneNumber) is
   no longer offered as an entry point on the "choose" stage —
   see the removed "Continue with phone number" button below —
   but the underlying stages/handlers are left in place in case
   phone sign-in is re-enabled later.
--------------------------------------------------------- */
function AuthView({ onAuthed }) {
  const [stage, setStage] = useState("choose"); // choose | email | email-sent | phone | phone-otp | phone-details
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [emailResendIn, setEmailResendIn] = useState(0);

  const [phone, setPhone] = useState("");
  const [phoneName, setPhoneName] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendIn, setResendIn] = useState(30);
  const otpRefs = useRef([]);
  const recaptchaRef = useRef(null);
  const confirmationRef = useRef(null);

  useEffect(() => {
    if (stage !== "phone-otp" || resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, resendIn]);

  useEffect(() => {
    if (stage !== "email-sent" || emailResendIn <= 0) return;
    const t = setTimeout(() => setEmailResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, emailResendIn]);

  // If this page itself is the email-link redirect target, complete
  // the sign-in automatically on mount.
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return;
    let storedEmail = window.localStorage.getItem(EMAIL_FOR_SIGNIN_KEY);
    if (!storedEmail) {
      storedEmail = window.prompt("Confirm your email for sign-in");
    }
    if (!storedEmail) return;
    setBusy(true);
    signInWithEmailLink(auth, storedEmail, window.location.href)
      .then((result) => {
        window.localStorage.removeItem(EMAIL_FOR_SIGNIN_KEY);
        onAuthed({
          uid: result.user.uid,
          name: result.user.displayName || storedEmail.split("@")[0],
          email: result.user.email,
          method: "email",
        });
      })
      .catch((err) => setError(formatAuthError(err)))
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValidEmail = (val) => /\S+@\S+\.\S+/.test(val);

  const handleGoogleSignIn = async () => {
    setError("");
    setBusy(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onAuthed({
        uid: result.user.uid,
        name: result.user.displayName || "Google User",
        email: result.user.email,
        method: "google",
      });
    } catch (err) {
      // A person closing the account chooser isn't an error worth
      // showing red text for — anything else is.
      if (err?.code !== "auth/popup-closed-by-user" && err?.code !== "auth/cancelled-popup-request") {
        setError(formatAuthError(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleEmailContinue = async () => {
    if (!isValidEmail(email.trim())) return;
    setError("");
    setBusy(true);
    try {
      await sendSignInLinkToEmail(auth, email.trim(), {
        url: EMAIL_LINK_REDIRECT_URL,
        handleCodeInApp: true,
      });
      window.localStorage.setItem(EMAIL_FOR_SIGNIN_KEY, email.trim());
      setEmailResendIn(30);
      setStage("email-sent");
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const ensureRecaptcha = () => {
    if (recaptchaRef.current) return recaptchaRef.current;
    recaptchaRef.current = new RecaptchaVerifier(auth, "tx-recaptcha-container", {
      size: "invisible",
    });
    return recaptchaRef.current;
  };

  const handleSendCode = async () => {
    if (phone.replace(/\D/g, "").length < 10) return;
    setError("");
    setBusy(true);
    try {
      const verifier = ensureRecaptcha();
      const fullNumber = `+91${phone}`;
      const confirmation = await signInWithPhoneNumber(auth, fullNumber, verifier);
      confirmationRef.current = confirmation;
      setOtp(["", "", "", "", "", ""]);
      setResendIn(30);
      setStage("phone-otp");
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const otpComplete = otp.every((d) => d !== "");

  const handleVerifyOtp = async () => {
    if (!otpComplete || !confirmationRef.current) return;
    setError("");
    setBusy(true);
    try {
      const result = await confirmationRef.current.confirm(otp.join(""));
      if (result.user.displayName) {
        onAuthed({
          uid: result.user.uid,
          name: result.user.displayName,
          phone: result.user.phoneNumber,
          method: "phone",
        });
      } else {
        setStage("phone-details");
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handlePhoneAccount = () => {
    if (!phoneName.trim()) return;
    const authedUser = auth.currentUser;
    onAuthed({
      uid: authedUser?.uid,
      name: phoneName.trim(),
      phone: authedUser?.phoneNumber || phone,
      method: "phone",
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-0">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="mt-2 grid overflow-hidden rounded-[22px] border shadow-[0_30px_70px_-35px_rgba(122,0,75,0.35)] sm:grid-cols-2"
        style={{ borderColor: BORDER }}
      >
        {/* Left panel */}
        <div
          className="hidden flex-col justify-between p-9 text-white sm:flex"
          style={{ background: `linear-gradient(150deg, ${BEETROOT} 0%, #3D0022 100%)` }}
        >
          <span className="font-display text-lg font-semibold">TorchX Talent</span>
          <p className="font-display text-[1.4rem] font-medium leading-[1.35]">
            "Write once. Reach every HR and people team building something better."
          </p>
          <p className="text-[12.5px] text-white/60">— TorchX Talent Blog contributors</p>
        </div>

        {/* Right panel */}
        <div className="p-6 sm:p-8 md:p-10">
          <p className="text-[11.5px] font-medium sm:text-[12px]" style={{ color: BEETROOT }}>
            {stage === "phone-details"
              ? "Step 2 of 2 — Set up your profile"
              : stage === "phone-otp"
              ? "Step 1 of 2 — Verify it's you"
              : stage === "email-sent"
              ? "Check your inbox"
              : "Step 1 of 2 — Sign in to continue"}
          </p>
          <h2 className="font-display mt-1.5 text-[1.2rem] font-bold tracking-tight sm:text-[1.4rem]">Create your author account</h2>
          <p className="mt-1.5 text-[13.5px]" style={{ color: MUTED }}>
            Verified writers get their own byline and post history on the TorchX Talent blog.
          </p>

          <div className="mt-7 flex flex-col gap-3">
            <AnimatePresence mode="wait">
              {stage === "choose" && (
                <motion.div key="choose" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={busy}
                    className="tx-auth-btn border bg-white text-[--ink] disabled:opacity-50"
                    style={{ borderColor: BORDER, "--ink": INK }}
                  >
                    <GoogleIcon />
                    {busy ? "Opening Google…" : "Continue with Google"}
                  </button>
                  <p className="-mt-1 text-center text-[11.5px]" style={{ color: MUTED }}>
                    Shows the Google accounts already signed in on this device
                  </p>

                  <div className="flex items-center gap-3 py-1">
                    <span className="h-px flex-1" style={{ background: BORDER }} />
                    <span className="text-[12px]" style={{ color: MUTED }}>
                      or
                    </span>
                    <span className="h-px flex-1" style={{ background: BORDER }} />
                  </div>

                  <button
                    type="button"
                    onClick={() => setStage("email")}
                    className="tx-auth-btn border bg-white text-[--ink]"
                    style={{ borderColor: BORDER, "--ink": INK }}
                  >
                    <Mail className="h-4 w-4" strokeWidth={2} />
                    Continue with email
                  </button>
                </motion.div>
              )}

              {stage === "email" && (
                <motion.div
                  key="email-input"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <input
                    autoFocus
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="tx-field"
                    onKeyDown={(e) => e.key === "Enter" && handleEmailContinue()}
                  />
                  <p className="text-[12px]" style={{ color: MUTED }}>
                    We'll email you a secure sign-in link — no password, no code to type.
                  </p>
                  <button
                    type="button"
                    onClick={handleEmailContinue}
                    disabled={!isValidEmail(email.trim()) || busy}
                    className="tx-auth-btn text-white disabled:opacity-50"
                    style={{ background: BEETROOT }}
                  >
                    {busy ? "Sending…" : "Send sign-in link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStage("choose")}
                    className="text-center text-[12.5px] font-medium"
                    style={{ color: MUTED }}
                  >
                    Use a different method
                  </button>
                </motion.div>
              )}

              {stage === "email-sent" && (
                <motion.div
                  key="email-sent"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-full"
                    style={{ background: TINT, color: BEETROOT }}
                  >
                    <Mail className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <p className="text-[13.5px]" style={{ color: INK }}>
                    We sent a sign-in link to <span style={{ fontWeight: 600 }}>{email}</span>.
                  </p>
                  <p className="text-[12.5px]" style={{ color: MUTED }}>
                    Open it on this device to finish creating your account. Didn't get it? Check spam,
                    or resend below.
                  </p>
                  <button
                    type="button"
                    onClick={() => emailResendIn === 0 && handleEmailContinue()}
                    disabled={emailResendIn > 0 || busy}
                    className="text-center text-[12.5px] font-medium disabled:opacity-50"
                    style={{ color: BEETROOT }}
                  >
                    {emailResendIn > 0 ? `Resend link in ${emailResendIn}s` : "Resend link"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStage("email")}
                    className="text-center text-[12.5px] font-medium"
                    style={{ color: MUTED }}
                  >
                    Use a different email
                  </button>
                </motion.div>
              )}

              {stage === "phone" && (
                <motion.div
                  key="phone-input"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <div className="flex gap-2">
                    <span
                      className="flex shrink-0 items-center gap-1.5 rounded-[.7rem] border px-3 text-[14.5px]"
                      style={{ borderColor: BORDER }}
                    >
                      🇮🇳 +91
                    </span>
                    <input
                      autoFocus
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                      placeholder="98765 43210"
                      className="tx-field flex-1"
                      onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                    />
                  </div>
                  <p className="text-[12px]" style={{ color: MUTED }}>
                    We'll send a 6-digit verification code to this number by SMS.
                  </p>
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={phone.length < 10 || busy}
                    className="tx-auth-btn text-white disabled:opacity-50"
                    style={{ background: BEETROOT }}
                  >
                    {busy ? "Sending…" : "Send verification code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStage("choose")}
                    className="text-center text-[12.5px] font-medium"
                    style={{ color: MUTED }}
                  >
                    Use a different method
                  </button>
                  {/* Required mount point for the invisible reCAPTCHA
                      Firebase Phone Auth uses to prevent abuse. No visible
                      checkbox or floating badge — see .grecaptcha-badge
                      above — just this text line instead. */}
                  <div id="tx-recaptcha-container" />
                  <p className="tx-recaptcha-note">
                    This site is protected by reCAPTCHA and the Google{" "}
                    <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
                      Privacy Policy
                    </a>{" "}
                    and{" "}
                    <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">
                      Terms of Service
                    </a>{" "}
                    apply.
                  </p>
                </motion.div>
              )}

              {stage === "phone-otp" && (
                <motion.div
                  key="phone-otp"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <p className="text-[13px]" style={{ color: MUTED }}>
                    Enter the code sent to <span style={{ color: INK, fontWeight: 600 }}>+91 {phone}</span>
                  </p>
                  <div className="flex justify-between gap-2">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpRefs.current[idx] = el)}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        inputMode="numeric"
                        maxLength={1}
                        className="tx-otp-box"
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={!otpComplete || busy}
                    className="tx-auth-btn mt-1 text-white disabled:opacity-50"
                    style={{ background: BEETROOT }}
                  >
                    {busy ? "Verifying…" : "Verify & continue"}
                  </button>
                  <button
                    type="button"
                    onClick={() => resendIn === 0 && handleSendCode()}
                    disabled={resendIn > 0 || busy}
                    className="text-center text-[12.5px] font-medium disabled:opacity-50"
                    style={{ color: BEETROOT }}
                  >
                    {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
                  </button>
                </motion.div>
              )}

              {stage === "phone-details" && (
                <motion.div
                  key="phone-details"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-3"
                >
                  <input
                    autoFocus
                    type="text"
                    value={phoneName}
                    onChange={(e) => setPhoneName(e.target.value)}
                    placeholder="Your name"
                    className="tx-field"
                    onKeyDown={(e) => e.key === "Enter" && handlePhoneAccount()}
                  />
                  <button
                    type="button"
                    onClick={handlePhoneAccount}
                    disabled={!phoneName.trim()}
                    className="tx-auth-btn text-white disabled:opacity-50"
                    style={{ background: BEETROOT }}
                  >
                    Create account
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {error && <p className="tx-error">{error}</p>}
          </div>

          <p className="mt-6 text-center text-[12.5px]" style={{ color: MUTED }}>
            By continuing, you agree to publish under your own name on the TorchX Talent blog.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

/* EditorView doubles as both "write a new post" and "edit an existing
   post": pass initialPost to prefill the form and switch the button
   label / save behavior to an update instead of a fresh publish. */
function EditorView({ user, initialPost, onBack, onSave }) {
  const isEditing = Boolean(initialPost);
  const [title, setTitle] = useState(initialPost?.title || "");
  const [body, setBody] = useState(initialPost?.body || initialPost?.excerpt || "");
  const [category, setCategory] = useState(initialPost?.category || CATEGORIES[1]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef(null);

  const canSave = title.trim().length > 2 && body.trim().length > 20 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        excerpt: body.trim().slice(0, 140) + (body.trim().length > 140 ? "…" : ""),
        category,
        readTime: `${Math.max(1, Math.round(body.trim().split(/\s+/).length / 200))} min read`,
      };
      if (isEditing) {
        await onSave({ ...payload, id: initialPost.id });
      } else {
        await onSave({
          ...payload,
          author: user.name,
          authorUid: user.uid,
          date: "Just now",
          views: 0,
          likedBy: [],
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6 sm:px-6 sm:pb-32 sm:pt-8 lg:px-0">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[13.5px] font-medium text-neutral-500 hover:text-neutral-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {isEditing ? "Cancel" : "Discard"}
        </button>

        <div className="flex items-center gap-3">
          <span className="text-[12.5px]" style={{ color: MUTED }}>
            {isEditing ? "Editing" : "Draft"} · {user.name}
          </span>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-full px-5 py-2 text-[13.5px] font-semibold text-white transition-transform hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: BEETROOT }}
          >
            {saving ? "Saving…" : isEditing ? "Save changes" : "Publish"}
          </button>
        </div>
      </div>

      <div className="relative mt-8 inline-block">
        <button
          type="button"
          onClick={() => setCategoryOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium"
          style={{ borderColor: BORDER, color: BEETROOT }}
        >
          {category}
          <ChevronDown className="h-3 w-3" />
        </button>
        {categoryOpen && (
          <div
            className="absolute left-0 top-full z-10 mt-2 w-44 overflow-hidden rounded-xl border bg-white p-1 shadow-lg"
            style={{ borderColor: BORDER }}
          >
            {CATEGORIES.filter((c) => c !== "All").map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCategory(c);
                  setCategoryOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-[--tint]"
                style={{ "--tint": TINT }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      <textarea
        ref={titleRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Give your post a title"
        rows={1}
        className="tx-editor-title mt-3"
        onInput={(e) => {
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
      />

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Start writing your story…"
        className="tx-editor-body mt-4"
        onInput={(e) => {
          e.target.style.height = "auto";
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
      />
    </div>
  );
}

export default function BlogPage() {
  const [view, setView] = useState("feed"); // feed | auth | editor | read
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [livePosts, setLivePosts] = useState([]);
  const [syncing, setSyncing] = useState(true);
  const [toast, setToast] = useState(null);
  const [editingPost, setEditingPost] = useState(null); // post being edited (null = new post)
  const [readingPostId, setReadingPostId] = useState(null); // id of the post open in ReaderView

  // Restores the signed-in author across visits/reloads. Firebase keeps
  // the sign-in session in this browser by default, so once someone has
  // signed in once (Google or email link) they stay signed in here —
  // "Write" always goes straight to the editor under their existing
  // account, and the "Continue with Google" screen never shows again
  // unless they've actually signed out (there's no sign-out button yet,
  // so in practice it simply won't reappear on this device).
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          name:
            firebaseUser.displayName ||
            firebaseUser.email?.split("@")[0] ||
            firebaseUser.phoneNumber ||
            "Author",
          email: firebaseUser.email,
          phone: firebaseUser.phoneNumber,
        });
      } else {
        setUser(null);
      }
      setAuthChecked(true);
    });
    return unsubscribe;
  }, []);

  // Real-time subscription: any post written to Firestore by any
  // visitor shows up here instantly, for every other visitor, with
  // no refresh. This is the ONLY source of posts in the feed — no
  // local seed/demo data.
  useEffect(() => {
    const q = query(postsCollection, orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          isLive: true,
        }));
        setLivePosts(docs);
        setSyncing(false);
      },
      () => setSyncing(false)
    );
    return unsubscribe;
  }, []);

  const posts = livePosts;
  const readingPost = readingPostId ? posts.find((p) => p.id === readingPostId) || null : null;

  const flashToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2600);
  };

  const goToFeed = () => {
    setView("feed");
    setEditingPost(null);
    setReadingPostId(null);
  };

  const handleWriteClick = () => {
    setEditingPost(null);
    setView(user ? "editor" : "auth");
  };

  const handleAuthed = (newUser) => {
    setUser(newUser);
    flashToast(`Welcome, ${newUser.name.split(" ")[0]} — your account is ready`);
    // If someone was trying to like a post when prompted to sign in,
    // send them back to that post instead of straight to the editor.
    setView(readingPostId ? "read" : "editor");
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setView("editor");
  };

  const handleDeletePost = async (post) => {
    try {
      await deleteDoc(doc(postsCollection, post.id));
      flashToast("Post deleted");
    } catch (err) {
      flashToast("Couldn't delete — please try again");
    }
  };

  const handleSavePost = async (payload) => {
    try {
      if (payload.id) {
        const { id, ...updates } = payload;
        await updateDoc(doc(postsCollection, id), updates);
        flashToast("Post updated");
      } else {
        await addDoc(postsCollection, { ...payload, createdAt: serverTimestamp() });
        flashToast("Post published to the TorchX Talent blog");
      }
      goToFeed();
    } catch (err) {
      flashToast("Couldn't save — please try again");
    }
  };

  const handleOpenPost = (post) => {
    setReadingPostId(post.id);
    setView("read");
  };

  const handleToggleLike = async (post, currentlyLiked) => {
    try {
      await updateDoc(doc(postsCollection, post.id), {
        likedBy: currentlyLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
      });
    } catch (err) {
      flashToast("Couldn't update like — please try again");
    }
  };

  return (
    // The dashboard shell elsewhere in this app sets html/body to
    // overflow:hidden (see LandingPage's own `style={{ height: '100vh',
    // overflowY: 'auto' }}` wrapper for the same reason) — without this
    // element creating its own scroll container, the blog page inherits
    // that and never scrolls, however tall its content gets.
    <div className="tx-blog" style={{ height: "100vh", overflowY: "auto" }}>
      <style>{BLOG_STYLE}</style>

      <Masthead onWriteClick={handleWriteClick} syncing={syncing} />

      <AnimatePresence mode="wait">
        {view === "feed" && (
          <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FeedView
              posts={posts}
              syncing={syncing}
              user={user}
              onWriteClick={handleWriteClick}
              onNotify={flashToast}
              onEditPost={handleEditPost}
              onDeletePost={handleDeletePost}
              onOpenPost={handleOpenPost}
            />
          </motion.div>
        )}
        {view === "read" && readingPost && (
          <motion.div key="read" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ReaderView
              post={readingPost}
              user={user}
              onBack={goToFeed}
              onRequireAuth={() => setView("auth")}
              onToggleLike={handleToggleLike}
            />
          </motion.div>
        )}
        {view === "auth" && (
          <motion.div key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <AuthView onAuthed={handleAuthed} />
          </motion.div>
        )}
        {view === "editor" && user && (
          <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <EditorView user={user} initialPost={editingPost} onBack={goToFeed} onSave={handleSavePost} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="tx-toast"
          >
            <Check className="h-4 w-4" strokeWidth={2.4} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}