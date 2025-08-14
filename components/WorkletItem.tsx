import React from 'react';
import { Worklet, WorkletType, Assignment, Routine, DisplaySettings, Birthday, Exam, DailyTask } from '../types.ts';
import { RefreshIcon, ArrowUturnLeftIcon } from './icons.tsx';
import { formatTime, getDateKey } from '../utils.ts';
import Countdown from './Countdown.tsx';

interface WorkletItemProps {
  worklet: Worklet;
  onClick: () => void;
  description?: string;
  isComplete?: boolean;
  onToggleComplete?: () => void;
  displaySettings: DisplaySettings;
  onRedistribute?: (workletId: string, dateKey: string) => void;
  onUndoRedistribute?: (workletId: string) => void;
  dateKey?: string;
  onStudy?: (workletId: string, dateKey: string) => void;
  dailyTask?: DailyTask;
}

const getIconForType = (worklet: Worklet) => {
  const baseClasses = "w-4 h-4";
  if (worklet.type === WorkletType.Routine || worklet.type === WorkletType.Birthday) {
    return <span className="text-base">{worklet.emoji}</span>;
  }
  switch (worklet.type) {
    case WorkletType.Assignment:
      return <span className={baseClasses}>📝</span>;
    case WorkletType.Exam:
      return <span className={baseClasses}>📄</span>;
    case WorkletType.Event:
      return <span className={baseClasses}>🎉</span>;
    default:
      return null;
  }
};

const getBackgroundColorClassForType = (type: WorkletType) => {
  switch (type) {
    case WorkletType.Exam:
      return 'bg-gradient-to-r from-red-100 to-red-50 border-red-500';
    case WorkletType.Event:
      return 'bg-gradient-to-r from-green-100 to-green-50 border-green-500';
    default:
      return 'bg-gradient-to-r from-white to-sky-50 border-slate-500';
  }
};

const BirthdayDescription: React.FC<{ worklet: Birthday, displaySettings: DisplaySettings }> = ({ worklet, displaySettings }) => {
    const { timeZone } = displaySettings;
    const todayKey = getDateKey(new Date(), timeZone);
    const deadlineKey = getDateKey(new Date(worklet.deadline), timeZone);
    
    // Use UTC-based dates for reliable day difference calculation
    const today = new Date(todayKey + 'T12:00:00Z');
    const deadline = new Date(deadlineKey + 'T12:00:00Z');

    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let descriptionText: string;
    const deadlineYear = deadline.getUTCFullYear();

    if (diffDays > 1) {
        const timeText = `in ${diffDays} days!`;
        if (worklet.birthYear) {
            const age = deadlineYear - worklet.birthYear;
            descriptionText = `${worklet.name} turns ${age} ${timeText}`;
        } else {
            descriptionText = `${worklet.name}'s birthday is ${timeText}`;
        }
    } else if (diffDays === 1) {
        if (worklet.birthYear) {
            const age = deadlineYear - worklet.birthYear;
            descriptionText = `${worklet.name} turns ${age} tomorrow!`;
        } else {
            descriptionText = `${worklet.name}'s birthday is tomorrow!`;
        }
    } else if (diffDays === 0) {
        if (worklet.birthYear) {
            const age = deadlineYear - worklet.birthYear;
            descriptionText = `${worklet.name} turns ${age} today!`;
        } else {
            descriptionText = `${worklet.name}'s birthday is today!`;
        }
    } else { // Birthday has passed
        const daysAgo = -diffDays;
        const timeText = daysAgo === 1 ? 'yesterday' : `${daysAgo} days ago`;
         if (worklet.birthYear) {
            const age = deadlineYear - worklet.birthYear;
            descriptionText = `${worklet.name} turned ${age} ${timeText}.`;
        } else {
            descriptionText = `${worklet.name}'s birthday was ${timeText}.`;
        }
    }

    return <p className="text-sm text-slate-600">{descriptionText}</p>;
};


