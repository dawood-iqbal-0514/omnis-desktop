import React, { useState, useRef, useEffect } from 'react';
import useThemeStore from '../../store/themeStore';

const Tooltip = ({
  children,
  content,
  position = 'top',
  delay = 200,
  disabled = false,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef(null);
  const wrapperRef = useRef(null);
  const timeoutRef = useRef(null);
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const calculatePosition = () => {
    if (!wrapperRef.current || !tooltipRef.current) return;

    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = wrapperRect.top - tooltipRect.height - 8;
        left = wrapperRect.left + wrapperRect.width / 2;
        break;
      case 'bottom':
        top = wrapperRect.bottom + 8;
        left = wrapperRect.left + wrapperRect.width / 2;
        break;
      case 'left':
        top = wrapperRect.top + wrapperRect.height / 2;
        left = wrapperRect.left - tooltipRect.width - 8;
        break;
      case 'right':
        top = wrapperRect.top + wrapperRect.height / 2;
        left = wrapperRect.right + 8;
        break;
      default:
        top = wrapperRect.top - tooltipRect.height - 8;
        left = wrapperRect.left + wrapperRect.width / 2;
    }

    const padding = 8;
    if (left < padding) left = padding;
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }
    if (top < padding) {

      top = wrapperRect.bottom + 8;
    }
    if (top + tooltipRect.height > window.innerHeight - padding) {
      top = window.innerHeight - tooltipRect.height - padding;
    }

    setTooltipPosition({ top, left });
  };

  const showTooltip = () => {
    if (disabled) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      setTimeout(calculatePosition, 10);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
      window.addEventListener('scroll', calculatePosition, true);
      window.addEventListener('resize', calculatePosition);
    }

    return () => {
      window.removeEventListener('scroll', calculatePosition, true);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [isVisible]);

  return (
    <div
      ref={wrapperRef}
      className={`relative inline-block w-full ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && content && (
        <div
          ref={tooltipRef}
          className={`fixed z-50 px-3 py-2 text-sm font-medium rounded-lg shadow-lg pointer-events-none transition-opacity duration-200 whitespace-nowrap ${
            isDark
              ? 'bg-[var(--color-base-background-light)] text-text-primary border border-border-muted'
              : 'bg-[var(--color-base-background)] text-text-primary border border-border-muted'
          }`}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            transform: position === 'top' || position === 'bottom' ? 'translateX(-50%)' : position === 'left' ? 'translateY(-50%)' : 'translateY(-50%)',
          }}
        >
          {content}
          {}
          <div
            className={`absolute w-2 h-2 rotate-45 ${
              position === 'top'
                ? 'bottom-[-4px] left-1/2 -translate-x-1/2'
                : position === 'bottom'
                ? 'top-[-4px] left-1/2 -translate-x-1/2'
                : position === 'left'
                ? 'right-[-4px] top-1/2 -translate-y-1/2'
                : 'left-[-4px] top-1/2 -translate-y-1/2'
            } ${
              isDark
                ? 'bg-[var(--color-base-background-light)] border-r border-b border-border-muted'
                : 'bg-[var(--color-base-background)] border-r border-b border-border-muted'
            }`}
          />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
