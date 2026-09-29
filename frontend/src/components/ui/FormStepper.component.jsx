import React from 'react';
import { Check } from 'lucide-react';

function FormStepper({ steps, currentStep, onStepClick }) {
  return (
    <div className="flex w-fit max-w-full items-center gap-[1.1rem] overflow-x-auto rounded-xl border border-border bg-card px-[0.9rem] py-[0.6rem]">
      {steps.map((label, index) => {
        const stepNum = index + 1;
        const isActive = currentStep === stepNum;
        const isDone = currentStep > stepNum;
        const isClickable = Boolean(onStepClick) && isDone;

        return (
          <div
            key={label}
            onClick={() => {
              if (isClickable) onStepClick(stepNum);
            }}
            className={`flex items-center gap-[0.6rem] ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div
              className={`flex items-center gap-2 whitespace-nowrap text-[0.825rem] ${
                isActive || isDone ? 'font-semibold' : 'font-medium'
              } ${
                isActive
                  ? 'rounded-full bg-primary py-[0.3rem] pr-[0.85rem] pl-[0.3rem] text-white'
                  : isDone
                  ? 'bg-transparent text-[#059669]'
                  : 'bg-transparent text-muted-foreground'
              }`}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isActive
                    ? 'border-none bg-white/20 text-white'
                    : isDone
                    ? 'border-none bg-[#059669] text-white'
                    : 'border border-border bg-input text-muted-foreground'
                }`}
              >
                {isDone ? <Check size={13} strokeWidth={3} /> : stepNum}
              </div>
              <span>{label}</span>
            </div>
            {index < steps.length - 1 && <span className="text-border">/</span>}
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(FormStepper);
