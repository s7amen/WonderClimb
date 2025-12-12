import React from 'react';

const ClimbingLoader = ({ text = "Loading", className = "" }) => {
    return (
        <div id="climbing-loader" className={`flex flex-col items-center pt-[40px] p-8 ${className}`}>

            <div className="relative w-64 h-96">
                <svg viewBox="0 0 200 350" className="w-full h-full drop-shadow-xl">
                    <defs>
                        {/* Quickdraw Symbol */}
                        <g id="quickdraw-symbol">
                            <line x1="0" y1="0" x2="0" y2="25" stroke="#4a5568" strokeWidth="2" /> {/* Dogbone - Darker gray */}
                            <path d="M-3,25 C-6,25 -6,35 -3,35 L3,35 C6,35 6,25 3,25 Z" fill="none" stroke="#718096" strokeWidth="2" /> {/* Carabiner - Darker gray */}
                        </g>
                    </defs>

                    {/* ROPE (Bottom layer, but draws last) */}
                    <path d="M30,320 L50,230 L130,170 L60,100 L100,50"
                        fill="none"
                        stroke="#ed8936"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="rope-path" />

                    {/* 1. START (Hold) */}
                    <path d="M20,310 Q40,300 60,320 Q50,340 30,335 Z" fill="#4299e1" className="rock rock-1" />

                    {/* 2. FIRST QUICKDRAW (Low Left) */}
                    <g className="rock-group-2">
                        {/* Hold */}
                        <path d="M40,220 Q65,215 70,240 Q45,250 40,220 Z" fill="#f56565" className="rock" />
                        {/* Quickdraw */}
                        <use href="#quickdraw-symbol" x="55" y="230" className="draw" />
                    </g>

                    {/* 3. NEW EXTRA HOLD (Mid Right) */}
                    <g className="rock-group-3">
                        {/* Hold */}
                        <path d="M120,160 Q150,155 145,185 Q115,190 120,160 Z" fill="#805ad5" className="rock" />
                        {/* Quickdraw */}
                        <use href="#quickdraw-symbol" x="135" y="170" className="draw" />
                    </g>

                    {/* 4. THIRD QUICKDRAW (High Left - was second) */}
                    <g className="rock-group-4">
                        {/* Hold */}
                        <path d="M50,90 Q80,85 75,115 Q45,120 50,90 Z" fill="#ecc94b" className="rock" />
                        {/* Quickdraw */}
                        <use href="#quickdraw-symbol" x="65" y="100" className="draw" />
                    </g>

                    {/* 5. TOP (ANCHOR) */}
                    <g className="anchor anchor-anim">
                        {/* Hold - shifted right to 100 */}
                        <path d="M80,30 Q120,20 130,50 Q90,70 80,30 Z" fill="#48bb78" />
                        {/* Chain/Ring */}
                        <circle cx="100" cy="50" r="6" stroke="white" strokeWidth="2" fill="none" />
                    </g>
                </svg>
            </div>

            <div className="z-10 text-center mt-[40px]">
                <div className="inline-flex flex-col items-center">
                    <button className="px-6 py-2 bg-white border border-gray-200 rounded-full shadow-sm text-sm font-medium text-gray-700 uppercase tracking-widest flex items-center gap-2">
                        {text === "Loading" ? "Зареждане..." : text}
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                        </span>
                    </button>
                    {/* Old loading bar removed as requested to be a "button" style, or can keep it inside? User said "Pod nachaloto... da e buton". I'll stick to the button look. */}
                </div>
            </div>
        </div>
    );
};

export default ClimbingLoader;
