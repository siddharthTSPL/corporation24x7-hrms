// All display formatting lives here so every report looks the same.
const IST = "Asia/Kolkata";
const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: IST, day: "2-digit", month: "short", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: IST, hour: "2-digit", minute: "2-digit", hour12: false });
const money = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num2 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const int = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export const formatCell = (type, v) => {
  if (v === null || v === undefined || v === "") return "—";
  switch (type) {
    case "date": return dateFmt.format(new Date(v)).replace(/ /g, "-");
    case "time": return timeFmt.format(new Date(v));
    case "datetime": return `${dateFmt.format(new Date(v)).replace(/ /g, "-")} ${timeFmt.format(new Date(v))}`;
    case "currency": return money.format(Number(v));
    case "percent": return `${num2.format(Number(v))}%`;
    case "integer": return int.format(Number(v));
    case "number":
    case "hours": return num2.format(Number(v));
    default: return String(v);
  }
};

export const isNumericType = (t) => ["currency", "percent", "integer", "number", "hours"].includes(t);
export const formatGeneratedAt = (iso) =>
  `${dateFmt.format(new Date(iso)).replace(/ /g, "-")} ${timeFmt.format(new Date(iso))} IST`;
