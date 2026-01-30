"use client";

import { useEffect, useState } from 'react';

interface TerminalTypewriterProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
  className?: string;
}

export default function TerminalTypewriter({
  text,
  speed = 20,
  onComplete,
  className = ""
}: TerminalTypewriterProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    } else if (!isComplete) {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, text, speed, onComplete, isComplete]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text]);

  return (
    <div className={`terminal-output ${className}`}>
      <pre className="font-mono text-sm whitespace-pre-wrap break-words">
        {displayedText}
      </pre>
    </div>
  );
}
