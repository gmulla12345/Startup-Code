"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  leftLabel: string;
  rightLabel: string;
  className?: string;
}

/**
 * Personality/preference slider used throughout onboarding. Deliberately
 * shows both endpoint labels rather than a numeric value — the product
 * asks "spontaneous vs planned," not "rate yourself 0-100."
 */
export function Slider({ value, onChange, min = 0, max = 100, step = 1, leftLabel, rightLabel, className }: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative h-8 flex items-center">
        <div className="absolute inset-x-0 h-2 rounded-full bg-surface-sunken" />
        <div
          className="absolute h-2 rounded-full bg-ember"
          style={{ width: `${percent}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative w-full h-8 appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-ember
            [&::-webkit-slider-thumb]:shadow-[var(--shadow-card)] [&::-webkit-slider-thumb]:cursor-grab
            [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-ember"
        />
      </div>
      <div className="flex justify-between mt-1 text-xs font-medium text-foreground-muted">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  );
}
