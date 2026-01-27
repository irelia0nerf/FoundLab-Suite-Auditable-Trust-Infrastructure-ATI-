import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface RiskChartProps {
  score: number;
}

const RiskChart: React.FC<RiskChartProps> = ({ score }) => {
  // Data for the gauge
  // We want a semi-circle, so we fake the bottom half
  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ];

  const getColor = (s: number) => {
    if (s < 30) return '#22c55e'; // Green
    if (s < 70) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  const activeColor = getColor(score);

  return (
    <div className="relative h-64 w-full flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="70%"
            startAngle={180}
            endAngle={0}
            innerRadius={80}
            outerRadius={100}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            <Cell key="score" fill={activeColor} />
            <Cell key="remaining" fill="#1e293b" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="text-4xl font-bold text-white">{score}</p>
        <p className="text-sm text-slate-400">Risk Score</p>
      </div>
    </div>
  );
};

export default RiskChart;
