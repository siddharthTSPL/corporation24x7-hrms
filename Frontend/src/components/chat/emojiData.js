// Emoji, stickers and wallpapers used by the chat. Everything is built in (no extra npm package).

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏"];

export const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    icon: "😀",
    name: "Smileys",
    emojis:
      "😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 😮‍💨 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 ☹️ 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 ☠️ 💩 🤡 👻 👽 🤖".split(" "),
  },
  {
    id: "gestures",
    icon: "👍",
    name: "People",
    emojis:
      "👋 🤚 🖐️ ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🧠 👀 👁️ 👅 👄 👶 🧒 👦 👧 🧑 👨 👩 🧓 👴 👵 🙋 🙋‍♂️ 🙋‍♀️ 🤦 🤦‍♂️ 🤦‍♀️ 🤷 🤷‍♂️ 🤷‍♀️ 🙇 💁 🙅 🙆 🧑‍💻 👨‍💻 👩‍💻 🧑‍💼 👨‍💼 👩‍💼 🕵️ 👮 🦸 🧙 🧑‍🎓 🧑‍🏫".split(" "),
  },
  {
    id: "hearts",
    icon: "❤️",
    name: "Hearts",
    emojis:
      "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ♥️ 💋 💯 💢 💥 💫 💦 💨 🕳️ 💬 👁️‍🗨️ 🗯️ 💭 💤".split(" "),
  },
  {
    id: "nature",
    icon: "🐶",
    name: "Animals",
    emojis:
      "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🐢 🐍 🐙 🦀 🐠 🐬 🐳 🦈 🐘 🦒 🦓 🐪 🌵 🌲 🌳 🌴 🌱 🌿 ☘️ 🍀 🍁 🍂 🍃 🌸 🌼 🌻 🌹 🌷 🌞 🌝 ⭐ 🌟 ✨ ⚡ 🔥 🌈 ☀️ ⛅ ☁️ 🌧️ ⛈️ ❄️ ☃️ 🌊".split(" "),
  },
  {
    id: "food",
    icon: "🍕",
    name: "Food",
    emojis:
      "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🥦 🥕 🌽 🌶️ 🥔 🍞 🥐 🧀 🍳 🥞 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍦 🍧 🍨 🍩 🍪 🎂 🍰 🧁 🍫 🍬 🍭 ☕ 🍵 🥤 🍺 🍻 🥂 🍷 🍹 🧃".split(" "),
  },
  {
    id: "activities",
    icon: "⚽",
    name: "Activities",
    emojis:
      "⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥅 🏏 ⛳ 🏹 🎣 🥊 🥋 🎽 🛹 ⛸️ 🎿 🏆 🥇 🥈 🥉 🏅 🎖️ 🎯 🎮 🕹️ 🎲 🧩 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 📚 ✈️ 🚗 🚕 🚌 🚆 🚀 🛵 🚲 🏠 🏢 🏖️ ⛰️ 🗺️".split(" "),
  },
  {
    id: "objects",
    icon: "💼",
    name: "Work & objects",
    emojis:
      "💼 📁 📂 🗂️ 📅 📆 🗓️ 📋 📌 📍 📎 🖇️ ✂️ 📝 ✏️ 🖊️ 🖋️ 📏 📐 🔍 🔎 🔒 🔓 🔑 💡 🔦 🔋 🔌 💻 🖥️ ⌨️ 🖱️ 💾 💿 📱 ☎️ 📞 📠 📧 📨 📩 📤 📥 📦 📮 📊 📈 📉 💰 💵 💳 🧾 ⏰ ⏳ ⌛ 🔔 🔕 📢 📣 🎁 🎉 🎊 🎈 ✅ ❌ ❓ ❗ ⚠️ 🚫 ✔️ ➕ ➖ ➡️ ⬅️ ⬆️ ⬇️ 🔁 🔄 🆗 🆕 🆒 🔴 🟢 🟡 🔵".split(" "),
  },
];

// ------------------------------------------------------------------ stickers
// A sticker is sent as { sticker: "<id>" }; the id is looked up here to draw it.
// (Unknown ids still render as a plain big emoji, so old messages never break.)
const S = (id, emoji, label, bg) => ({ id, emoji, label, bg });

