const KEY = "torchx_spark_prefs";
const DEFAULTS = { enterIsSend: true };

export const getChatPrefs = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
};

export const setChatPrefs = (patch) => {
  const next = { ...getChatPrefs(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return next;
  }
  return next;
};
