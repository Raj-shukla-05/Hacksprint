import React, { useId } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => <div key={item.dataKey}><span>{item.name}</span><b>{item.value}</b></div>)}
    </div>
  );
}

export default function TrendChart({ data, compact = false, height }) {
  const id = useId().replace(/:/g, '');
  return (
    <ResponsiveContainer width="100%" height={height || (compact ? 200 : 300)}>
      <AreaChart data={data} margin={{ left: -6, right: 10, top: 12, bottom: 0 }}>
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d4f15a" stopOpacity=".9" />
            <stop offset="1" stopColor="#d4f15a" stopOpacity="0" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="2 6" stroke="#ddd5c4" vertical={false} />
        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#7d7668', fontSize: 11, fontFamily: 'Geist Mono, monospace' }} dy={8} />
        <YAxis domain={[40, 100]} axisLine={false} tickLine={false} tick={{ fill: '#7d7668', fontSize: 11, fontFamily: 'Geist Mono, monospace' }} width={34} />
        <Tooltip content={<TooltipContent />} cursor={{ stroke: '#16140f', strokeDasharray: '3 4' }} />
        <Area
          type="monotone" dataKey="score" name="Functional score"
          stroke="#16140f" strokeWidth={2.6} fill={`url(#fill-${id})`}
          dot={{ r: 3.5, strokeWidth: 2, fill: '#fffdf8', stroke: '#16140f' }}
          activeDot={{ r: 6, fill: '#d4f15a', stroke: '#16140f', strokeWidth: 2.5 }}
          animationDuration={1100}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