export const STICKER_PACKS = [
  {
    id: "react",
    name: "Reactions",
    icon: "👍",
    stickers: [
      S("react:thumbs-up", "👍", "Sounds good", "#E8F5E9"),
      S("react:thank-you", "🙏", "Thank you!", "#FFF3E0"),
      S("react:lol", "😂", "LOL", "#FFFDE7"),
      S("react:wow", "😮", "Wow!", "#E3F2FD"),
      S("react:love", "😍", "Love it", "#FCE4EC"),
      S("react:sad", "😢", "Sad", "#E8EAF6"),
      S("react:facepalm", "🤦", "Oops", "#F3E5F5"),
      S("react:think", "🤔", "Hmm...", "#ECEFF1"),
      S("react:cool", "😎", "Cool", "#E0F7FA"),
      S("react:clap", "👏", "Well done", "#FFF8E1"),
      S("react:shrug", "🤷", "No idea", "#EFEBE9"),
      S("react:hug", "🤗", "Hugs", "#FFF3E0"),
    ],
  },
  {
    id: "office",
    name: "Office",
    icon: "💼",
    stickers: [
      S("office:on-it", "🫡", "On it!", "#E8F5E9"),
      S("office:done", "✅", "Done", "#E8F5E9"),
      S("office:busy", "🔥", "Busy right now", "#FFEBEE"),
      S("office:meeting", "📅", "In a meeting", "#E3F2FD"),
      S("office:lunch", "🍛", "Lunch time", "#FFF3E0"),
      S("office:coffee", "☕", "Coffee break?", "#EFEBE9"),
      S("office:call-me", "📞", "Call me", "#E0F7FA"),
      S("office:deadline", "⏰", "Deadline!", "#FFEBEE"),
      S("office:idea", "💡", "Idea!", "#FFFDE7"),
      S("office:wfh", "🏠", "Working from home", "#F3E5F5"),
      S("office:on-leave", "🌴", "On leave", "#E0F2F1"),
      S("office:approved", "👍", "Approved", "#E8F5E9"),
    ],
  },
  {
    id: "celebrate",
    name: "Celebrate",
    icon: "🎉",
    stickers: [
      S("celebrate:party", "🥳", "Party time!", "#FCE4EC"),
      S("celebrate:congrats", "🎉", "Congrats!", "#FFF8E1"),
      S("celebrate:birthday", "🎂", "Happy birthday", "#FCE4EC"),
      S("celebrate:trophy", "🏆", "Champion", "#FFF8E1"),
      S("celebrate:star", "🌟", "Star performer", "#FFFDE7"),
      S("celebrate:fire", "🔥", "You're on fire", "#FFEBEE"),
      S("celebrate:rocket", "🚀", "Let's go!", "#E8EAF6"),
      S("celebrate:cake", "🍰", "Treat!", "#FCE4EC"),
      S("celebrate:medal", "🥇", "No. 1", "#FFF8E1"),
      S("celebrate:gift", "🎁", "A gift for you", "#F3E5F5"),
      S("celebrate:diwali", "🪔", "Happy Diwali", "#FFF3E0"),
      S("celebrate:holi", "🎨", "Happy Holi", "#F3E5F5"),
    ],
  },
  {
    id: "mood",
    name: "Mood",
    icon: "😴",
    stickers: [
      S("mood:sleepy", "😴", "Sleepy", "#E8EAF6"),
      S("mood:angry", "😡", "Angry", "#FFEBEE"),
      S("mood:cry", "😭", "Crying", "#E3F2FD"),
      S("mood:shy", "🥺", "Please?", "#FCE4EC"),
      S("mood:sick", "🤒", "Not well", "#E8F5E9"),
      S("mood:stress", "🤯", "Mind blown", "#FFF3E0"),
      S("mood:hungry", "🍕", "Hungry", "#FFF3E0"),
      S("mood:bye", "👋", "Bye!", "#E0F7FA"),
      S("mood:hi", "🙋", "Hi there", "#E0F7FA"),
      S("mood:good-morning", "🌞", "Good morning", "#FFFDE7"),
      S("mood:good-night", "🌙", "Good night", "#E8EAF6"),
      S("mood:sorry", "🙇", "Sorry", "#ECEFF1"),
    ],
  },
];

