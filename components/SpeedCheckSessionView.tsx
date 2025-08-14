

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Assignment, Exam, DailyTask, SpeedSession } from '../types.ts';
import { ChevronLeftIcon } from './icons.tsx';

interface SpeedCheckSessionViewProps {
    worklet: Assignment | Exam;
    dailyTask: DailyTask;
    sessions: SpeedSession[];
    onAddSession: (session: SpeedSession) => void;
    onBack: () => void;
}

const PerformanceGraph: React.FC<{ sessions: SpeedSession[], unit: string }> = ({ sessions, unit }) => {
    if (sessions.length < 2) {
        return <div className="text-center text-sm text-slate-500 p-8">Complete at least two trials to see your performance graph.</div>;
    }

    const rates = sessions.map(s => (s.unitsCompleted / (s.timeElapsedSeconds / 60)));
    const maxRate = Math.max(...rates, 0);
    const minRate = 0;
    
    const width = Math.max(300, sessions.length * 50);
    const height = 150;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };

    const getX = (index: number) => padding.left + (index / (sessions.length - 1)) * (width - padding.left - padding.right);
    const getY = (rate: number) => height - padding.bottom - ((rate - minRate) / (maxRate - minRate || 1)) * (height - padding.top - padding.bottom);
    
    const pathData = rates.map((rate, index) => `${index === 0 ? 'M' : 'L'} ${getX(index)} ${getY(rate)}`).join(' ');

    const yAxisLabels = [maxRate, maxRate * 0.75, maxRate * 0.5, maxRate * 0.25, 0].map(val => ({
        value: val.toFixed(1),
        y: getY(val)
    }));
    
    return (
        <div className="w-full overflow-x-auto p-1">
            <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: `${width}px`}} aria-labelledby="graph-title" role="img">
                <title id="graph-title">Performance graph showing units per minute over trials</title>
                {/* Y-Axis Grid Lines & Labels */}
                {yAxisLabels.map(label => (
                    <g key={label.value} className="text-xs text-slate-400">
                        <line x1={padding.left} x2={width - padding.right} y1={label.y} y2={label.y} stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,3"/>
                        <text x={padding.left - 5} y={label.y + 3} textAnchor="end" fill="currentColor">{label.value}</text>
                    </g>
                ))}
                {/* X-Axis Labels */}
                {sessions.map((_, index) => (
                    <text key={index} x={getX(index)} y={height - padding.bottom + 15} textAnchor="middle" className="text-xs fill-slate-500">
                       {index + 1}
                    </text>
                ))}
                <text x={(width - padding.left - padding.right) / 2 + padding.left} y={height - 5} textAnchor="middle" className="text-xs font-semibold fill-slate-600">Trial Number</text>
                <text transform={`translate(15, ${height/2}) rotate(-90)`} textAnchor="middle" className="text-xs font-semibold fill-slate-600">{`${unit}/min`}</text>

                {/* Data Path */}
                <path d={pathData} fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500" />
                {/* Data Points */}
                {rates.map((rate, index) => (
                     <circle key={index} cx={getX(index)} cy={getY(rate)} r="3" fill="currentColor" className="text-blue-500"/>
                ))}
            </svg>
        </div>
    );
};


