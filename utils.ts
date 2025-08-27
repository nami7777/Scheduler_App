import { Worklet, WorkletType, Assignment, Exam, Routine, Event, DailyWorkItem, DisplaySettings, Birthday, DailyTask, DailyWorkload, Subtask, Material } from './types.ts';

export const getDateKey = (date: Date, timeZone: string): string => {
    // Use Intl.DateTimeFormat to get date parts in the target timezone.
    // This is the most reliable way to handle timezones in JS.
    const options: Intl.DateTimeFormatOptions = { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD format
    return formatter.format(date);
};

export const getYoutubeVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};


export const calculateNextBirthday = (birthMonth: number, birthDay: number): Date => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const currentYear = today.getFullYear();
    // Month is 0-indexed in JS Date, so subtract 1
    const birthdayThisYear = new Date(currentYear, birthMonth - 1, birthDay);

    if (birthdayThisYear < today) {
        // Birthday for this year has passed, set for next year
        return new Date(currentYear + 1, birthMonth - 1, birthDay);
    } else {
        // Birthday is upcoming this year
        return birthdayThisYear;
    }
};

export const generateSubtaskPlan = (
  dailyWorkloadForPlan: DailyWorkload[],
  subtasks: Subtask[],
  materials: Material[],
  unit: string,
  totalWorkForPlan?: number, // Optional override for redistribution
  startCumulative = 0 // Optional override for redistribution
): DailyTask[] => {
  const newDailyTasks: DailyTask[] = [];

  // For planning, we only care about the work that still needs to be done.
  const subtasksToPlan = subtasks
    .map(s => ({ ...s, remaining: s.weight - s.progress }))
    .filter(s => s.remaining > 0);

  const workToPlan = totalWorkForPlan ?? subtasksToPlan.reduce((sum, s) => sum + s.remaining, 0);

  if (subtasksToPlan.length === 0 || workToPlan <= 0) {
    return dailyWorkloadForPlan.map(day => ({
        date: day.date,
        title: 'All tasks are complete or no work to plan.',
        completed: false,
        weightForDay: 0,
        workSegments: []
    }));
  }

  // This tracks the progress of the *new plan*. It starts at 0.
  let plannedWorkSoFar = startCumulative;
  let currentSubtaskIndex = 0;

  for (const day of dailyWorkloadForPlan) {
    const workForDay = workToPlan * (day.percentage / 100);
    if (workForDay < 0.01) {
        newDailyTasks.push({ date: day.date, title: 'Rest day.', completed: false, weightForDay: 0, workSegments: [] });
        continue;
    }

    let workLeftForDay = workForDay;
    const segmentsForDay = [];
    
    // Data for building the title string.
    const descriptionData: { [key: string]: { workDoneThisDay: number, newTotalProgress: number, totalWeight: number } } = {};
    let totalWorkDoneThisDay = 0;

    while (workLeftForDay > 0.01 && currentSubtaskIndex < subtasksToPlan.length) {
        const subtask = subtasksToPlan[currentSubtaskIndex];
        
        // Find how much of this subtask has already been allocated in previous days of *this plan*.
        const plannedWorkInPreviousSubtasks = subtasksToPlan.slice(0, currentSubtaskIndex).reduce((sum, s) => sum + s.remaining, 0);
        const plannedWorkInThisSubtask = Math.max(0, plannedWorkSoFar - plannedWorkInPreviousSubtasks);
        
        // How much is left to plan for this subtask.
        const remainingToPlanInSubtask = subtask.remaining - plannedWorkInThisSubtask;
        
        if (remainingToPlanInSubtask <= 0.001) { // Use a small epsilon for float comparison
            currentSubtaskIndex++;
            continue;
        }

        const workToDoOnThisSubtask = Math.min(workLeftForDay, remainingToPlanInSubtask);
        
        if (subtask.materialId) {
            segmentsForDay.push({
                subtaskId: subtask.id,
                materialId: subtask.materialId,
                // Start from existing progress + what's planned before today
                start: subtask.progress + plannedWorkInThisSubtask, 
                end: subtask.progress + plannedWorkInThisSubtask + workToDoOnThisSubtask,
            });
        }

        // The new total progress in this subtask after today's work.
        const newTotalProgressForSubtask = subtask.progress + plannedWorkInThisSubtask + workToDoOnThisSubtask;

        if (!descriptionData[subtask.name]) {
            descriptionData[subtask.name] = { workDoneThisDay: 0, newTotalProgress: 0, totalWeight: subtask.weight };
        }
        descriptionData[subtask.name].workDoneThisDay += workToDoOnThisSubtask;
        descriptionData[subtask.name].newTotalProgress = newTotalProgressForSubtask;
        
        totalWorkDoneThisDay += workToDoOnThisSubtask;
        workLeftForDay -= workToDoOnThisSubtask;
        plannedWorkSoFar += workToDoOnThisSubtask;
        
        // If we've planned for the entirety of this subtask's remaining work, move to the next.
        if (plannedWorkInThisSubtask + workToDoOnThisSubtask >= subtask.remaining - 0.001) {
            currentSubtaskIndex++;
        }
    }
    
    const descriptionParts = Object.entries(descriptionData).map(([name, data]) => {
      // Use Math.min to handle potential floating point errors making progress > total
      const roundedProgress = Math.round(Math.min(data.newTotalProgress, data.totalWeight));
      return `reaching ${roundedProgress}/${data.totalWeight} ${unit} in '${name}'`;
    });

    let title: string;
    if (descriptionParts.length > 0) {
        // Round the total work for the day to avoid ugly decimals in the title.
        title = `Do ${Math.round(totalWorkDoneThisDay)} ${unit}, ${descriptionParts.join(' and ')}`;
    } else {
        title = "Continue working on your tasks."; // Fallback
    }
    
    newDailyTasks.push({
        date: day.date,
        title: title,
        completed: false,
        weightForDay: totalWorkDoneThisDay, // Use the actual sum of segments for accuracy
        workSegments: segmentsForDay
    });
  }
  return newDailyTasks;
};

export const formatTime = (date: Date, displaySettings: DisplaySettings): string => {
    return date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: displaySettings.timeFormat === '12h',
        timeZone: displaySettings.timeZone,
    });
};

export const formatDateTime = (date: Date, displaySettings: DisplaySettings): string => {
    return date.toLocaleString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: displaySettings.timeFormat === '12h',
        timeZone: displaySettings.timeZone,
    });
};

export const getWorkForDate = (date: Date, worklets: Worklet[], timeZone: string): DailyWorkItem[] => {
  const dateKey = getDateKey(date, timeZone);
  const items: DailyWorkItem[] = [];

  worklets.forEach(w => {
    if ((w.type === WorkletType.Assignment || w.type === WorkletType.Exam)) {
      const task = (w as Assignment | Exam).dailyTasks.find(t => t.date === dateKey);
      if (task) {
        items.push({
          worklet: w,
          description: task.title,
          isComplete: task.completed,
          dateKey: task.date,
          dailyTask: task,
        });
      }
    } else if (w.type === WorkletType.Event) {
      if (getDateKey(new Date(w.deadline), timeZone) === dateKey) {
        items.push({
          worklet: w,
          description: w.type,
          isComplete: (w as Event).completed,
          dateKey: undefined,
        });
      }
    } else if (w.type === WorkletType.Routine) {
        const routine = w as Routine;
        const routineDate = new Date(dateKey + "T12:00:00Z"); // Use a consistent UTC-based date for comparison
        const dayOfWeek = routineDate.getUTCDay();
        const scheduleForDay = routine.schedule.find(s => s.dayOfWeek === dayOfWeek);
        const startDate = new Date(routine.startDate + 'T00:00:00Z');
        const endDate = routine.endDate ? new Date(routine.endDate + 'T00:00:00Z') : null;

        if (scheduleForDay && routineDate >= startDate && (!endDate || routineDate <= endDate)) {
            const isComplete = routine.completedDates.includes(dateKey);
            const routineInstance = { ...routine, deadline: `${dateKey}T${scheduleForDay.time}` };
            items.push({
                worklet: routineInstance,
                description: 'Routine',
                isComplete,
                dateKey: dateKey,
            });
        }
    } else if (w.type === WorkletType.Birthday) {
         if (getDateKey(new Date(w.deadline), timeZone) === dateKey) {
            items.push({
                worklet: w,
                description: 'Birthday',
                isComplete: false,
                dateKey: undefined
            });
         }
    }
  });

  return items.sort((a,b) => new Date(a.worklet.deadline).getTime() - new Date(b.worklet.deadline).getTime());
};