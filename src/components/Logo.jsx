import React from "react";

export default function Logo({ size = 40, showText = true, stacked = true, className = "" }) {
  // size determines the height of the SVG
  const width = size;
  const height = size;
  
  // Font scale
  const fontSize = size * 0.55; 

  return (
    <div className={`app-logo ${className}`} style={{ 
      display: "flex", 
      alignItems: "center", 
      gap: "0.75rem",
      textDecoration: "none"
    }}>
      {/* Reduced viewbox to tighten */}
      <svg width={width} height={height} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="purple_grad" x1="20" y1="20" x2="60" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9CA3AF" /> {/* Fallback */}
            <stop offset="0" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
          <linearGradient id="orange_grad" x1="40" y1="60" x2="80" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#fbbf24" />
            <stop offset="1" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="mid_grad" x1="25" y1="25" x2="75" y2="75" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#A855F7" />
            <stop offset="0.5" stopColor="#EC4899" />
            <stop offset="1" stopColor="#F59E0B" />
          </linearGradient>
        </defs>

        {/* Top Dot */}
        <circle cx="35" cy="28" r="14" fill="url(#purple_grad)" />

        {/* Bottom Dot */}
        <circle cx="65" cy="72" r="14" fill="url(#orange_grad)" />

        {/* The "S" Connector */}
        <path 
          d="M 23 38 
             Q 15 55 35 60
             C 55 65, 45 40, 65 40
             Q 85 40, 77 58
             L 77 58
             Q 85 45, 65 40
             C 45 35, 55 60, 35 60
             Q 25 60, 23 38
             Z" // This is complex, let's use a simpler "pill" S shape
          
          fill="url(#mid_grad)" opacity="0.9"
        />
        
        {/* Simplified Geometric "S" */}
        {/* Top Arc */}
        <path 
          d="M 15 45 Q 15 25 35 25 L 45 25 Q 50 25 50 30 L 50 40 Q 50 45 45 45 L 35 45 Q 25 45 25 50 Q 25 55 30 55 L 65 55 Q 85 55 85 75 Q 85 95 65 95 L 55 95 Q 50 95 50 90 L 50 80 Q 50 75 55 75 L 65 75 Q 75 75 75 70 Q 75 65 70 65 L 35 65 Q 15 65 15 45 Z" 
          fill="url(#mid_grad)"
          style={{ display: "none" }} // Hiding complex one
        />

        {/* Modern Abstract "S" */}
        <path
          d="M 20 40 
             Q 20 20 45 20 
             L 55 20
             L 55 50 
             L 45 50 
             Q 30 50 30 60
             L 30 70
             Q 30 80 45 80
             L 80 80
             L 80 50
             L 70 50
             Q 55 50 55 40
             Z"
             fill="url(#mid_grad)"
             transform="rotate(-45 50 50) translate(-10 -5)" // Rotate to match
        />
      </svg>
      
      {showText && (
        <div className="logo-text-group" style={{ 
          display: "flex", 
          flexDirection: "column",
          justifyContent: "center",
          lineHeight: "0.85"
        }}>
          <span style={{ 
            fontFamily: "'Inter', sans-serif", 
            fontWeight: "800", 
            fontSize: fontSize + "px",
            color: "var(--text-primary)",
            letterSpacing: "-0.03em"
          }}>social</span>
          <span style={{ 
            fontFamily: "'Inter', sans-serif", 
            fontWeight: "800", 
            fontSize: fontSize + "px",
            color: "var(--text-primary)",
            letterSpacing: "-0.03em"
          }}>snap</span>
        </div>
      )}
    </div>
  );
}
