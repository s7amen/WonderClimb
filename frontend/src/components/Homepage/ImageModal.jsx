import { useState, useEffect, useRef, useCallback } from 'react';

const ImageModal = ({ images, selectedIndex, onClose }) => {
  const touchStart = useRef(null);
  const touchEnd = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(selectedIndex);

  useEffect(() => {
    setCurrentIndex(selectedIndex);
  }, [selectedIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === null ? null : (prev + 1) % images.length));
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev === null ? null : (prev - 1 + images.length) % images.length));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (currentIndex === null) return;

      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, handleNext, handlePrev, onClose]);

  // Swipe handling
  const handleTouchStart = (e) => {
    touchStart.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;

    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) handleNext();
    if (isRightSwipe) handlePrev();

    touchStart.current = null;
    touchEnd.current = null;
  };

  if (currentIndex === null) return null;

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-[#ea7a24] transition-colors z-50 p-2"
        aria-label="Затвори"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Left Arrow (Desktop) */}
      <button
        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
        className="hidden md:block absolute left-4 text-white hover:text-[#ea7a24] transition-colors z-50 p-4"
        aria-label="Предишна"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* Right Arrow (Desktop) */}
      <button
        onClick={(e) => { e.stopPropagation(); handleNext(); }}
        className="hidden md:block absolute right-4 text-white hover:text-[#ea7a24] transition-colors z-50 p-4"
        aria-label="Следваща"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-10 h-10">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      <img
        key={currentIndex}
        src={images[currentIndex]?.src || images[currentIndex]}
        alt="Enlarged view"
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default ImageModal;