const SpeedCheckSessionView: React.FC<SpeedCheckSessionViewProps> = ({ worklet, dailyTask, sessions, onAddSession, onBack }) => {
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [completedUnits, setCompletedUnits] = useState('');
    const [alreadyCompletedUnits, setAlreadyCompletedUnits] = useState(0);
    const startTimeRef = useRef(0);
    const intervalRef = useRef<number | null>(null);
    
    const unitsSoFar = useMemo(() => sessions.reduce((sum, s) => sum + s.unitsCompleted, 0), [sessions]);
    const remainingUnits = dailyTask.weightForDay - unitsSoFar - alreadyCompletedUnits;

    const averageRate = useMemo(() => {
        if(sessions.length === 0) return 0;
        const totalUnits = sessions.reduce((sum, s) => sum + s.unitsCompleted, 0);
        const totalTime = sessions.reduce((sum, s) => sum + s.timeElapsedSeconds, 0);
        return totalTime > 0 ? (totalUnits / (totalTime / 60)) : 0; // units per minute
    }, [sessions]);

    const estimatedTimeRemainingMinutes = useMemo(() => {
        if (averageRate <= 0 || remainingUnits <= 0) return null;
        return remainingUnits / averageRate;
    }, [averageRate, remainingUnits]);
    
    useEffect(() => {
        if (isRunning) {
            startTimeRef.current = Date.now() - (time * 1000);
            intervalRef.current = window.setInterval(() => {
                setTime((Date.now() - startTimeRef.current) / 1000);
            }, 100);
        } else {
            if(intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if(intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isRunning]);

    const handleStart = () => setIsRunning(true);
    const handleStop = () => setIsRunning(false);
    const handleReset = () => {
        setIsRunning(false);
        setTime(0);
        setCompletedUnits('');
    };

    const handleLogSession = () => {
        const units = parseFloat(completedUnits);
        if (isNaN(units) || units <= 0 || time <= 0) {
            alert('Please enter a valid number of units completed and run the stopwatch.');
            return;
        }
        onAddSession({
            id: crypto.randomUUID(),
            workletId: worklet.id,
            dailyTaskDate: dailyTask.date,
            timeElapsedSeconds: time,
            unitsCompleted: units
        });
        handleReset();
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
    };
    
    const inputClasses = "w-full p-2 bg-sky-50/80 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900 placeholder:text-slate-400";

    return (
        <div className="p-4 sm:p-6">
            <button onClick={onBack} className="flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800 mb-4">
                <ChevronLeftIcon className="w-5 h-5" />
                Back to Task List
            </button>
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-slate-900">{worklet.name}</h1>
                <p className="text-slate-600">Today's Goal: {dailyTask.title}</p>
            </div>
            
            <div className="max-w-md mx-auto mb-6">
                <div>
                    <label htmlFor="already-completed" className="block text-sm font-medium text-slate-700 mb-1">
                        Have already done this much ({worklet.weightUnit})
                    </label>
                    <input 
                        type="number"
                        id="already-completed"
                        value={alreadyCompletedUnits || ''}
                        onChange={e => {
                            const value = parseFloat(e.target.value);
                            setAlreadyCompletedUnits(isNaN(value) || value < 0 ? 0 : value);
                        }}
                        className={inputClasses}
                        placeholder={`e.g., 10`}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Enter any work done *before* using the stopwatch. This will adjust the "Remaining" units below.
                    </p>
                </div>
            </div>

            <div className="max-w-md mx-auto bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-lg p-6 space-y-6">
                {/* Stopwatch Display */}
                <div className="text-center">
                    <p className="font-mono text-6xl tracking-tighter text-slate-900">{formatTime(time)}</p>
                    <p className="text-sm text-slate-500">Stopwatch</p>
                </div>

                {/* Stopwatch Controls */}
                 <div className="flex justify-center gap-4">
                    {!isRunning ? (
                         <button onClick={handleStart} className="px-6 py-2 rounded-md font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-500 shadow-sm hover:shadow-md transition-all">Start</button>
                    ) : (
                         <button onClick={handleStop} className="px-6 py-2 rounded-md font-semibold text-white bg-gradient-to-r from-red-500 to-rose-500 shadow-sm hover:shadow-md transition-all">Stop</button>
                    )}
                    <button onClick={handleReset} className="px-6 py-2 rounded-md font-semibold bg-gradient-to-r text-slate-800 from-slate-100 to-slate-50 hover:to-slate-200 shadow-sm hover:shadow-md transition-all">Reset</button>
                </div>
                
                {/* Log Session Form */}
                {!isRunning && time > 0 && (
                    <div className="border-t border-slate-200 pt-6 space-y-4">
                        <h3 className="font-semibold text-lg text-center text-slate-800">Log Your Progress</h3>
                        <div>
                            <label htmlFor="completed-units" className="block text-sm font-medium text-slate-700 mb-1">How many {worklet.weightUnit} did you complete?</label>
                            <input type="number" id="completed-units" value={completedUnits} onChange={e => setCompletedUnits(e.target.value)} className={inputClasses} placeholder="e.g., 5" />
                        </div>
                        <button onClick={handleLogSession} className="w-full px-6 py-2 rounded-md font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 shadow-sm hover:shadow-md transition-all disabled:opacity-50" disabled={!completedUnits}>Log Session</button>
                    </div>
                )}
            </div>

            {/* Results & Stats */}
            <div className="max-w-xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                 <div className="bg-white/70 p-4 rounded-lg shadow-sm">
                    <p className="text-2xl font-bold text-blue-600">{remainingUnits.toFixed(1)}</p>
                    <p className="text-sm text-slate-500">Remaining {worklet.weightUnit}</p>
                </div>
                 <div className="bg-white/70 p-4 rounded-lg shadow-sm">
                    <p className="text-2xl font-bold text-green-600">{averageRate.toFixed(2)}</p>
                    <p className="text-sm text-slate-500">{worklet.weightUnit} / minute (avg)</p>
                </div>
                {estimatedTimeRemainingMinutes !== null && (
                    <div className="md:col-span-2 bg-white/70 p-4 rounded-lg shadow-sm">
                        <p className="text-xl font-bold text-slate-800">~ {Math.ceil(estimatedTimeRemainingMinutes)} minutes remaining</p>
                        <p className="text-sm text-slate-500">Estimated time to finish today's task at your average pace</p>
                    </div>
                )}
            </div>

            {/* History and Graph */}
            {sessions.length > 0 && (
                <div className="max-w-xl mx-auto mt-8 space-y-6">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">Performance Over Time</h2>
                        <div className="bg-white/70 p-4 rounded-lg shadow-sm">
                            <PerformanceGraph sessions={sessions} unit={worklet.weightUnit} />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">Session History</h2>
                        <ul className="space-y-2">
                           {sessions.map((session, index) => (
                               <li key={session.id} className="flex justify-between items-center bg-white/70 p-3 rounded-lg shadow-sm text-sm">
                                   <span className="font-semibold text-slate-700">Trial #{index + 1}</span>
                                   <span className="text-slate-600">{session.unitsCompleted} {worklet.weightUnit} in {formatTime(session.timeElapsedSeconds)}</span>
                                   <span className="font-mono text-blue-600 bg-blue-100 px-2 py-0.5 rounded">{(session.unitsCompleted / (session.timeElapsedSeconds / 60)).toFixed(2)}/min</span>
                               </li>
                           ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpeedCheckSessionView;