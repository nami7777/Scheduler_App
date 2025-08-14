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
  totalWorkForPlan?: number, // Optional override
  startCumulative = 0
): DailyTask[] => {
  const newDailyTasks: DailyTask[] = [];

  const workToPlan = totalWorkForPlan ?? subtasks.reduce((sum, s) => s.weight, 0);

  if (subtasks.length === 0 || workToPlan <= 0) {
    return dailyWorkloadForPlan.map(day => ({
        date: day.date,
        title: 'Prepare for task. No subtasks defined.',
        completed: false,
        weightForDay: workToPlan > 0 ? workToPlan * (day.percentage / 100) : 0,
        workSegments: []
    }));
  }

  let cumulativeWorkDone = startCumulative;
  let subtaskProgressMarker = 0;
  let currentSubtaskIndex = 0;

  // Find where to start
  for(let i = 0; i < subtasks.length; i++) {
    const subtask = subtasks[i];
    if (subtaskProgressMarker + subtask.weight > cumulativeWorkDone) {
      currentSubtaskIndex = i;
      break;
    }
    subtaskProgressMarker += subtask.weight;
  }

  for (const day of dailyWorkloadForPlan) {
    const workForDay = workToPlan * (day.percentage / 100);
    if (workForDay < 0.01) {
        newDailyTasks.push({ date: day.date, title: 'Rest day.', completed: false, weightForDay: 0, workSegments: [] });
        continue;
    }

    let workLeftForDay = workForDay;
    const segmentsForDay = [];
    let titleForDay = '';

    while (workLeftForDay > 0.01 && currentSubtaskIndex < subtasks.length) {
        const subtask = subtasks[currentSubtaskIndex];
        const workDoneOnSubtaskBeforeThisSegment = Math.max(0, cumulativeWorkDone - subtaskProgressMarker);
        const remainingOnSubtask = subtask.weight - workDoneOnSubtaskBeforeThisSegment;
        
        const workThisSegment = Math.min(workLeftForDay, remainingOnSubtask);

        if (subtask.materialId) {
            segmentsForDay.push({
                subtaskId: subtask.id,
                materialId: subtask.materialId,
                start: workDoneOnSubtaskBeforeThisSegment,
                end: workDoneOnSubtaskBeforeThisSegment + workThisSegment,
            });
        }
        
        cumulativeWorkDone += workThisSegment;
        workLeftForDay -= workThisSegment;
        
        if (cumulativeWorkDone >= subtaskProgressMarker + subtask.weight - 0.01) {
            subtaskProgressMarker += subtask.weight;
            currentSubtaskIndex++;
        }
    }

    // Generate descriptive title
    if (segmentsForDay.length === 1) {
      const segment = segmentsForDay[0];
      const subtask = subtasks.find(s => s.id === segment.subtaskId);
      titleForDay = `Work on "${subtask?.name || 'task'}" (${Math.ceil(segment.end - segment.start)} ${unit})`;
    } else if (segmentsForDay.length > 1) {
        const firstSub = subtasks.find(s => s.id === segmentsForDay[0].subtaskId);
        const lastSub = subtasks.find(s => s.id === segmentsForDay[segmentsForDay.length - 1].subtaskId);
        titleForDay = `Finish "${firstSub?.name || 'task'}" and start "${lastSub?.name || 'task'}"`;
    } else {
        titleForDay = `Review or plan (${Math.ceil(workForDay)} ${unit})`;
    }

    newDailyTasks.push({
      date: day.date,
      title: titleForDay,
      completed: false,
      weightForDay: workForDay,
      workSegments: segmentsForDay,
    });
  }

  return newDailyTasks;
};


export const getWorkForDate = (date: Date, worklets: Worklet[], timeZone: string): DailyWorkItem[] => {
    const workItems: DailyWorkItem[] = [];
    const dateKey = getDateKey(date, timeZone);
    
    worklets.forEach(w => {
        if (w.type === WorkletType.Assignment || w.type === WorkletType.Exam) {
            const task = w.dailyTasks.find(t => t.date === dateKey);
            if (task) {
                workItems.push({ worklet: w, description: task.title, isComplete: task.completed, dateKey, dailyTask: task });
            }
        } else if (w.type === WorkletType.Routine) {
            const routine = w;
            // Use the dateKey for comparison to be timezone-safe
            const startDateKey = getDateKey(new Date(routine.startDate + 'T12:00:00Z'), timeZone);
            const endDateKey = routine.endDate ? getDateKey(new Date(routine.endDate + 'T12:00:00Z'), timeZone) : null;
            
            if (dateKey >= startDateKey && (!endDateKey || dateKey <= endDateKey)) {
                // We use the original date object to get the day of the week in the target timezone
                const checkDate = new Date(dateKey + 'T12:00:00Z'); // use a consistent date object
                const correctDayOfWeek = checkDate.getUTCDay();

                const scheduleForDay = routine.schedule.find(s => s.dayOfWeek === correctDayOfWeek);
                if (scheduleForDay) {
                    const isComplete = routine.completedDates.includes(dateKey);
                    const routineInstance = { ...routine, deadline: `${dateKey}T${scheduleForDay.time}` };
                    workItems.push({ worklet: routineInstance, description: "Routine", isComplete, dateKey });
                }
            }
        } else if (w.type === WorkletType.Event || w.type === WorkletType.Birthday) {
             const deadlineDateKey = getDateKey(new Date(w.deadline), timeZone);
             if (deadlineDateKey === dateKey) {
                if (w.type === WorkletType.Birthday) {
                    // The dynamic description is now handled in WorkletItem.tsx
                    // We provide a simple fallback here for other potential uses.
                    workItems.push({ worklet: w, description: 'Birthday Today!', isComplete: false, dateKey: undefined });
                } else { // Event
                    const event = w as Event;
                    const todayKey = getDateKey(new Date(), timeZone);
                    const isToday = dateKey === todayKey;
                    const isComplete = event.completed;
                    workItems.push({ worklet: w, description: `Due ${isToday ? 'Today' : 'this day'}`, isComplete, dateKey: undefined });
                }
            }
        }
    });

    return workItems.sort((a, b) => new Date(a.worklet.deadline).getTime() - new Date(b.worklet.deadline).getTime());
};

export const formatTime = (date: Date, settings: DisplaySettings): string => {
    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: settings.timeFormat === '12h',
        timeZone: settings.timeZone,
    });
};

export const formatDateTime = (date: Date, settings: DisplaySettings): string => {
    return date.toLocaleString([], {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: settings.timeFormat === '12h',
        timeZone: settings.timeZone,
    });
};