"use client";

import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { number: 1, label: "Organization", subtitle: "Company Setup" },
    { number: 2, label: "Your First Shop", subtitle: "Store Configuration" },
  ];

  return (
    <div className="w-full max-w-md mx-auto mb-8 px-4">
      <div className="relative flex items-center justify-between">
        {/* Connection Line */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-slate-100 dark:bg-slate-800 -z-10" />
        
        {/* Dynamic Highlight Line */}
        <div 
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-indigo-600 transition-all duration-500 ease-in-out -z-10" 
          style={{ width: currentStep > 1 ? "100%" : "0%" }}
        />

        {steps.map((step, index) => {
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;

          return (
            <div key={step.number} className="flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm border-2 transition-all duration-300 shadow-sm
                  ${isCompleted 
                    ? "bg-indigo-600 border-indigo-600 text-white" 
                    : isActive 
                      ? "bg-white border-indigo-600 text-indigo-600 ring-4 ring-indigo-50" 
                      : "bg-white border-slate-200 text-slate-400"
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5 stroke-[2.5]" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              
              <div className="mt-3 text-center">
                <p className={`text-xs font-semibold tracking-wide uppercase transition-colors duration-300
                  ${isActive || isCompleted ? "text-indigo-600" : "text-slate-400"}
                `}>
                  {step.label}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">
                  {step.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
