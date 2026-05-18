const FontInjector = () => (
  <style>{`
    * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:.25} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
    @keyframes spin   { to{transform:rotate(360deg)} }
    .ann-card-hover:hover { border-color: rgba(205,22,110,0.45) !important; transform: translateY(-3px); }
    .read-more-btn:hover  { color: #730042 !important; }
    .filter-btn:hover     { background: rgba(115,0,66,0.08) !important; }
  `}</style>
);

export default FontInjector;