import { FaBars, FaSearch, FaBell } from "react-icons/fa";
import { useEffect, useState } from "react";

export default function Navbar({ collapsed, setCollapsed, data = [] }) {
  const [dateTime, setDateTime] = useState("");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  // ✅ LIVE DATE + TIME
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      const formatted = now.toLocaleString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      setDateTime(formatted);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  // ✅ SEARCH FILTER
  useEffect(() => {
    if (!search) {
      setResults([]);
      return;
    }

    const filtered = data.filter((item) =>
      Object.values(item)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );

    setResults(filtered);
  }, [search, data]);

  return (
    <div className="w-full bg-white border-b px-4 md:px-6 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-3">

      {/* LEFT SECTION */}
      <div className="flex items-center gap-3">

        {/* SIDEBAR TOGGLE */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex p-2 rounded-lg hover:bg-gray-200"
        >
          <FaBars className="text-black" />
        </button>

        {/* SEARCH */}
        <div className="relative w-full sm:w-60 md:w-72">
          <input
            type="text"
            placeholder="Search employees, departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#730042]"
          />
          <FaSearch className="absolute left-3 top-3 text-gray-400 text-sm" />
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center justify-between md:justify-end gap-4">

        {/* DATE + TIME */}
        <div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
          {dateTime}
        </div>

        {/* NOTIFICATION */}
        <div className="relative cursor-pointer">
          <FaBell className=" text-lg" />
          <span className="absolute -top-2 -right-2 bg-[#730042] text-white text-[10px] px-1.5 rounded-full">
            2
          </span>
        </div>

        {/* PROFILE */}
        <div className="w-9 h-9 rounded-full bg-[#730042] text-white flex items-center justify-center text-sm font-semibold">
          JA
        </div>
      </div>

      {/* SEARCH RESULTS */}
      {search && (
        <div className="text-xs text-[#730042] w-full">
          {results.length} result(s) found
        </div>
      )}
    </div>
  );
}