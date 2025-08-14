import React, { useMemo } from 'react';
import { Worklet, DisplaySettings, WorkletType, DailyWorkItem, Assignment, Exam, Routine, Event } from '../types.ts';
import WorkletItem from './WorkletItem.tsx';
import { getDateKey } from '../utils.ts';

interface PastWorkViewProps {
  worklets: Worklet[];
  onSelectWorklet: (worklet: Worklet) => void;
  displaySettings: DisplaySettings;
  onRedistribute?: (workletId: string, dateKey: string) => void;
  onUndoRedistribute?: (workletId: string) => void;
}

const PastWorkView: React.FC<PastWorkViewProps> = ({ worklets, onSelectWorklet, displaySettings, onRedistribute, onUndoRedistribute }) => {
  const pastWorkItemsByMonth = useMemo(() => {
    const { timeZone } = displaySettings;
    const todayKey = getDateKey(new Date(), timeZone);

    const pastItems: (DailyWorkItem & { date: string })[] = [];

    worklets.forEach(w => {
        if (w.type === WorkletType.Assignment || w.type === WorkletType.Exam) {
            (w as Assignment | Exam).dailyTasks.forEach(task => {
                if (task.date < todayKey) {
                    pastItems.push({
                        worklet: w,
                        description: task.title,
                        isComplete: task.completed,
                        date: task.date,
                        dateKey: task.date
                    });
                }
            });
        } else if (w.type === WorkletType.Event) {
            const deadlineKey = getDateKey(new Date(w.deadline), timeZone);
            if (deadlineKey < todayKey) {
                pastItems.push({
                    worklet: w,
                    description: w.type,
                    isComplete: (w as Event).completed,
                    date: w.deadline.split('T')[0],
                    dateKey: undefined
                });
            }
        } else if (w.type === WorkletType.Routine) {
            const routine = w as Routine;
            const startDate = new Date(routine.startDate + 'T12:00:00Z');
            
            let iterDate = new Date(startDate);
            const todayForLoop = new Date(todayKey + 'T12:00:00Z');

            while (iterDate < todayForLoop) {
                const iterDateKey = getDateKey(iterDate, timeZone);
                const dayOfWeek = iterDate.getUTCDay();
                const scheduleForDay = routine.schedule.find(s => s.dayOfWeek === dayOfWeek);

                if (scheduleForDay) {
                    const isComplete = routine.completedDates.includes(iterDateKey);
                    const routineInstance = { ...routine, deadline: `${iterDateKey}T${scheduleForDay.time}` };

                    pastItems.push({
                        worklet: routineInstance,
                        description: "Routine",
                        isComplete: isComplete,
                        date: iterDateKey,
                        dateKey: iterDateKey
                    });
                }
                iterDate.setUTCDate(iterDate.getUTCDate() + 1);
            }
        }
    });

    const grouped = pastItems.reduce((acc, item) => {
      // Use a consistent date object for grouping to avoid timezone issues.
      const itemDate = new Date(item.date + 'T12:00:00Z');
      const monthKey = `${itemDate.toLocaleString('default', { month: 'long', timeZone: 'UTC' })} ${itemDate.getUTCFullYear()}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = [];
      }
      acc[monthKey].push(item);
      return acc;
    }, {} as Record<string, DailyWorkItem[]>);

    for (const month in grouped) {
        grouped[month].sort((a,b) => {
            const aDate = a.dateKey ? new Date(a.dateKey + 'T12:00:00Z') : new Date(a.worklet.deadline);
            const bDate = b.dateKey ? new Date(b.dateKey + 'T12:00:00Z') : new Date(b.worklet.deadline);
            
            if (aDate.getTime() !== bDate.getTime()) {
                return bDate.getTime() - aDate.getTime();
            }
            return new Date(b.worklet.deadline).getTime() - new Date(a.worklet.deadline).getTime();
        });
    }

    return Object.entries(grouped).sort(([a], [b]) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });
  }, [worklets, displaySettings]);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent mb-6">Past Work Archive</h1>
      
      {pastWorkItemsByMonth.length > 0 ? (
        <div className="space-y-8">
          {pastWorkItemsByMonth.map(([month, itemsInMonth]) => (
            <div key={month}>
              <h2 className="text-2xl font-bold text-slate-800 mb-4 pb-2 border-b-2 border-slate-200">{month}</h2>
              <div className="space-y-3">
                {itemsInMonth.map(item => (
                  <WorkletItem 
                    key={item.worklet.id + (item.dateKey || item.worklet.deadline)} 
                    worklet={item.worklet}
                    description={item.description}
                    isComplete={item.isComplete}
                    onClick={() => onSelectWorklet(item.worklet)} 
                    displaySettings={displaySettings}
                    onRedistribute={onRedistribute}
                    onUndoRedistribute={onUndoRedistribute}
                    dateKey={item.dateKey}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-gradient-to-br from-sky-50 to-white/50 rounded-lg shadow-inner mt-8">
          <p className="text-lg text-slate-500">No past work found.</p>
          <p className="text-sm text-slate-400 mt-2">Completed items from previous days will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default PastWorkView;