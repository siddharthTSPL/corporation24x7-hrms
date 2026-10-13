export const fadeUp = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } }
}

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } }
}

export const cardVariant = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

export const fontStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Instrument+Sans:wght@400;500;600;700&display=swap');

  .font-display { font-family: 'Sora', sans-serif; }
  .font-body { font-family: 'DM Sans', sans-serif; }
  .font-ui { font-family: 'Instrument Sans', sans-serif; }
  .font-hero { font-family: 'Roboto', sans-serif; }

  html { scroll-behavior: smooth; overflow-x: hidden; }
  body { -webkit-font-smoothing: antialiased; overflow-x: hidden; }
  .scroll-anchor { scroll-margin-top: 72px; }

  @keyframes menuDrop {
    from { opacity: 0; transform: translateY(-8px); max-height: 0; }
    to   { opacity: 1; transform: translateY(0);    max-height: 360px; }
  }
  .nav-mobile-menu { overflow: hidden; animation: menuDrop .24s ease both; }

  @keyframes testimonialScroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
   .testimonial-marquee {
    overflow: hidden;
    padding: 26px 0;
    -webkit-mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
    mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
  }
  .testimonial-track {
    display: flex;
    width: max-content;
    gap: 28px;
    animation: testimonialScroll 50s linear infinite;
  }
  .testimonial-marquee:hover .testimonial-track,
  .testimonial-marquee:active .testimonial-track {
    animation-play-state: paused;
  }
  .testi-card-m { flex: 0 0 auto; }
  @media (max-width: 640px) {
    .testimonial-track { animation-duration: 24s; gap: 16px; }
  }

  @keyframes orbitSpin1 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes orbitSpin2 { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
  @keyframes orbitSpin3 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes orbitSpin4 { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
  .orbit-1 { animation: orbitSpin1 22s linear infinite; transform-origin: 250px 250px; }
  .orbit-2 { animation: orbitSpin2 30s linear infinite; transform-origin: 250px 250px; }
  .orbit-3 { animation: orbitSpin3 36s linear infinite; transform-origin: 250px 250px; }
  .orbit-4 { animation: orbitSpin4 46s linear infinite; transform-origin: 250px 250px; }

  @keyframes orbitTravel { to { stroke-dashoffset: -1200; } }
  .orbit-highlight-a { stroke-dasharray: 36 900; animation: orbitTravel 16s linear infinite; }
  .orbit-highlight-b { stroke-dasharray: 26 700; animation: orbitTravel 22s linear infinite reverse; }

  @media (prefers-reduced-motion: reduce) {
    .orbit-1, .orbit-2, .orbit-3, .orbit-4,
    .orbit-highlight-a, .orbit-highlight-b { animation: none; }
    .orbit-highlight-a, .orbit-highlight-b { opacity: 0; }
  }

  @media (max-width: 640px) {
    .orbit-3, .orbit-4 { display: none; }
  }
`