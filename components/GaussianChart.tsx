import React, { useId } from 'react';

interface ChartItem {
  score: number; // Sten 1-10
  label: string;
  color: string;
}

interface GaussianChartProps {
  items: ChartItem[];
}

export function GaussianChart({ items }: GaussianChartProps) {
  // Unique ID for SVG definitions to prevent conflicts when multiple charts are on page
  const uniqueId = useId().replace(/:/g, "");
  const gradientId = `bellGradient-${uniqueId}`;

  // Sten parameters
  const mean = 5.5;
  const stdDev = 2;
  
  // Chart dimensions
  const width = 600;
  const height = 200;
  const padding = 20;
  
  // Calculate Gaussian points
  const points = [];
  const startX = 0.5;
  const endX = 10.5;
  const steps = 100;
  
  for (let i = 0; i <= steps; i++) {
    const xSten = startX + (i / steps) * (endX - startX);
    // Gaussian formula
    const yVal = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((xSten - mean) / stdDev, 2));
    points.push({ x: xSten, y: yVal });
  }
  
  // Normalize Y to fit height
  const maxY = Math.max(...points.map(p => p.y));
  const scaleY = (height - padding * 2) / maxY;
  const scaleX = (width - padding * 2) / (endX - startX);
  
  const pathData = points.map((p, i) => {
    const x = padding + (p.x - startX) * scaleX;
    const y = height - padding - (p.y * scaleY);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full max-w-2xl bg-white rounded-lg p-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Background Gradient */}
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          
          {/* Axis Line */}
          <line 
            x1={padding} 
            y1={height - padding} 
            x2={width - padding} 
            y2={height - padding} 
            stroke="#94a3b8" 
            strokeWidth="2" 
          />
          
          {/* Bell Curve Area */}
          <path 
            d={`${pathData} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`} 
            fill={`url(#${gradientId})`} 
          />
          
          {/* Bell Curve Line */}
          <path 
            d={pathData} 
            fill="none" 
            stroke="#6366f1" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          
          {/* Sten Markers (1-10) */}
          {Array.from({ length: 10 }).map((_, i) => {
             const val = i + 1;
             const x = padding + (val - startX) * scaleX;
             return (
               <g key={val}>
                 <line 
                   x1={x} y1={height - padding} 
                   x2={x} y2={height - padding + 5} 
                   stroke="#cbd5e1" 
                   strokeWidth="1"
                 />
                 <text 
                   x={x} y={height - padding + 15} 
                   textAnchor="middle" 
                   fontSize="10" 
                   className="fill-slate-400 font-mono"
                 >
                   {val}
                 </text>
               </g>
             );
          })}
          
          {/* User Score Lines */}
          {(() => {
             // Group items by score to handle collisions
             const groupedByScore: Record<number, ChartItem[]> = {};
             items.forEach(item => {
                 if (!groupedByScore[item.score]) groupedByScore[item.score] = [];
                 groupedByScore[item.score].push(item);
             });

             return Object.keys(groupedByScore).map(scoreStr => {
                 const score = parseFloat(scoreStr);
                 const group = groupedByScore[score];
                 const x = padding + (score - startX) * scaleX;
                 
                 // Get Y on curve
                 const yCurveVal = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((score - mean) / stdDev, 2));
                 const yCurve = height - padding - (yCurveVal * scaleY);
                 
                 // Render Group (Dots + Labels)
                 return (
                    <g key={score}>
                        {/* Dotted Line */}
                        <line 
                            x1={x} y1={height - padding} 
                            x2={x} y2={yCurve}
                            stroke="#94a3b8"
                            strokeWidth="1.5"
                            strokeDasharray="4 2"
                            opacity="0.6"
                        />
                        
                        {/* Dots Stacked/Grouped */}
                        {(() => {
                            let currentStackY = yCurve;
                            return group.map((item: ChartItem, idx: number) => {
                                 // Determine label to show
                                 // 1. If label is short (<=6 chars like "N1", "N2"), show it.
                                 // 2. If it has a separator (e.g., "N1 - Anxiety"), try the first part.
                                 // 3. Main traits ("Neuroticism") are usually long, so they won't show text, just dot.
                                 let textToShow = "";
                                 if (item.label.length <= 6) {
                                     textToShow = item.label;
                                 } else {
                                     const firstPart = item.label.split(/[\s:-]+/)[0];
                                     if (firstPart.length <= 4) {
                                         textToShow = firstPart;
                                     }
                                 }

                                 const showLabel = textToShow.length > 0;
                                 
                                 const myDotY = currentStackY;
                                 // Reserve space for next item (stacking upwards)
                                 const spacing = showLabel ? 16 : 8;
                                 currentStackY -= spacing;
                                 
                                 return (
                                     <g key={`${item.label}-${idx}`}>
                                         <circle cx={x} cy={myDotY} r="3.5" fill={item.color} stroke="white" strokeWidth="1" />
                                         
                                         {showLabel && (
                                             <text 
                                                x={x} 
                                                y={myDotY - 6} 
                                                textAnchor="middle" 
                                                fontSize="9" 
                                                fill={item.color}
                                                fontWeight="bold"
                                                style={{ textShadow: '0 0 2px white' }}
                                             >
                                                {textToShow} 
                                             </text>
                                         )}
                                     </g>
                                 );
                            });
                        })()}
                    </g>
                 );
             });
          })()}

        </svg>
        
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 px-4 print:hidden">
           {items.map((item, i) => (
             <div key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span>{item.label}</span>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
