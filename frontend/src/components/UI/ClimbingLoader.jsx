import React from 'react';

const ClimbingLoader = ({ text = "Loading", className = "" }) => {
    return (
        <div id="climbing-loader" className={`flex flex - col items - center justify - center p - 8 ${className} `}>

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
                    <path d="M40,320 L50,220 L140,160 L70,50"
                        fill="none"
                        stroke="#ed8936"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="rope-path" />

                    {/* 1. START (Hold) */}
                    <path d="M20,310 Q40,300 60,320 Q50,340 30,335 Z" fill="#4299e1" className="rock rock-1" />

                    {/* 2. FIRST QUICKDRAW */}
                    {/* Hold */}
                    <path d="M40,190 Q65,185 70,210 Q45,220 40,190 Z" fill="#f56565" className="rock rock-2" />
                    {/* Quickdraw hanging from hold */}
                    <use href="#quickdraw-symbol" x="55" y="200" className="draw draw-1" />

                    {/* 3. SECOND QUICKDRAW */}
                    {/* Hold */}
                    <path d="M130,130 Q160,135 150,160 Q120,155 130,130 Z" fill="#ecc94b" className="rock rock-3" />
                    {/* Quickdraw */}
                    <use href="#quickdraw-symbol" x="140" y="140" className="draw draw-2" />

                    {/* 4. TOP (ANCHOR) */}
                    <g className="anchor anchor-anim">
                        {/* Hold */}
                        <path d="M50,30 Q90,20 100,50 Q60,70 50,30 Z" fill="#48bb78" />
                        {/* Chain/Ring */}
                        <circle cx="70" cy="50" r="6" stroke="white" strokeWidth="2" fill="none" />
                    </g>
                </svg>
            </div>

            <div className="z-10 text-center mt-6">
                <h2 className="text-xl font-bold tracking-widest uppercase text-gray-700">{text}</h2>
                <div className="h-1 w-24 bg-gray-200 mx-auto mt-2 rounded overflow-hidden">
                    <div className="h-full bg-orange-500 animate-[width_2s_ease-out_forwards]" style={{ width: '0%', animationName: 'loadingBar', animationDuration: '2s', animationFillMode: 'forwards' }}></div>
                </div>
            </div>
        </div>
    );
};

export default ClimbingLoader;
