const registry = new Map();

function registerReport(def) {
  if (registry.has(def.key))
    throw new Error(`Duplicate report key: ${def.key}`);
  registry.set(def.key, def);
}

module.exports = {
  registerReport,
  getReport: (key) => registry.get(key),
  getAllReports: () => Array.from(registry.values()),
};
