import { useState, useEffect, useRef, useCallback } from 'react';

const Gallery = () => {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const galleryRef = useRef(null);
  const touchStart = useRef(null);
  const touchEnd = useRef(null);

  const images = [
    { src: '/images/homepage/training/_DSC2984.jpg', tall: false },
    { src: '/images/homepage/training/vt-60.jpg', tall: true },
    { src: '/images/homepage/training/IMG_20240320_185402.jpg', tall: false },
    { src: '/images/homepage/training/04_2.jpg', tall: true },
    { src: '/images/homepage/training/05.jpg', tall: false },
    { src: '/images/homepage/training/climb-12.jpg', tall: true },
    { src: '/images/homepage/training/_DSC2776.jpg', tall: false },
    { src: '/images/homepage/training/IMG_20240530_175803.jpg', tall: false },
  ];

  const handleNext = useCallback(() => {
    setSelectedIndex((prev) => (prev === null ? null : (prev + 1) % images.length));
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setSelectedIndex((prev) => (prev === null ? null : (prev - 1 + images.length) % images.length));
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedIndex === null) return;

      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setSelectedIndex(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, handleNext, handlePrev]);

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('gallery-item-visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    const items = document.querySelectorAll('.gallery-item');
    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <section className="bg-[#1a202c] py-20 px-4" ref={galleryRef}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-rubik font-bold text-white mb-3">
              Поглед в света на нашите катерачи
            </h2>
          </div>

          {/* Masonry Grid */}
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
            {images.map((image, index) => (
              <div
                key={index}
                className="gallery-item break-inside-avoid opacity-0 translate-y-8 transition-all duration-700 hover:scale-[1.02] cursor-pointer"
                onClick={() => setSelectedIndex(index)}
                style={{
                  transitionDelay: `${index * 100}ms`,
                }}
              >
                <div className="relative overflow-hidden rounded-2xl group shadow-xl">
                  <img
                    src={image.src}
                    alt={`Тренировка ${index + 1}`}
                    className={`w-full object-cover transition-transform duration-500 group-hover:scale-110 ${image.tall ? 'aspect-[3/4]' : 'aspect-[4/3]'
                      }`}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <span className="text-white text-sm font-medium">Увеличи</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-white">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Full-Screen Modal */}
      {selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedIndex(null)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close Button */}
          <button
            onClick={() => setSelectedIndex(null)}
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
            // Add key to force re-render animation when changing images
            key={selectedIndex}
            src={images[selectedIndex].src}
            alt="Enlarged view"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <style jsx>{`
        .gallery-item-visible {
          opacity: 1 !important;
          transform: translateY(0) !important;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default Gallery;

