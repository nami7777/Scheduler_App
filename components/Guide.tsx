import React, { useState, useLayoutEffect } from 'react';
import { GuideStep } from './guideSteps.ts';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from './icons.tsx';

interface GuideProps {
    steps: GuideStep[];
    currentStepIndex: number;
    setCurrentStepIndex: (index: number) => void;
    onExit: () => void;
}

const Guide: React.FC<GuideProps> = ({ steps, currentStepIndex, setCurrentStepIndex, onExit }) => {
    const [highlightStyle, setHighlightStyle] = useState<React.CSSProperties>({ opacity: 0 });
    const [textboxStyle, setTextboxStyle] = useState<React.CSSProperties>({ opacity: 0 });
    const [isTextboxVisible, setIsTextboxVisible] = useState(false);

    const currentStep = steps[currentStepIndex];

    useLayoutEffect(() => {
        setIsTextboxVisible(false);
        const timeoutId = setTimeout(() => {
            if (!currentStep) return;

            if (currentStep.isModal || !currentStep.elementSelector) {
                setHighlightStyle({
                    opacity: 0,
                    top: '50%',
                    left: '50%',
                    width: 0,
                    height: 0,
                    transform: 'translate(-50%, -50%)',
                });
                setTextboxStyle({
                    opacity: 1,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                });
            } else {
                const element = document.querySelector(currentStep.elementSelector);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const PADDING = 8;

                    setHighlightStyle({
                        top: `${rect.top - PADDING}px`,
                        left: `${rect.left - PADDING}px`,
                        width: `${rect.width + PADDING * 2}px`,
                        height: `${rect.height + PADDING * 2}px`,
                    });

                    // Position textbox
                    const textboxHeight = 200; // Estimated height
                    const spaceBelow = window.innerHeight - rect.bottom;
                    const top = spaceBelow > textboxHeight + 20
                        ? rect.bottom + PADDING + 10
                        : rect.top - textboxHeight - PADDING - 10;
                    
                    setTextboxStyle({
                        top: `${top}px`,
                        left: `${rect.left}px`,
                        maxWidth: '320px',
                    });

                } else {
                    // Fallback if element not found: treat as modal
                    setHighlightStyle({ opacity: 0 });
                    setTextboxStyle({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' });
                }
            }
            setIsTextboxVisible(true);
        }, 150); // Delay to allow view to change

        return () => clearTimeout(timeoutId);

    }, [currentStepIndex, currentStep]);

    const handleNext = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            onExit();
        }
    };

    const handlePrev = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    };
    
    if (!currentStep) return null;

    return (
        <>
            <div className="guide-backdrop" style={{ opacity: currentStep.isModal ? 0.7 : 0 }} />
            <div className="guide-highlight" style={highlightStyle} />
            <div className={`guide-textbox ${isTextboxVisible ? 'visible' : ''}`} style={textboxStyle}>
                <div className="bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-2xl p-5 w-full max-w-sm">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-bold text-slate-900">{currentStep.title}</h3>
                        <button onClick={onExit} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                            <XMarkIcon className="w-5 h-5"/>
                        </button>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">{currentStep.content}</p>
                    <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-slate-400">
                            Step {currentStepIndex + 1} of {steps.length}
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={handlePrev}
                                disabled={currentStepIndex === 0}
                                className="p-2 rounded-full text-slate-600 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                                <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleNext}
                                className="px-4 py-2 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 transition"
                            >
                                {currentStepIndex === steps.length - 1 ? 'Finish' : 'Next'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Guide;