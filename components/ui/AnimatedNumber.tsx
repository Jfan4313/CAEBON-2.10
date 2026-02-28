import React, { useEffect, useState } from 'react';

interface AnimatedNumberProps {
    value: number;
    decimals?: number;
    duration?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
    value,
    decimals = 0,
    duration = 1000,
    prefix = '',
    suffix = '',
    className = ''
}) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = (currentTime - startTime) / duration;

            if (progress < 1) {
                // easeOutQuart
                const easeOut = 1 - Math.pow(1 - progress, 4);
                setDisplayValue(value * easeOut);
                animationFrame = requestAnimationFrame(animate);
            } else {
                setDisplayValue(value);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [value, duration]);

    return (
        <span className={className}>
            {prefix}{displayValue.toFixed(decimals)}{suffix}
        </span>
    );
};
