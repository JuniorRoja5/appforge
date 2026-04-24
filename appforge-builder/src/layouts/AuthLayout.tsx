import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
      {/* Left side: Premium Branding (Desktop) */}
      <div className="hidden lg:flex w-1/2 bg-gray-950 flex-col justify-between p-12 relative">
        {/* Abstract Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-blue-600/20 blur-[100px] rounded-full mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen" />
          {/* Subtle dotted grid overlay */}
          <div 
            className="absolute inset-0 opacity-[0.15]" 
            style={{ 
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,1) 1px, transparent 0)', 
              backgroundSize: '24px 24px' 
            }} 
          />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg shadow-lg ring-1 ring-white/20 mb-8">
            AF
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Diseña, construye y<br />
            escala con <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">AppForge</span>.
          </h1>
          <p className="text-gray-400 max-w-md text-lg leading-relaxed">
            La plataforma definitiva para creadores y agencias. Crea apps nativas increíbles sin escribir una sola línea de código.
          </p>
        </div>

        {/* Floating Testimonial/Feature box */}
        <div className="relative z-10 bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md max-w-md shadow-2xl">
           <div className="flex gap-1 mb-3">
             {[1, 2, 3, 4, 5].map((s) => (
               <svg key={s} className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
             ))}
           </div>
           <p className="text-gray-300 mb-5 leading-relaxed">
             "Desde que usamos AppForge, nuestro tiempo de entrega a clientes se redujo un 80%. La calidad del constructor visual es incomparable."
           </p>
           <div className="flex items-center space-x-3">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 flex items-center justify-center text-xs font-bold text-white">
               MS
             </div>
             <div>
               <p className="text-white font-medium text-sm">Martín Salazar</p>
               <p className="text-gray-400 text-xs text-medium">CEO @ TechFlow Agency</p>
             </div>
           </div>
        </div>
      </div>

      {/* Right side: Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 relative bg-gray-50/30">
        <div className="w-full max-w-[420px]">
          {/* Mobile Branding (hidden on lg) */}
          <div className="lg:hidden text-center mb-10 flex flex-col items-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xl shadow-lg ring-1 ring-blue-500/20 mb-5">
              AF
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              AppForge <span className="text-gray-400 font-normal">Builder</span>
            </h1>
          </div>
          
          <Outlet />
        </div>
      </div>
    </div>
  );
};
