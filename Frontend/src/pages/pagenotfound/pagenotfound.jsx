import { useEffect, useRef } from "react";

const styles = {
  wrapper: {
    position: "relative",
    width: "100%",
    height: "100vh",
    background: "linear-gradient(135deg, #1a0a12 0%, #2d0f1e 50%, #1a0a12 100%)",
    overflow: "hidden",
    fontFamily: "'Righteous', cursive",
  },
  moon: {
    background: "linear-gradient(120deg, #c8a0b4 30%, #8a5a72 100%)",
    position: "absolute",
    top: "-100px",
    left: "-300px",
    width: "900px",
    height: "900px",
    borderRadius: "50%",
    boxShadow: "0 0 60px rgba(115,0,66,0.3)",
  },
  crater: {
    position: "absolute",
    borderRadius: "50%",
    background: "linear-gradient(90deg, rgba(80,20,50,0.6) 30%, rgba(160,80,110,0.4) 100%)",
  },
  star: {
    background: "#e8c0d0",
    position: "absolute",
    width: "4px",
    height: "4px",
    borderRadius: "50%",
  },
  error: {
    position: "absolute",
    left: "100px",
    top: "400px",
    transform: "translateY(-60%)",
    color: "#5a2a3a",
  },
  errorTitle: {
    fontSize: "10em",
    lineHeight: 1,
    color: "#730042",
    textShadow: "0 0 30px rgba(115,0,66,0.4)",
  },
  errorSubtitle: {
    fontSize: "2em",
    color: "#a0506a",
    marginTop: "4px",
  },
  errorDescription: {
    opacity: 0.7,
    fontSize: "0.9em",
    marginTop: "8px",
    color: "#c07090",
    fontFamily: "sans-serif",
    fontWeight: 400,
  },
  btnRow: {
    marginTop: "3em",
    display: "flex",
    gap: "10px",
  },
  btn: {
    minWidth: "7em",
    padding: "0.5em 2em",
    outline: "none",
    border: "2px solid #730042",
    backgroundColor: "transparent",
    borderRadius: "8em",
    color: "#a0506a",
    cursor: "pointer",
    fontSize: "0.75em",
    fontFamily: "'Righteous', cursive",
    transition: "all 0.2s",
  },
  btnActive: {
    backgroundColor: "#730042",
    border: "2px solid #730042",
    color: "white",
  },
  astronaut: {
    position: "absolute",
    width: "185px",
    height: "300px",
    left: "70%",
    top: "50%",
    transform: "translate(-50%, -50%) rotate(20deg) scale(1.2)",
  },
};

const craterData = [
  { top: "250px", left: "500px", width: "60px", height: "180px" },
  { top: "650px", left: "340px", width: "40px", height: "80px", transform: "rotate(55deg)" },
  { top: "-20px", left: "40px", width: "65px", height: "120px", transform: "rotate(250deg)" },
];

const starData = [
  { top: "40%", left: "50%", animationDelay: "1s" },
  { top: "60%", left: "90%", animationDelay: "3s" },
  { top: "10%", left: "70%", animationDelay: "2s" },
  { top: "90%", left: "40%", animationDelay: "0s" },
  { top: "20%", left: "30%", animationDelay: "0.5s" },
  { top: "45%", left: "78%", animationDelay: "1.8s" },
  { top: "72%", left: "60%", animationDelay: "0.3s" },
];

const AstronautPart = ({ style }) => <div style={style} />;

function Astronaut({ cordRef, visorRef }) {
  const beetroot = "#730042";
  const bodyColor = "#eedde5";
  const skinLight = "#f5e8ed";

  const parts = [
    { top: "90px", left: "47px", width: "86px", height: "90px", borderRadius: "8px", backgroundColor: "#d4b0be" },
    { top: "115px", left: "55px", width: "70px", height: "80px", borderRadius: "8px", backgroundColor: bodyColor },
    { top: "140px", left: "68px", width: "45px", height: "25px", borderRadius: "6px", backgroundColor: "#e0c5d0" },
    { top: "127px", left: "9px", width: "65px", height: "20px", borderRadius: "8px", transform: "rotate(-30deg)", backgroundColor: bodyColor },
    { top: "102px", left: "7px", width: "20px", height: "45px", borderRadius: "8px", transform: "rotate(-12deg)", borderTopLeftRadius: "8em", borderTopRightRadius: "8em", backgroundColor: bodyColor },
    { top: "113px", left: "100px", width: "65px", height: "20px", borderRadius: "8px", transform: "rotate(-10deg)", backgroundColor: bodyColor },
    { top: "78px", left: "141px", width: "20px", height: "45px", borderRadius: "8px", transform: "rotate(-10deg)", borderTopLeftRadius: "8em", borderTopRightRadius: "8em", backgroundColor: bodyColor },
    { top: "110px", left: "21px", width: "10px", height: "6px", borderRadius: "8em", transform: "rotate(-35deg)", backgroundColor: bodyColor },
    { top: "90px", left: "133px", width: "10px", height: "6px", borderRadius: "8em", transform: "rotate(20deg)", backgroundColor: bodyColor },
    { top: "188px", left: "50px", width: "23px", height: "75px", transform: "rotate(10deg)", backgroundColor: bodyColor },
    { top: "188px", left: "108px", width: "23px", height: "75px", transform: "rotate(-10deg)", backgroundColor: bodyColor },
    { top: "122px", left: "6.5px", width: "21px", height: "4px", borderRadius: "8em", transform: "rotate(-15deg)", backgroundColor: beetroot },
    { top: "98px", left: "141px", width: "21px", height: "4px", borderRadius: "8em", transform: "rotate(-10deg)", backgroundColor: beetroot },
    {
      top: "240px", left: "43px", width: "28px", height: "20px", transform: "rotate(10deg)",
      borderRadius: "3px", borderTopLeftRadius: "8em", borderTopRightRadius: "8em",
      borderBottom: `4px solid ${beetroot}`, backgroundColor: skinLight,
    },
    {
      top: "240px", left: "111px", width: "28px", height: "20px", transform: "rotate(-10deg)",
      borderRadius: "3px", borderTopLeftRadius: "8em", borderTopRightRadius: "8em",
      borderBottom: `4px solid ${beetroot}`, backgroundColor: skinLight,
    },
  ];

  return (
    <div style={{ ...styles.astronaut, position: "absolute" }}>
      {parts.map((p, i) => (
        <AstronautPart key={i} style={{ position: "absolute", content: "''", ...p }} />
      ))}
      <div style={{ position: "absolute", top: "-40px", left: "-60px" }}>
        <canvas ref={cordRef} id="cord" width="300" height="400" />
      </div>
      <div style={{
        backgroundColor: skinLight,
        position: "absolute",
        top: "60px",
        left: "60px",
        width: "60px",
        height: "60px",
        borderRadius: "2em",
      }}>
        <canvas ref={visorRef} id="visor" width="60" height="60" />
        <div style={{ backgroundColor: "#9a7080", position: "absolute", top: "28px", left: "40px", width: "10px", height: "10px", borderRadius: "50%", opacity: 0.5 }} />
        <div style={{ backgroundColor: "#8a6070", position: "absolute", top: "40px", left: "38px", width: "5px", height: "5px", borderRadius: "50%", opacity: 0.3 }} />
      </div>
    </div>
  );
}

