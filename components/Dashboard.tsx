import React, { useMemo } from 'react';
import { Worklet, DailyWorkItem, DisplaySettings, Birthday, WorkletType, Assignment, Exam, DailyTask } from '../types.ts';
import WorkletItem from './WorkletItem.tsx';
import { WhatsAppIcon } from './icons.tsx';
import { getWorkForDate, calculateNextBirthday, getDateKey } from '../utils.ts';

interface DashboardProps {
  worklets: Worklet[];
  onSelectWorklet: (worklet: Worklet) => void;
  onToggleComplete: (workletId: string, dateKey?: string) => void;
  onRedistribute: (workletId: string, dateKey: string) => void;
  onUndoRedistribute: (workletId: string) => void;
  displaySettings: DisplaySettings;
  onStudy: (workletId: string, dateKey: string) => void;
}

const NextBirthdayWidget: React.FC<{ birthday: Birthday | null, displaySettings: DisplaySettings }> = ({ birthday, displaySettings }) => {
    if (!birthday) return null;

    const todayKey = getDateKey(new Date(), displaySettings.timeZone);
    const deadlineKey = getDateKey(new Date(birthday.deadline), displaySettings.timeZone);

    const today = new Date(todayKey + 'T12:00:00Z');
    const nextBirthdayDate = new Date(deadlineKey + 'T12:00:00Z');
    
    const diffTime = nextBirthdayDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const isToday = diffDays === 0;

    const baseClasses = "p-2 pl-3 rounded-lg shadow-sm transition hover:shadow-md cursor-default";
    const normalBg = "bg-gradient-to-r from-amber-100 to-yellow-50 border-l-4 border-amber-400";
    const todayBg = "birthday-today-glow text-white";

    let subtitle = '';
    if (isToday) {
        subtitle = "is today! Happy Birthday!";
    } else if (diffDays === 1) {
        subtitle = "is tomorrow!";
    } else {
        subtitle = `in ${diffDays} days`;
    }
    
    return (
        <div className={`${baseClasses} ${isToday ? todayBg : normalBg}`}>
            <p className={`text-sm font-bold ${isToday ? 'text-white' : 'text-amber-900'}`}>{birthday.emoji} {birthday.name}'s Birthday</p>
            <p className={`text-xs ${isToday ? 'text-white/90' : 'text-amber-800'}`}>{subtitle}</p>
        </div>
    )
};

const Dashboard: React.FC<DashboardProps> = ({ worklets, onSelectWorklet, onToggleComplete, onRedistribute, onUndoRedistribute, displaySettings, onStudy }) => {
  
  const renderWorkletList = (title: string, items: DailyWorkItem[], isOverdue: boolean = false) => (
    <div className="mb-8">
      <h2 className={`text-2xl font-bold mb-4 ${isOverdue ? 'text-amber-600' : 'text-slate-800'}`}>{title}</h2>
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map(item => (
            <WorkletItem 
                key={item.worklet.id + (item.dateKey || '')} 
                worklet={item.worklet} 
                description={item.description}
                onClick={() => onSelectWorklet(item.worklet)} 
                isComplete={item.isComplete}
                onToggleComplete={() => onToggleComplete(item.worklet.id, item.dateKey)}
                displaySettings={displaySettings}
                onRedistribute={onRedistribute}
                onUndoRedistribute={onUndoRedistribute}
                dateKey={item.dateKey}
                onStudy={onStudy}
                dailyTask={item.dailyTask}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 px-4 bg-gradient-to-br from-sky-50 to-white/50 rounded-lg shadow-inner">
          <p className="text-slate-500">Nothing scheduled {title === 'Today' || title === 'Tomorrow' ? title.toLowerCase() : `on ${title}`}.</p>
        </div>
      )}
    </div>
  );

  const { overdueTasks, upcomingDays } = useMemo(() => {
    const { timeZone } = displaySettings;
    const now = new Date();
    const todayKey = getDateKey(now, timeZone);

    const overdue: DailyWorkItem[] = [];
    const activeDetailedWorklets = worklets.filter((w): w is Assignment | Exam => 
        (w.type === WorkletType.Assignment || w.type === WorkletType.Exam)
    );

    activeDetailedWorklets.forEach(w => {
      // An assignment is only overdue if its deadline hasn't passed.
      if (getDateKey(new Date(w.deadline), timeZone) < todayKey) return;

      w.dailyTasks.forEach(task => {
        // Compare date strings directly for accuracy.
        if (!task.completed && task.date < todayKey) {
          overdue.push({
            worklet: w,
            description: task.title,
            isComplete: task.completed,
            dateKey: task.date,
            dailyTask: task,
          });
        }
      });
    });
    
    const upcoming = [];
    // Use a date object that is guaranteed to be on the correct day in UTC.
    // This avoids issues with local timezones and DST when looping.
    const startOfTodayForLoop = new Date(todayKey + 'T12:00:00Z');

    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfTodayForLoop);
        date.setUTCDate(startOfTodayForLoop.getUTCDate() + i);

        let title;
        if (i === 0) title = 'Today';
        else if (i === 1) title = 'Tomorrow';
        else title = date.toLocaleDateString(undefined, { weekday: 'long', timeZone: 'UTC' });
        
        upcoming.push({ date, title });
    }

    return {
        overdueTasks: overdue.sort((a,b) => new Date(a.dateKey!).getTime() - new Date(b.dateKey!).getTime()),
        upcomingDays: upcoming
    };
  }, [worklets, displaySettings]);


  
  const nextBirthday = useMemo(() => {
    const todayKey = getDateKey(new Date(), displaySettings.timeZone);

    return worklets
        .filter((w): w is Birthday => w.type === WorkletType.Birthday)
        .map(b => {
            if (getDateKey(new Date(b.deadline), displaySettings.timeZone) < todayKey) {
                const nextDeadline = calculateNextBirthday(b.birthMonth, b.birthDay);
                return {...b, deadline: nextDeadline.toISOString()};
            }
            return b;
        })
        .sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
        [0] || null;
  }, [worklets, displaySettings]);


  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">QuickLook</h1>
        {displaySettings.showBirthdayWidget && (
            <NextBirthdayWidget birthday={nextBirthday} displaySettings={displaySettings}/>
        )}
      </div>
      
      {overdueTasks.length > 0 && (
          renderWorkletList("Overdue & Incomplete", overdueTasks, true)
      )}

      {upcomingDays.map(({ date, title }) => {
        const workForDay = getWorkForDate(date, worklets, displaySettings.timeZone);
        return (
            <React.Fragment key={title}>
                {renderWorkletList(title, workForDay)}
            </React.Fragment>
        )
      })}
      
      <div className="text-center mt-8 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-400">by Nami + Gemini</p>
        <a href="https://wa.me/971521728034" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-green-600 transition-colors">
          <WhatsAppIcon className="w-4 h-4 text-green-500"/>
          <span>Got any questions? WhatsApp +971 52 172 8034</span>
        </a>
      </div>
    </div>
  );
};

export default Dashboard;