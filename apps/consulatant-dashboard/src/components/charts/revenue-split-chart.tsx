"use client";

import React from 'react';

interface RevenueSplitChartProps {
  fromNaksha: number;
  manuallyAdded: number;
  total: number;
  formatCurrency: (amount: number) => string;
}

export function RevenueSplitChart({ 
  fromNaksha, 
  manuallyAdded, 
  total, 
  formatCurrency 
}: RevenueSplitChartProps) {
  // Calculate percentages
  const nakshaPercentage = total > 0 ? (fromNaksha / total) * 100 : 0;
  const manualPercentage = total > 0 ? (manuallyAdded / total) * 100 : 0;
  
  // SVG circle parameters
  const size = 160; // Chart size
  const strokeWidth = 24; // Ring thickness
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate stroke dash offsets for the segments
  const nakshaStrokeDasharray = `${(nakshaPercentage / 100) * circumference} ${circumference}`;
  const manualStrokeDasharray = `${(manualPercentage / 100) * circumference} ${circumference}`;
  const manualStrokeDashoffset = -((nakshaPercentage / 100) * circumference);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f3f4f6"
              strokeWidth={strokeWidth}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[var(--black-60)] font-poppins text-lg font-medium">
                ₹0
              </div>
              <div className="text-[var(--black-30)] text-xs">
                No revenue yet
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={strokeWidth}
          />
          
          {/* FROM NAKSHA segment */}
          {fromNaksha > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--primary-100)"
              strokeWidth={strokeWidth}
              strokeDasharray={nakshaStrokeDasharray}
              strokeLinecap="round"
              className="transition-all duration-500 ease-in-out"
            />
          )}
          
          {/* MANUALLY ADDED segment */}
          {manuallyAdded > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--primary-50)"
              strokeWidth={strokeWidth}
              strokeDasharray={manualStrokeDasharray}
              strokeDashoffset={manualStrokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-in-out"
            />
          )}
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-[var(--black-60)] font-poppins text-lg font-medium">
              {formatCurrency(total)}
            </div>
            <div className="text-[var(--black-30)] text-xs">
              Total Revenue
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}