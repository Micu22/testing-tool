import React from 'react';

interface ChartItem {
  score: number; // Sten 1-10
  label: string;
  color: string;
}

interface GaussianChartProps {
  items: ChartItem[];
}

export function GaussianChart({ items }: GaussianChartProps) {
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
            <linearGradient id="bellGradient" x1="0" x2="0" y1="0" y2="1">
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
            fill="url(#bellGradient)" 
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
          {items.map((item, index) => {
             const x = padding + (item.score - startX) * scaleX;
             const yCurveVal = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((item.score - mean) / stdDev, 2));
             const yCurve = height - padding - (yCurveVal * scaleY);
             
             return (
               <g key={index}>
                 {/* Line */}
                 <line 
                    x1={x} y1={height - padding} 
                    x2={x} y2={yCurve}
                    stroke={item.color}
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    opacity="0.8"
                 />
                 {/* Dot on curve */}
                 <circle cx={x} cy={yCurve} r="4" fill={item.color} />
                 
                 {/* Label */}
                 <text 
                    x={x} 
                    y={yCurve - 8} 
                    textAnchor="middle" 
                    fontSize="10" 
                    fill={item.color}
                    fontWeight="bold"
                    style={{ textShadow: '0 0 2px white' }}
                 >
                    {item.score}
                 </text>
               </g>
             );
          })}

        </svg>
        
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 px-4">
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