const STICKER_INDEX = new Map(STICKER_PACKS.flatMap((p) => p.stickers).map((s) => [s.id, s]));
export const findSticker = (id) => STICKER_INDEX.get(id) || null;

// ------------------------------------------------------------------ wallpapers
// Stored per person per chat as "preset:<id>", "color:#rrggbb" or an https image url.
export const WALLPAPER_PRESETS = [
  { id: "default", name: "Default", css: "#F7F9FB" },
  { id: "paper", name: "Paper", css: "#FBF7F0" },
  { id: "mist", name: "Mist", css: "linear-gradient(160deg,#E8F0F8 0%,#F7F9FB 100%)" },
  { id: "mint", name: "Mint", css: "linear-gradient(160deg,#DFF5EC 0%,#F2FBF7 100%)" },
  { id: "peach", name: "Peach", css: "linear-gradient(160deg,#FFE5D6 0%,#FFF6F0 100%)" },
  { id: "lavender", name: "Lavender", css: "linear-gradient(160deg,#E9E1FA 0%,#F7F3FF 100%)" },
  { id: "rose", name: "Rose", css: "linear-gradient(160deg,#F6D9E6 0%,#FDF1F6 100%)" },
  { id: "sunset", name: "Sunset", css: "linear-gradient(160deg,#FDD6BD 0%,#F7B7C8 55%,#C9B6F2 100%)" },
  { id: "ocean", name: "Ocean", css: "linear-gradient(160deg,#BFE3F5 0%,#8FC1E8 100%)" },
  { id: "forest", name: "Forest", css: "linear-gradient(160deg,#CBE8D0 0%,#8FCB9B 100%)" },
  {
    id: "dots",
    name: "Dots",
    css: "radial-gradient(rgba(115,0,66,.10) 1.2px, transparent 1.4px) 0 0/18px 18px, #F7F9FB",
  },
  {
    id: "grid",
    name: "Grid",
    css: "linear-gradient(rgba(14,116,144,.08) 1px, transparent 1px) 0 0/22px 22px, linear-gradient(90deg, rgba(14,116,144,.08) 1px, transparent 1px) 0 0/22px 22px, #F4FAFC",
  },
  {
    id: "diagonal",
    name: "Stripes",
    css: "repeating-linear-gradient(45deg, rgba(115,0,66,.05) 0 10px, transparent 10px 20px), #FBF3F7",
  },
  { id: "slate", name: "Slate", css: "linear-gradient(160deg,#CFD8DC 0%,#B0BEC5 100%)" },
  { id: "night", name: "Night", css: "linear-gradient(160deg,#2B2F4A 0%,#1B1E33 100%)" },
  { id: "midnight", name: "Midnight", css: "linear-gradient(160deg,#243B55 0%,#141E30 100%)" },
];

export const WALLPAPER_COLORS = ["#efeae2", "#FFF8E1", "#E8F5E9", "#E3F2FD", "#FCE4EC", "#EDE7F6", "#FFE0B2", "#D7CCC8", "#CFD8DC", "#263238"];

const DARK_PRESETS = new Set(["night", "midnight"]);

export const wallpaperStyle = (w) => {
  if (!w) return { backgroundColor: "transparent" };
  if (w.startsWith("preset:")) {
    const p = WALLPAPER_PRESETS.find((x) => x.id === w.slice(7));
    return { background: p ? p.css : "transparent" };
  }
  if (w.startsWith("color:")) return { background: w.slice(6) };
  if (/^https:\/\//.test(w)) {
    return { backgroundImage: `url(${JSON.stringify(w)})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#efeae2" };
  }
  return { backgroundColor: "transparent" };
};

// true when the wallpaper is dark enough that the small date/typing chips need a light background
export const isDarkWallpaper = (w) => (w || "").startsWith("preset:") && DARK_PRESETS.has(w.slice(7));