const WorkletItem: React.FC<WorkletItemProps> = ({ worklet, onClick, description, isComplete, onToggleComplete, displaySettings, onRedistribute, onUndoRedistribute, dateKey, onStudy, dailyTask }) => {
  const deadline = new Date(worklet.deadline);
  const formattedTime = formatTime(deadline, displaySettings);
  const formattedDate = deadline.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: displaySettings.timeZone
  });

  const isDetailedWorklet = worklet.type === WorkletType.Assignment || worklet.type === WorkletType.Exam;
  const isRoutineOrBirthday = worklet.type === WorkletType.Routine || worklet.type === WorkletType.Birthday;
  
  const detailedWorklet = isDetailedWorklet ? (worklet as Assignment | Exam) : null;
  const customColorWorklet = isRoutineOrBirthday ? (worklet as Routine | Birthday) : null;

  let style = {};
  let baseClasses = "w-full text-left p-3 rounded-lg flex items-center gap-3 shadow-sm hover:shadow-md transition-all duration-200 border-l-4";

  if (detailedWorklet?.color || customColorWorklet?.color) {
    const itemColor = detailedWorklet?.color || customColorWorklet!.color;
    style = {
      borderLeftColor: itemColor,
      background: `linear-gradient(90deg, ${itemColor}2A 0%, transparent 100%)`,
    };
  } else {
    baseClasses += ` ${getBackgroundColorClassForType(worklet.type)}`;
  }
  
  if (isComplete) {
    baseClasses += " opacity-50";
  }

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onToggleComplete?.();
  }
  
  const handleStudyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(onStudy && dateKey) {
        onStudy(worklet.id, dateKey);
    }
  }

  const handleRedistributeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if(onRedistribute && dateKey) {
        onRedistribute(worklet.id, dateKey);
    }
  }
  
  const handleUndoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUndoRedistribute?.(worklet.id);
  }

  const isFuture = new Date(worklet.deadline) > new Date();
  const isRedistributedTask = description?.startsWith('[Redistributed]');
  
  const todayKey = getDateKey(new Date(), displaySettings.timeZone);
  const canRedistribute = onRedistribute && !isRedistributedTask && dateKey && isDetailedWorklet && !isComplete && dateKey <= todayKey;
  const canUndo = onUndoRedistribute && detailedWorklet?.undoState && isRedistributedTask;
  const canStudy = onStudy && dateKey && dailyTask && dailyTask.workSegments.length > 0 && !isComplete;

  return (
    <div className="flex items-center gap-2">
      {onToggleComplete && !isRedistributedTask && (
        <input 
            type="checkbox"
            checked={isComplete}
            onChange={handleCheckboxChange}
            onClick={e => e.stopPropagation()}
            className="h-5 w-5 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
            aria-label={`Mark ${worklet.name} as complete`}
        />
      )}
      {canRedistribute && (
         <button 
            onClick={handleRedistributeClick}
            title="Redistribute missed work" 
            className="p-1 rounded-full text-slate-500 hover:bg-slate-200 hover:text-blue-600 transition-colors flex-shrink-0"
            aria-label="Redistribute missed work to future days"
        >
             <RefreshIcon className="w-4 h-4" />
         </button>
      )}
      {canUndo && (
         <button 
            onClick={handleUndoClick}
            title="Undo redistribution" 
            className="p-1 rounded-full text-slate-500 hover:bg-slate-200 hover:text-blue-600 transition-colors flex-shrink-0"
            aria-label="Undo redistribution"
        >
             <ArrowUturnLeftIcon className="w-4 h-4" />
         </button>
      )}
      {/* Spacer for redistributed tasks that have no checkbox */}
      {isRedistributedTask && !canUndo && <div className="w-5 h-5 flex-shrink-0"></div>}
      <button
        onClick={onClick}
        style={style}
        className={`${baseClasses} flex-wrap`}
      >
        <div className="flex-shrink-0 flex items-center">{getIconForType(worklet)}</div>
        <div className={`flex-grow min-w-0 ${isComplete ? 'line-through' : ''}`}>
          <p className={`${worklet.type === WorkletType.Exam ? 'font-bold' : 'font-semibold'} text-slate-800 truncate`}>{worklet.name}</p>
           {worklet.type === WorkletType.Birthday ? (
              <BirthdayDescription worklet={worklet as Birthday} displaySettings={displaySettings} />
           ) : description ? (
              <p className="text-sm text-slate-600 truncate">{description}</p>
          ) : (
              <p className="text-xs text-slate-500">{worklet.type}</p>
          )}
        </div>
        <div className={`flex-shrink-0 flex flex-wrap items-center justify-end gap-x-4 gap-y-1 ml-auto text-right ${isComplete ? 'line-through' : ''}`}>
            {canStudy && (
                <button
                    onClick={handleStudyClick}
                    className="px-4 py-1.5 rounded-md text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:to-blue-500 transition-all shadow-sm hover:shadow-md"
                >
                    Study
                </button>
            )}

            {worklet.showCountdown && isFuture ? (
                 <div className="flex flex-col items-end">
                    <Countdown deadline={worklet.deadline} />
                    <p className="text-xs text-slate-500 mt-1">
                        {formattedDate} &middot; {formattedTime}
                    </p>
                </div>
            ) : (
                <div>
                    <p className="text-sm font-medium text-slate-700">{formattedTime}</p>
                    <p className="text-xs text-slate-500">{formattedDate}</p>
                </div>
            )}
        </div>
      </button>
    </div>
  );
};

export default WorkletItem;
