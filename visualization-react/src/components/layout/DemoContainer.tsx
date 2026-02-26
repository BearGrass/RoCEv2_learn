import React from 'react';

interface DemoContainerProps {
  children: React.ReactNode;
}

export function DemoContainer({ children }: DemoContainerProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {children}
    </div>
  );
}
