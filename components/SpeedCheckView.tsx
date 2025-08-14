

import React, { useState, useMemo } from 'react';
import { Worklet, WorkletType, SpeedSession, Assignment, Exam, DailyTask, DisplaySettings } from '../types.ts';
import SpeedCheckSessionView from './SpeedCheckSessionView.tsx';
import WorkletItem from './WorkletItem.tsx';

interface SpeedCheckViewProps {
    worklets: Worklet[];
    speedSessions: SpeedSession[];
    onAddSession: (session: SpeedSession) => void;
    displaySettings: DisplaySettings;
}

const SpeedCheckView: React.FC<SpeedCheckViewProps> = ({ worklets, speedSessions, onAddSession, displaySettings }) => {
    const [selectedTask, setSelectedTask] = useState<{worklet: Assignment | Exam, dailyTask: DailyTask} | null>(null);

    const todaysTasks = useMemo(() => {
        const today = new Date();
        const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        return worklets
            .filter((w): w is Assignment | Exam => w.type === WorkletType.Assignment || w.type === WorkletType.Exam)
            .map(w => {
                const dailyTask = w.dailyTasks.find(t => t.date === dateKey);
                return dailyTask ? { worklet: w, dailyTask } : null;
            })
            .filter((item): item is { worklet: Assignment | Exam, dailyTask: DailyTask } => item !== null);
    }, [worklets]);

    if (selectedTask) {
        const sessionsForThisTask = speedSessions.filter(s => 
            s.workletId === selectedTask.worklet.id && s.dailyTaskDate === selectedTask.dailyTask.date
        );
        return (
            <SpeedCheckSessionView 
                worklet={selectedTask.worklet}
                dailyTask={selectedTask.dailyTask}
                sessions={sessionsForThisTask}
                onAddSession={onAddSession}
                onBack={() => setSelectedTask(null)}
            />
        );
    }

    return (
        <div className="p-4 sm:p-6">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent mb-6">Speed Check</h1>
            <p className="text-lg text-slate-600 mb-8">Select one of today's tasks to start a timing session.</p>

            {todaysTasks.length > 0 ? (
                 <div className="space-y-3 max-w-2xl mx-auto">
                    {todaysTasks.map(({ worklet, dailyTask }) => (
                         <WorkletItem
                            key={worklet.id + dailyTask.date}
                            worklet={worklet}
                            description={dailyTask.title}
                            onClick={() => setSelectedTask({ worklet, dailyTask })}
                            isComplete={dailyTask.completed}
                            displaySettings={displaySettings}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 px-4 bg-gradient-to-br from-sky-50 to-white/50 rounded-lg shadow-inner mt-8">
                    <p className="text-lg text-slate-500">No assignments or exams scheduled for today.</p>
                    <p className="text-sm text-slate-400 mt-2">Tasks with daily plans will appear here on their scheduled day.</p>
                </div>
            )}
        </div>
    );
};

export default SpeedCheckView;