export default function NotFound404({ onLogin, onContact }) {
  const visorRef = useRef(null);
  const cordRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (visorRef.current) {
      const ctx = visorRef.current.getContext("2d");
      ctx.beginPath();
      ctx.moveTo(5, 45);
      ctx.bezierCurveTo(15, 64, 45, 64, 55, 45);
      ctx.lineTo(55, 20);
      ctx.bezierCurveTo(55, 15, 50, 10, 45, 10);
      ctx.lineTo(15, 10);
      ctx.bezierCurveTo(15, 10, 5, 10, 5, 20);
      ctx.lineTo(5, 45);
      ctx.fillStyle = "#2d0820";
      ctx.strokeStyle = "#f5e8ed";
      ctx.fill();
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    if (!cordRef.current) return;
    const ctx = cordRef.current.getContext("2d");
    let y1 = 100, y2 = 80, y3 = 80;
    let f1 = true, f2 = false, f3 = true;

    function animate() {
      animRef.current = requestAnimationFrame(animate);
      ctx.clearRect(0, 0, 300, 400);
      ctx.beginPath();
      ctx.moveTo(100, 180);
      ctx.bezierCurveTo(180, y1, 240, y2, 280, y3);
      ctx.strokeStyle = "#e8a0c0";
      ctx.lineWidth = 3;
      ctx.stroke();
      if (y1 === 80) f1 = true; if (y1 === 220) f1 = false;
      if (y2 === 60) f2 = true; if (y2 === 230) f2 = false;
      if (y3 === 60) f3 = true; if (y3 === 240) f3 = false;
      f1 ? y1++ : y1--;
      f2 ? y2++ : y2--;
      f3 ? y3++ : y3--;
    }
    animate();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Righteous&display=swap');
        @keyframes shimmer { from { opacity: 0.1; } to { opacity: 0.8; } }
        .star-pulse { animation: shimmer 1.5s infinite alternate; }
        .err-btn:hover { color: #730042 !important; }
        .err-btn-active:hover { box-shadow: 0 0 14px rgba(115,0,66,0.5) !important; color: white !important; }
        @media (max-width: 700px) {
          .pnf-error { left: 24px !important; right: 24px !important; top: 45% !important; }
          .pnf-error-title { font-size: 5em !important; }
          .pnf-error-subtitle { font-size: 1.4em !important; }
        }
      `}</style>
      <div style={styles.wrapper}>
        <div style={styles.moon} />
        {craterData.map((c, i) => (
          <div key={i} style={{ ...styles.crater, ...c }} />
        ))}
        {starData.map((s, i) => (
          <div
            key={i}
            className="star-pulse"
            style={{ ...styles.star, top: s.top, left: s.left, animationDelay: s.animationDelay }}
          />
        ))}

        <div className="pnf-error" style={styles.error}>
          <div className="pnf-error-title" style={styles.errorTitle}>404</div>
          <div className="pnf-error-subtitle" style={styles.errorSubtitle}>Hmmm...</div>
          <div style={styles.errorDescription}>It looks like one of the developers fell asleep</div>
          <div style={styles.btnRow}>
            <button
              className="err-btn err-btn-active"
              style={{ ...styles.btn, ...styles.btnActive }}
              onClick={onLogin}
            >
              LOGIN
            </button>
            <button
              className="err-btn"
              style={styles.btn}
              onClick={onContact}
            >
              CONTACT
            </button>
          </div>
        </div>

        <Astronaut cordRef={cordRef} visorRef={visorRef} />
      </div>
    </>
  );
}