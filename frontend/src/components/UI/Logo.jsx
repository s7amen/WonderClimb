import { Link } from 'react-router-dom';
import { useRef, useEffect, useState } from 'react';

const Logo = ({ className = '', showText = true, showSubtitle = false, size = 'md', logoHeight = null }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const textSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  // Use relative path for logo (works in both dev and production)
  const logoIconUrl = '/white_logo_chudnite_skali.png';
  const textRef = useRef(null);
  const [calculatedHeight, setCalculatedHeight] = useState(null);

  // Calculate logo height based on text height when showText and showSubtitle are true
  useEffect(() => {
    if (logoHeight === 'auto' && textRef.current && showText && showSubtitle) {
      const height = textRef.current.offsetHeight;
      setCalculatedHeight(height);
    }
  }, [logoHeight, showText, showSubtitle]);

  // Calculate logo height based on text height if logoHeight is provided
  // When showText and showSubtitle are true, logo should match the combined height of both texts
  const getLogoHeightStyle = () => {
    if (logoHeight === 'auto' && calculatedHeight) {
      return { height: `${calculatedHeight}px` };
    }
    return {};
  };

  const getLogoHeightClass = () => {
    if (logoHeight === 'auto') {
      return '';
    }
    if (logoHeight) {
      return logoHeight;
    }
    return sizeClasses[size];
  };

  return (
    <Link to="/" className={`flex items-center gap-4 ${className}`}>
      {/* Logo Icon */}
      <div className={`relative ${getLogoHeightClass()} shrink-0 flex items-center`} style={getLogoHeightStyle()}>
        <img 
          alt="WonderClimb Logo" 
          src={logoIconUrl}
          className="h-full w-auto object-contain"
          onError={(e) => {
            // Fallback to SVG if image fails to load
            e.target.style.display = 'none';
            const fallback = e.target.nextSibling;
            if (fallback) fallback.style.display = 'block';
          }}
        />
        {/* Fallback SVG */}
        <svg
          className="h-full w-auto hidden"
          viewBox="0 0 128 128"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Orange rounded square background */}
          <rect
            x="0"
            y="0"
            width="128"
            height="128"
            rx="16"
            fill="#EA7A24"
          />
          {/* Climbing route path - simplified representation */}
          <path
            d="M20 100 L40 80 L60 90 L80 60 L100 70 L110 40"
            stroke="#35383d"
            strokeWidth="2"
            strokeDasharray="4 4"
            fill="none"
          />
          {/* Green diamond holds */}
          <path d="M40 80 L45 75 L50 80 L45 85 Z" fill="#ADB933" />
          <path d="M60 90 L65 85 L70 90 L65 95 Z" fill="#ADB933" />
          <path d="M80 60 L85 55 L90 60 L85 65 Z" fill="#ADB933" />
          {/* Green circular holds */}
          <circle cx="20" cy="100" r="4" fill="#ADB933" />
          <circle cx="100" cy="70" r="4" fill="#ADB933" />
          {/* Dark grey holds */}
          <path d="M20 100 L25 95 L30 100 L25 105 Z" fill="#35383d" />
          <path d="M80 60 L85 55 L90 60 L85 65 Z" fill="#35383d" />
          {/* Target circle at top */}
          <circle cx="110" cy="40" r="8" fill="#35383d" />
          <circle cx="110" cy="40" r="4" fill="white" />
        </svg>
      </div>
      
      {showText && (
        <div className="flex flex-col" ref={textRef}>
          <div className={`font-bold ${textSizeClasses[size]} leading-tight`} style={{ fontFamily: 'Arial, sans-serif' }}>
            <span style={{ color: '#ea7a24' }}>Wonder</span>
            <span style={{ color: '#adb933' }}>Climb</span>
          </div>
          {showSubtitle && (
            <div className="text-xs uppercase leading-tight tracking-wider" style={{ color: '#eddcca', fontFamily: 'Arial, sans-serif' }}>
              GYM MANAGEMENT
            </div>
          )}
        </div>
      )}
    </Link>
  );
};

export default Logo;

