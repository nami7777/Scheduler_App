
import React, { useState, useEffect, useMemo } from 'react';

const usePrevious = <T,>(value: T): T | undefined => {
  const ref = React.useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
};

const AnimatedDigit: React.FC<{ value: number }> = ({ value }) => {
  const formattedValue = String(value).padStart(2, '0');
  const previousValue = usePrevious(formattedValue);

  return (
    <div className="font-mono text-base sm:text-lg font-bold text-slate-800 relative tabular-nums flex">
      {formattedValue.split('').map((digit, index) => {
        const prevDigit = previousValue ? previousValue[index] : digit;
        const hasChanged = digit !== prevDigit;
        return (
          <div key={index} className="digit-container">
            <span
              key={`${digit}-${index}`}
              className={`digit ${hasChanged ? 'digit-current' : ''}`}
              style={{ transitionDelay: hasChanged ? `${index * 50}ms` : '0ms' }}
            >
              {digit}
            </span>
            {hasChanged && (
              <span
                key={`${prevDigit}-${index}-prev`}
                className="digit digit-previous"
              >
                {prevDigit}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

const Countdown: React.FC<{ deadline: string }> = ({ deadline }) => {
  const calculateTimeLeft = () => {
    const difference = +new Date(deadline) - +new Date();
    let timeLeft = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  const timerComponents = [
    { value: timeLeft.days, label: 'days' },
    { value: timeLeft.hours, label: 'hrs' },
    { value: timeLeft.minutes, label: 'min' },
    { value: timeLeft.seconds, label: 'sec' },
  ].filter(part => part.value > 0 || part.label === 'sec' || part.label === 'min' ); // always show min/sec

  const visibleComponents = useMemo(() => {
      const allParts = [
        { value: timeLeft.days, label: 'days' },
        { value: timeLeft.hours, label: 'hrs' },
        { value: timeLeft.minutes, label: 'min' },
        { value: timeLeft.seconds, label: 'sec' },
      ];
      const firstVisibleIndex = allParts.findIndex(p => p.value > 0);

      // If less than a minute left, just show seconds
      if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0) {
          return [allParts[3]];
      }
       // If less than an hour left, show min and sec
      if (timeLeft.days === 0 && timeLeft.hours === 0) {
          return allParts.slice(2);
      }
      // if it's the last day, show hrs, min, sec
      if (timeLeft.days === 0 && firstVisibleIndex !== -1) {
          return allParts.slice(firstVisibleIndex);
      }
      return allParts;
  }, [timeLeft]);


  return (
    <div className="flex items-end gap-1.5 sm:gap-2">
      {visibleComponents.map(({ value, label }) => (
        <div key={label} className="countdown-part">
          <AnimatedDigit value={value} />
          <span className="text-xs text-slate-500">{label}</span>
        </div>
      ))}
    </div>
  );
};

export default Countdown;