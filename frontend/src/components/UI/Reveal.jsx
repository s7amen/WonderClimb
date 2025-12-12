import React from 'react';
import useScrollReveal from '../../hooks/useScrollReveal';

const Reveal = ({
    children,
    className = "",
    threshold = 0.1,
    delay = 0,
    direction = "up" // up, down, left, right, none
}) => {
    const [ref, isVisible] = useScrollReveal({ threshold, once: true });

    const getTransform = () => {
        if (isVisible) return 'translate-x-0 translate-y-0';

        switch (direction) {
            case 'up': return 'translate-y-10';
            case 'down': return '-translate-y-10';
            case 'left': return 'translate-x-10';
            case 'right': return '-translate-x-10';
            default: return ''; // none
        }
    };

    const getOpacity = () => {
        return isVisible ? 'opacity-100' : 'opacity-0';
    };

    return (
        <div
            ref={ref}
            className={`transition-all duration-1000 ease-out ${getTransform()} ${getOpacity()} ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
};

export default Reveal;
