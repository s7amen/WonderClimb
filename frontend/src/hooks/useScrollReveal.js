import { useState, useEffect, useRef } from 'react';

const useScrollReveal = (options = {}) => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            // Once visible, keep it visible (don't toggle off when scrolling back up)
            if (entry.isIntersecting) {
                setIsVisible(true);
                // Optional: Stop observing once visible if we only want one-time animation
                if (ref.current && options.once !== false) {
                    observer.unobserve(ref.current);
                }
            } else if (!options.once) {
                // If once is false, we can toggle it off.
                // But usually for "reveal" effects, we want them to stay revealing.
                // Use options.reset = true if we want them to disappear again.
                if (options.reset) {
                    setIsVisible(false);
                }
            }
        }, {
            threshold: options.threshold || 0.1,
            rootMargin: options.rootMargin || "0px"
        });

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, [options.threshold, options.rootMargin, options.once, options.reset]);

    return [ref, isVisible];
};

export default useScrollReveal;
