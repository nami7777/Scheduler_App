
import React, { useMemo } from 'react';
import { Habit, DisplaySettings } from '../types.ts';
import HabitStreaks from './HabitStreaks.tsx';
import { PlusIcon, CheckIcon } from './icons.tsx';
import { getDateKey } from '../utils.ts';

interface HabitsViewProps {
    habits: Habit[];
    onStartAdding: () => void;
    onStartEditing: (habit: Habit) => void;
    onDeleteHabit: (habitId: string) => void;
    onToggleCompletion: (habitId: string, dateKey: string) => void;
    displaySettings: DisplaySettings;
}

const getScheduledHabitsForDate = (date: Date, allHabits: Habit[]): Habit[] => {
    const dayOfWeek = date.getUTCDay();
    
    return allHabits.filter(habit => {
        const startDate = new Date(habit.startDate + 'T12:00:00Z');
        if (date < startDate || habit.archived) return false;

        if (habit.frequency.type === 'daily') return true;
        if (habit.frequency.type === 'weekly') {
            return habit.frequency.days?.includes(dayOfWeek);
        }
        return false;
    });
};

const CircularProgress: React.FC<{ percentage: number; color: string }> = ({ percentage, color }) => {
    const strokeWidth = 4;
    const radius = 20; // r=20 for a 48x48 box leaves a 2px padding ( (48/2) - (stroke/2) - padding )
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative w-12 h-12 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 48 48">
                <circle
                    className="text-slate-200"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={24}
                    cy={24}
                />
                <circle
                    style={{ stroke: color }}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={24}
                    cy={24}
                    className="transition-all duration-500 ease-in-out"
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center" style={{ color }}>
                {Math.round(percentage) >= 100 ? (
                    <CheckIcon className="w-5 h-5" />
                ) : (
                    <span className="text-xs font-bold">
                        {Math.round(percentage)}%
                    </span>
                )}
            </div>
        </div>
    );
};

const HabitsView: React.FC<HabitsViewProps> = ({ habits, onStartAdding, onStartEditing, onDeleteHabit, onToggleCompletion, displaySettings }) => {
    
    const dayCards = useMemo(() => {
        const todayKey = getDateKey(new Date(), displaySettings.timeZone);
        const todayForLoop = new Date(todayKey + 'T12:00:00Z');

        return Array.from({ length: 2 }).map((_, i) => { // Only show Today and Tomorrow
            const date = new Date(todayForLoop);
            date.setUTCDate(todayForLoop.getUTCDate() + i);
            
            const scheduledHabits = getScheduledHabitsForDate(date, habits);
            return { date, scheduledHabits };
        });
    }, [habits, displaySettings]);


    return (
        <div className="p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Habit Tracker</h1>
                <button onClick={onStartAdding} className="px-4 py-2 rounded-md text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:to-blue-500 font-semibold transition shadow-sm hover:shadow-md flex items-center gap-2">
                    <PlusIcon className="w-5 h-5"/>
                    <span className="hidden sm:inline">New Habit</span>
                 </button>
            </div>
            
             {habits.length > 0 ? (
                <div className="space-y-8">
                    {/* Streaks Section at the top */}
                    <div>
                         <HabitStreaks
                            habits={habits}
                            onEditHabit={onStartEditing}
                            onDeleteHabit={onDeleteHabit}
                        />
                    </div>
                    {/* Daily Cards Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {dayCards.map(dayInfo => {
                            if (!dayInfo) return null;
                            const { date, scheduledHabits } = dayInfo;
                            
                            const dateKey = getDateKey(date, 'UTC');
                            const todayKey = getDateKey(new Date(), displaySettings.timeZone);
                            
                            const isToday = dateKey === todayKey;
                            const isFuture = dateKey > todayKey;

                            const completedCount = scheduledHabits.filter(h => h.completions[dateKey]).length;
                            const score = scheduledHabits.length > 0 ? (completedCount / scheduledHabits.length) * 100 : 100; // Show 100% if no habits
                            
                            const dayName = isToday ? 'Today' : 'Tomorrow';
                            const dateString = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

                            return (
                                <div key={dateKey} className="bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-md flex flex-col gap-4 border-t-4 p-4" style={{borderColor: score > 99 ? '#22c55e' : (score > 50 ? '#3b82f6' : '#e2e8f0') }}>
                                   <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-800">{dayName}</h2>
                                            <p className="text-sm text-slate-500">{dateString}</p>
                                        </div>
                                        <CircularProgress percentage={score} color={score > 99 ? '#22c55e' : (score > 50 ? '#3b82f6' : '#64748b')} />
                                   </div>
                                   <div className="space-y-3">
                                        {scheduledHabits.length > 0 ? scheduledHabits.map(habit => {
                                            const isCompleted = !!habit.completions[dateKey];
                                            return (
                                                <label key={habit.id} className={`flex items-center gap-3 p-2 rounded-md transition-colors ${!isFuture ? 'cursor-pointer hover:bg-sky-100/60' : 'cursor-default'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isCompleted}
                                                        onChange={() => onToggleCompletion(habit.id, dateKey)}
                                                        disabled={isFuture}
                                                        className="h-5 w-5 rounded border-slate-300 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        style={{ accentColor: habit.color }}
                                                    />
                                                    <span className={`flex-grow text-sm font-medium transition-colors ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{habit.emoji} {habit.name}</span>
                                                </label>
                                            );
                                        }) : <p className="text-center text-sm text-slate-400 py-4">No habits scheduled.</p>}
                                   </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                 <div className="text-center py-16 px-4 bg-gradient-to-br from-sky-50 to-white/50 rounded-lg shadow-inner mt-6">
                    <p className="text-lg text-slate-500">No habits added yet.</p>
                    <p className="text-sm text-slate-400 mt-2">Click "New Habit" to start building consistency.</p>
                </div>
            )}
        </div>
    );
};

export default HabitsView;