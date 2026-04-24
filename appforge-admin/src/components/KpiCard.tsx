import React from 'react';

interface Props {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
}

export const KpiCard: React.FC<Props> = ({ label, value, icon, trend }) => {
  return (
    <div className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow relative overflow-hidden group hover:-translate-y-1">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex justify-between items-start mb-4">
        <span className="text-[13px] font-bold text-gray-500 uppercase tracking-wider">
          {label}
        </span>
        <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 ring-1 ring-orange-100 group-hover:scale-110 group-hover:bg-orange-500 group-hover:text-white transition-all duration-300">
          {icon}
        </div>
      </div>
      <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</p>
      {trend && <p className="text-sm font-medium text-emerald-600 mt-2 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{trend}</p>}
    </div>
  );
};
