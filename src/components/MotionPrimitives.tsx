import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

export const SOLEN_EASE = [0.22, 1, 0.36, 1] as const;

interface FadeInProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  duration?: number;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  direction = 'up',
  distance = 24,
  duration = 0.65,
  className = '',
  ...rest
}) => {
  const offset = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none: { x: 0, y: 0 },
  }[direction];

  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration,
        delay,
        ease: SOLEN_EASE,
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

interface StaggerContainerProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  staggerDelay?: number;
  delayChildren?: number;
}

export const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  staggerDelay = 0.09,
  delayChildren = 0.05,
  className = '',
  ...rest
}) => {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.12 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren,
          },
        },
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem: React.FC<HTMLMotionProps<'div'>> = ({
  children,
  className = '',
  ...rest
}) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 22 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.6,
            ease: SOLEN_EASE,
          },
        },
      }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

export const SolenLogoMark: React.FC<{ className?: string; light?: boolean }> = ({
  className = 'w-8 h-8',
  light = false,
}) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect
      width="36"
      height="36"
      rx="10"
      fill={light ? '#FAF8F5' : '#1B1411'}
    />
    {/* Architectural rising sun + coffee drip / tea leaf harmony */}
    <circle
      cx="18"
      cy="18"
      r="8.5"
      stroke={light ? '#B85D2B' : '#D68C58'}
      strokeWidth="1.75"
    />
    <path
      d="M18 9.5C15.2 13 15.2 23 18 26.5C20.8 23 20.8 13 18 9.5Z"
      fill={light ? '#1B1411' : '#FAF8F5'}
      fillOpacity="0.92"
    />
    <circle cx="18" cy="18" r="2.2" fill={light ? '#FAF8F5' : '#B85D2B'} />
  </svg>
);
