import React from 'react';

export default function PinPointLogo({ className = "w-8 h-8", withBackground = true, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={className}
      {...props}
    >
      <defs>
        {/* Background Circle Radial Gradient */}
        <radialGradient id="pinpointBgGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="85%" stopColor="#F5F3FB" stopOpacity="1" />
          <stop offset="100%" stopColor="#EBE7F7" stopOpacity="1" />
        </radialGradient>

        {/* Blue Pin Gradient */}
        <linearGradient id="pinpointBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7371FC" />
          <stop offset="100%" stopColor="#5B50E6" />
        </linearGradient>

        {/* Pink Pin Gradient */}
        <linearGradient id="pinpointPinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F4608E" />
          <stop offset="100%" stopColor="#E23D71" />
        </linearGradient>
      </defs>

      {/* Background Glow Circle */}
      {withBackground && (
        <circle cx="256" cy="256" r="236" fill="url(#pinpointBgGlow)" />
      )}

      {/* Blue Map Pin (Left) */}
      <path
        d="M 235,130
           C 185,130 145,170 145,220
           C 145,270 215,350 235,370
           C 255,350 325,270 325,220
           C 325,170 285,130 235,130 Z"
        fill="url(#pinpointBlueGrad)"
        opacity="0.88"
      />

      {/* Pink Map Pin (Right, Overlapping with Multiply Blend) */}
      <path
        d="M 305,170
           C 255,170 215,210 215,260
           C 215,310 285,390 305,410
           C 325,390 395,310 395,260
           C 395,210 355,170 305,170 Z"
        fill="url(#pinpointPinkGrad)"
        opacity="0.82"
        style={{ mixBlendMode: 'multiply' }}
      />
    </svg>
  );
}
