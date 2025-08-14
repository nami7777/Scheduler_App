

import React, { useMemo, useState, useEffect } from 'react';
import { Habit } from '../types.ts';
import { FireIcon, PencilIcon, TrashIcon, XMarkIcon } from './icons.tsx';

const calculateStreaks = (habit: Habit): { currentStreak: number, longestStreak: number } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isScheduled = (date: Date): boolean => {
        const startDate = new Date(habit.startDate + 'T00:00:00');
        const checkDate = new Date(date.getTime());
        checkDate.setHours(0,0,0,0);

        if (checkDate < startDate || habit.archived) return false;
        if (habit.frequency.type === 'daily') return true;
        return habit.frequency.days?.includes(checkDate.getDay()) ?? false;
    };

    const startDate = new Date(habit.startDate + 'T00:00:00');
    if (startDate > today) return { currentStreak: 0, longestStreak: 0 };

    // --- Longest Streak Calculation ---
    let longestStreak = 0;
    let currentRun = 0;
    let iterDate = new Date(startDate);
    while (iterDate <= today) {
        if (isScheduled(iterDate)) {
            const dateKey = iterDate.toISOString().split('T')[0];
            if (habit.completions[dateKey]) {
                currentRun++;
            } else {
                longestStreak = Math.max(longestStreak, currentRun);
                currentRun = 0;
            }
        }
        iterDate.setDate(iterDate.getDate() + 1);
    }
    longestStreak = Math.max(longestStreak, currentRun);

    // --- Current Streak Calculation ---
    let currentStreak = 0;
    let streakDate = new Date(today);

    // If today is scheduled but not completed, the current streak ended yesterday.
    const todayKey = today.toISOString().split('T')[0];
    if (isScheduled(today) && !habit.completions[todayKey]) {
        streakDate.setDate(streakDate.getDate() - 1);
    }
    
    // Now iterate backwards from streakDate
    while (streakDate >= startDate) {
        if (isScheduled(streakDate)) {
            const dateKey = streakDate.toISOString().split('T')[0];
            if (habit.completions[dateKey]) {
                currentStreak++;
            } else {
                // Missed a scheduled day, streak is broken.
                break;
            }
        }
        // Move to previous day
        streakDate.setDate(streakDate.getDate() - 1);
    }

    return { currentStreak, longestStreak };
};

const HabitActionsModal: React.FC<{
    habit: Habit | null;
    onClose: () => void;
    onEdit: (habit: Habit) => void;
    onDelete: (habitId: string) => void;
}> = ({ habit, onClose, onEdit, onDelete }) => {
    const [show, setShow] = useState(false);
    
    useEffect(() => {
        if (habit) {
            setShow(true);
        }
    }, [habit]);
    
    const handleClose = () => {
        setShow(false);
        setTimeout(onClose, 300); // Animation duration
    };

    if (!habit) return null;

    const handleEdit = () => {
        onEdit(habit);
        handleClose();
    };

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete the habit "${habit.name}"? This action cannot be undone.`)) {
            onDelete(habit.id);
            handleClose();
        }
    };

    return (
        <div 
            className={`fixed inset-0 flex justify-center items-center z-50 ${show ? 'modal-backdrop-in' : 'modal-backdrop-out'}`} 
            onClick={handleClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="habit-action-modal-title"
        >
            <div 
                className={`bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-2xl p-6 w-full max-w-sm mx-4 ${show ? 'modal-content-in' : 'modal-content-out'}`}
                onClick={e => e.stopPropagation()}
            >
                <div className="text-center">
                    <span className="text-5xl">{habit.emoji}</span>
                    <h3 id="habit-action-modal-title" className="text-xl font-bold text-slate-900 mt-2">{habit.name}</h3>
                    <p className="text-slate-500 mt-1">Manage your habit</p>
                </div>
                <div className="mt-6 flex flex-col gap-3">
                    <button 
                        onClick={handleEdit} 
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-md text-sm font-semibold text-slate-700 bg-gradient-to-r from-slate-100 to-slate-50 hover:to-slate-200 transition-all shadow-sm hover:shadow-md"
                    >
                        <PencilIcon className="w-4 h-4" /> Edit Habit
                    </button>
                    <button 
                        onClick={handleDelete} 
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-md text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:to-red-500 transition-all shadow-sm hover:shadow-md"
                    >
                        <TrashIcon className="w-4 h-4"/> Delete Habit
                    </button>
                </div>
                <div className="mt-6 text-center">
                   <button 
                       onClick={handleClose} 
                       className="px-6 py-2 rounded-md font-semibold transition text-sm text-slate-600 hover:bg-slate-100"
                   >
                        Cancel
                   </button>
                </div>
            </div>
        </div>
    );
};


interface HabitStreaksProps {
    habits: Habit[];
    onEditHabit: (habit: Habit) => void;
    onDeleteHabit: (habitId: string) => void;
}

const HabitStreaks: React.FC<HabitStreaksProps> = ({ habits, onEditHabit, onDeleteHabit }) => {
    const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

    const habitsWithStreaks = useMemo(() => {
        return habits.map(habit => ({
            ...habit,
            streaks: calculateStreaks(habit)
        })).sort((a,b) => b.streaks.currentStreak - a.streaks.currentStreak);
    }, [habits]);

    return (
        <>
            <div>
                <h2 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
                    🔥
                    <span>Current Streaks</span>
                </h2>
                <div className="flex gap-4 overflow-x-auto pb-4 -m-2 p-2">
                    {habitsWithStreaks.map(habit => (
                         <button 
                            key={habit.id}
                            onClick={() => setSelectedHabit(habit)}
                            className="flex-shrink-0 w-44 bg-gradient-to-br from-white to-sky-50 p-4 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-70"
                            style={{ borderTop: `4px solid ${habit.color}` }}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">{habit.emoji}</span>
                                <p className="font-semibold text-slate-800 text-sm truncate" title={habit.name}>{habit.name}</p>
                            </div>
                            <div className="text-center my-3">
                                <span className="text-5xl font-bold text-orange-500 drop-shadow-sm">{habit.streaks.currentStreak}</span>
                                <p className="text-xs font-bold text-orange-500/80">DAY STREAK</p>
                            </div>
                            <div className="text-center text-xs text-slate-500 font-medium">
                                Best: {habit.streaks.longestStreak} days
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            <HabitActionsModal 
                habit={selectedHabit}
                onClose={() => setSelectedHabit(null)}
                onEdit={onEditHabit}
                onDelete={onDeleteHabit}
            />
        </>
    );
};

export default HabitStreaks;