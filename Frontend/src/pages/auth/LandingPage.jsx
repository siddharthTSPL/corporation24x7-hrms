import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  
  const statsData = [
    { number: 100, suffix: "+", text: "Happy customers of TorchX" },
    { number: 1000, suffix: "+", text: "No. of live demos" },
    { number: 10, suffix: "+", text: "Partners to collaborate" },
    { number: 98, suffix: "%", text: "Customer satisfaction" },
  ];

  const [counts, setCounts] = useState(statsData.map(() => 0));

 
  useEffect(() => {
    const intervals = statsData.map((item, index) => {
      let start = 0;
      const end = item.number;
      const duration = 1500;
      const increment = end / (duration / 20);

      return setInterval(() => {
        start += increment;
        if (start >= end) {
          start = end;
          clearInterval(intervals[index]);
        }

        setCounts((prev) => {
          const newCounts = [...prev];
          newCounts[index] = Math.floor(start);
          return newCounts;
        });
      }, 20);
    });

    return () => intervals.forEach((i) => clearInterval(i));
  }, []);

  return (
    <div className="min-h-screen bg-transparent text-[var(--text)]">
      
      {/* NAVBAR */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-4">
        
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img
            src="/src/assets/logo1.png"
            alt="logo"
            className="w-50 h-15"
          />
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex gap-6 items-center">
          <span className="cursor-pointer hover:text-[var(--primary)]">
            Features
          </span>
          <span className="cursor-pointer hover:text-[var(--primary)]">
            Testimonials
          </span>
          <span className="cursor-pointer hover:text-[var(--primary)]">
            Pricing
          </span>

          <button
            onClick={() => navigate("/login")}
            className="bg-[var(--primary)] text-white px-4 py-2 rounded-md hover:opacity-90"
          >
            Login
          </button>
        </div>

        {/* Mobile Login */}
        <button
          onClick={() => navigate("/login")}
          className="md:hidden bg-[var(--primary)] text-white px-3 py-1 rounded"
        >
          Login
        </button>
      </nav>

      {/* HERO */}
      <section className="flex flex-col-reverse md:flex-row items-center px-6 md:px-12 py-12 gap-10">
        
        {/* LEFT */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Streamline Workforce, Strengthen Performance.
          </h1>

          <p className="text-gray-600 mb-6">
            Optimize every stage of the employee lifecycle with a robust and reliable Human Resource Management System.
          </p>

          {/* BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
            
           
            <button
              onClick={() => navigate("/signup")}
              className="bg-[var(--primary)] text-white px-6 py-3 hover:scale-105 transition"
            >
              Sign Up for Free Trial
            </button>

            <button className="bg-[var(--accent)] text-[var(--text)] px-6 py-3 hover:scale-105 transition">
              Talk To Expert
            </button>
          </div>
        </div>

        {/* RIGHT IMAGE */}
        <div className="flex-1 flex justify-center">
          <img
            src="/Group 551.png"
            alt="hero"
            className="w-full max-w-md"
          />
        </div>
      </section>

      {/* STATS */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-8 px-6 md:px-12 py-12">
        {statsData.map((item, i) => (
          <div key={i} className="flex justify-center">
            
            {/* Blob Wrapper */}
            <div className="relative w-36 h-36 md:w-40 md:h-40">
              
              {/* BACK SHAPE */}
              <div className="absolute inset-0 bg-[var(--secondary)] opacity-40 blur-md rounded-[60%_40%_50%_50%/50%_60%_40%_50%]"></div>

              {/* FRONT SHAPE */}
              <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center text-white
                bg-gradient-to-br  from-[#730042] to-[#730042]
                rounded-[60%_40%_50%_50%/50%_60%_40%_50%]
                shadow-xl hover:scale-105 transition duration-300"
              >
               
                <h2 className="text-lg md:text-xl font-bold">
                  {counts[i]}
                  {item.suffix}
                </h2>

                <p className="text-xs px-2">{item.text}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

   
      <footer className="text-center py-6 text-sm text-gray-500 border-t">
        Powered by <span className="font-semibold text-[var(--primary)]">Tech Torch</span> 2026
      </footer>

    </div>
  );
}