"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TimelineProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  variant?: 'default' | 'white';
}

const timeframes = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
];

export function Timeline({ value, onChange, className = "", variant = 'default' }: TimelineProps) {
  const currentTimeframe = timeframes.find(tf => tf.value === value) || timeframes[2]; // Default to month

  const buttonStyles = variant === 'white' 
    ? "flex items-center gap-2 text-xs text-white/70 hover:text-white transition-colors"
    : "flex items-center gap-2 text-xs text-[var(--black-10)] hover:text-[var(--black-30)] transition-colors";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={`${buttonStyles} ${className}`}>
          <span>{currentTimeframe.label}</span>
          <ChevronDown size={12} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {timeframes.map((timeframe) => (
          <DropdownMenuItem
            key={timeframe.value}
            onClick={() => onChange(timeframe.value)}
            className={`text-sm ${value === timeframe.value ? 'bg-[var(--primary-10)] text-[var(--primary-100)]' : 'text-[var(--black-60)]'}`}
          >
            {timeframe.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}