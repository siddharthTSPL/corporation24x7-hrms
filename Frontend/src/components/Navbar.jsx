import { FaBars, FaSearch } from "react-icons/fa";
import { useEffect, useState } from "react";

export default function Navbar({ collapsed, setCollapsed }) {
  const [dateTime, setDateTime] = useState("");
  const [thought, setThought] = useState("");

  // TIME + THOUGHT LOGIC
  useEffect(() => {
    const updateTimeAndThought = () => {
      const now = new Date();
      const hours = now.getHours();

      // FORMAT DATE
      const formatted = now.toLocaleString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      setDateTime(formatted);

      // THOUGHT BASED ON TIME
      if (hours >= 5 && hours < 12) {
        setThought("🌅 Start your day with focus and positivity");
      } else if (hours >= 12 && hours < 18) {
        setThought("🌤 Keep pushing, you're doing great");
      } else {
        setThought("🌙 Reflect, relax and prepare for tomorrow");
      }
    };

    updateTimeAndThought();
    const interval = setInterval(updateTimeAndThought, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-auto md:h-16 bg-white shadow px-4 md:px-6 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">

      {/* TOP ROW */}
      <div className="flex items-center justify-between md:justify-start gap-3 md:gap-4">

        {/* TOGGLE */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
        >
          <FaBars />
        </button>

        {/* TITLE */}
        <h2 className="hidden sm:block font-semibold text-[var(--primary)]">
          Overview
        </h2>
      </div>

      {/* MIDDLE ROW */}
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 flex-1">

        {/* SMALL SEARCH */}
        <div className="relative w-full md:max-w-xs">
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          <FaSearch className="absolute left-2 top-2 text-gray-400 text-sm" />
        </div>

        {/* THOUGHT OF THE DAY */}
        <div className="text-xs md:text-sm text-gray-600 italic truncate">
          {thought}
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center justify-between md:justify-end gap-3 md:gap-6">

        {/* DATE */}
        <div className="hidden md:block text-sm text-gray-600 whitespace-nowrap">
          {dateTime}
        </div>

        {/* PROFILE */}
        <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-semibold">
          A
        </div>
      </div>
    </div>
  );
}