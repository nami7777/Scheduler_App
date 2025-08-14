

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Worklet, WorkletType, Assignment, Exam, Routine, Event, DisplaySettings, DailyWorkItem } from '../types.ts';
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, MapPinIcon } from './icons.tsx';
import WorkletItem from './WorkletItem.tsx';
import { formatTime, getDateKey, getWorkForDate } from '../utils.ts';

type CalendarViewMode = 'year' | 'month' | 'week' | 'day';

interface CalendarViewProps {
  worklets: Worklet[];
  onSelectWorklet: (worklet: Worklet) => void;
  displaySettings: DisplaySettings;
  onImportWorklets: (newWorklets: Worklet[]) => void;
}

const getWorkletColor = (worklet: Worklet) => {
    const defaultColor = '#64748b'; // slate-500
    if ((worklet.type === WorkletType.Assignment || worklet.type === WorkletType.Exam || worklet.type === WorkletType.Routine || worklet.type === WorkletType.Birthday) && worklet.color) {
        return worklet.color;
    }
    if (worklet.type === WorkletType.Event) return '#22c55e'; // green-500
    return defaultColor;
};


const CalendarView: React.FC<CalendarViewProps> = ({ worklets, onSelectWorklet, displaySettings, onImportWorklets }) => {
  const [view, setView] = useState<CalendarViewMode>('month');
  const [viewDates, setViewDates] = useState({
    year: new Date(),
    month: new Date(),
    week: new Date(),
    day: new Date(),
  });
  const currentDate = viewDates[view];
  const [animationClass, setAnimationClass] = useState('');
  
  const [dayModalInfo, setDayModalInfo] = useState<{ date: Date; worklets: DailyWorkItem[] } | null>(null);
  const [isDayModalOpen, setIsDayModalOpen] = useState(false);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const importInputRef = useRef<HTMLInputElement>(null);
  const touchStartX = useRef<number | null>(null);
  const minSwipeDistance = 50;
  
  const { timeZone } = displaySettings;
  const todayKey = getDateKey(new Date(), timeZone);
  const oneMonthFromNow = new Date();
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

  const [exportStartDate, setExportStartDate] = useState(todayKey);
  const [exportEndDate, setExportEndDate] = useState(getDateKey(oneMonthFromNow, timeZone));
  
  const workletsByDate = useMemo(() => {
    const map = new Map<string, Worklet[]>();

    const addWorkletToDate = (date: Date, worklet: Worklet) => {
        const key = getDateKey(date, timeZone);
        if (!map.has(key)) {
            map.set(key, []);
        }
        const existing = map.get(key)!;
        if (!existing.find(w => w.id === worklet.id && w.deadline === worklet.deadline)) {
            existing.push(worklet);
        }
    };

    worklets.forEach(w => {
        if (w.type === WorkletType.Assignment || w.type === WorkletType.Exam) {
            addWorkletToDate(new Date(w.deadline), w);
            (w as Assignment | Exam).dailyTasks.forEach(task => {
                addWorkletToDate(new Date(task.date + 'T12:00:00Z'), w);
            });
        } else if (w.type === WorkletType.Routine) {
            const routine = w;
            const startDate = new Date(routine.startDate + 'T12:00:00Z');
            const endDate = routine.endDate ? new Date(routine.endDate + 'T12:00:00Z') : new Date('2099-12-31');

            const iterDate = new Date(startDate);
            const maxIter = 365 * 2;
            for(let i=0; i < maxIter && iterDate <= endDate; i++) {
                const dayOfWeek = iterDate.getUTCDay();
                const scheduleForDay = routine.schedule.find(s => s.dayOfWeek === dayOfWeek);
                if (scheduleForDay) {
                    const iterDateKey = getDateKey(iterDate, timeZone);
                    const routineInstance = { ...routine, deadline: `${iterDateKey}T${scheduleForDay.time}` };
                    addWorkletToDate(iterDate, routineInstance);
                }
                iterDate.setUTCDate(iterDate.getUTCDate() + 1);
            }
        } else {
             addWorkletToDate(new Date(w.deadline), w);
        }
    });

    map.forEach(dayWorklets => {
      dayWorklets.sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    });
    return map;
  }, [worklets, timeZone]);
  
  const handleDateChange = useCallback((direction: 'prev' | 'next') => {
    setAnimationClass(direction === 'next' ? 'slide-out-to-left' : 'slide-out-to-right');
    
    setTimeout(() => {
        setViewDates(prev => {
            const newDate = new Date(prev[view]);
            switch (view) {
                case 'year':
                    newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
                    break;
                case 'month':
                    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1), 15);
                    break;
                case 'week':
                    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
                    break;
                case 'day':
                    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
                    break;
            }
            return { ...prev, [view]: newDate };
        });
        setAnimationClass(direction === 'next' ? 'slide-in-from-right' : 'slide-in-from-left');
    }, 150);
  }, [view]);
  
  const handleJumpToPresent = () => {
    setViewDates(prev => ({ ...prev, [view]: new Date() }));
  };

  const isAtPresent = useMemo(() => {
    const now = new Date();
    const calDate = currentDate;

    switch (view) {
        case 'year':
            return now.getFullYear() === calDate.getFullYear();
        case 'month':
            return now.getFullYear() === calDate.getFullYear() && now.getMonth() === calDate.getMonth();
        case 'week':
            const startOfWeek = new Date(calDate);
            startOfWeek.setHours(0,0,0,0);
            startOfWeek.setDate(calDate.getDate() - calDate.getDay());
            
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23,59,59,999);
            return now >= startOfWeek && now <= endOfWeek;
        case 'day':
            return getDateKey(now, timeZone) === getDateKey(calDate, timeZone);
    }
  }, [view, currentDate, timeZone]);

  const handleViewChange = (newView: CalendarViewMode) => {
    setView(newView);
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
      if (touchStartX.current === null) return;
      const touchEndX = e.changedTouches[0].clientX;
      const swipeDistance = touchStartX.current - touchEndX;

      if (swipeDistance > minSwipeDistance) {
          handleDateChange('next');
      } else if (swipeDistance < -minSwipeDistance) {
          handleDateChange('prev');
      }
      touchStartX.current = null;
  };

  const openDayModal = (date: Date) => {
    const workletsForDay = getWorkForDate(date, worklets, timeZone);
    setDayModalInfo({ date, worklets: workletsForDay });
    setIsDayModalOpen(true);
  }
  
  const closeDayModal = () => {
      setIsDayModalOpen(false);
      setTimeout(() => setDayModalInfo(null), 300);
  }
  
  const openExportModal = () => {
      setIsExportModalOpen(true);
  }
  
  const closeExportModal = () => {
      setIsExportModalOpen(false);
  }

  // Header Title Logic
  const headerTitle = useMemo(() => {
    switch(view) {
        case 'year':
            return currentDate.getFullYear();
        case 'month':
            return currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone });
        case 'week':
            const startOfWeek = new Date(currentDate);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            return `${startOfWeek.toLocaleDateString(undefined, {month: 'short', day: 'numeric', timeZone})} - ${endOfWeek.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric', timeZone})}`;
        case 'day':
            return currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone });
    }
  }, [currentDate, view, timeZone]);

  const ViewSwitcher = () => (
    <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
        {(['year', 'month', 'week', 'day'] as CalendarViewMode[]).map(v => (
            <button
                key={v}
                onClick={() => handleViewChange(v)}
                className={`px-3 py-1 text-xs sm:text-sm rounded-md capitalize transition-all ${view === v ? 'bg-white shadow-sm font-semibold text-blue-700' : 'font-medium text-slate-600 hover:bg-sky-100'}`}
            >{v}</button>
        ))}
    </div>
  );

  const renderYearView = () => {
    const year = currentDate.getFullYear();
    const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 15));
    
    const activityPerMonth = months.map(monthDate => {
        const month = monthDate.getMonth();
        const year = monthDate.getFullYear();
        let count = 0;
        workletsByDate.forEach((dayWorklets, dateKey) => {
            const [dYear, dMonth] = dateKey.split('-').map(Number);
            if (dYear === year && dMonth === month + 1) {
                count += dayWorklets.length;
            }
        });
        return count;
    });

    const maxActivity = Math.max(...activityPerMonth, 1);

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
            {months.map((monthDate, i) => {
                 const activity = activityPerMonth[i];
                 const activityLevel = Math.ceil((activity / maxActivity) * 5);
                 const borderColorClass = [
                    'border-transparent',
                    'border-sky-200',
                    'border-sky-300',
                    'border-blue-400',
                    'border-blue-500',
                    'border-violet-600',
                 ][activityLevel];

                return (
                    <button
                        key={i}
                        onClick={() => {
                            setViewDates(prev => ({ ...prev, month: monthDate }));
                            setView('month');
                        }}
                        className={`p-4 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-center bg-gradient-to-br from-white to-sky-50 border-b-4 ${borderColorClass}`}
                    >
                        <p className="font-bold text-slate-800 text-lg">{monthDate.toLocaleDateString(undefined, { month: 'long', timeZone })}</p>
                    </button>
                )
            })}
        </div>
    );
  };

  const renderMonthView = () => {
     const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
     const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
     const startingDayOfWeek = firstDayOfMonth.getDay();
     
     const days = [];
     for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(<div key={`empty-${i}`} className="border-r border-b border-slate-100"></div>);
     }
     for(let day=1; day <= daysInMonth; day++) {
        const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateKey = getDateKey(dateObj, timeZone);
        const dayWorklets = workletsByDate.get(dateKey) || [];
        const isToday = todayKey === dateKey;
        days.push(
            <div key={day} onClick={() => openDayModal(dateObj)} className={`border-r border-b p-2 flex flex-col gap-2 transition-colors duration-200 cursor-pointer group hover:bg-sky-100/50 ${isToday ? 'bg-blue-100/50' : 'bg-transparent'} border-slate-100`}>
                <span className={`text-xs font-semibold self-end ${isToday ? 'bg-blue-600 text-white rounded-full flex items-center justify-center w-5 h-5' : 'text-slate-500'}`}>{day}</span>
                <div className="flex-grow flex flex-wrap items-start gap-1.5 pt-1 overflow-hidden">
                    {dayWorklets.slice(0, 4).map(w => (
                        <div
                            key={w.id + w.deadline}
                            title={w.name}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getWorkletColor(w) }}
                        ></div>
                    ))}
                    {dayWorklets.length > 4 && (
                        <div className="w-2 h-2 rounded-full bg-slate-400" title={`+${dayWorklets.length - 4} more`}></div>
                    )}
                </div>
            </div>
        )
     }
     
     return (
        <div className="grid grid-cols-7 h-[75vh] border-l border-t border-slate-100 rounded-lg overflow-hidden bg-white shadow-inner">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                <div key={i} className="text-center font-bold text-slate-500 text-xs sm:text-sm p-2 bg-slate-50/70 border-r border-b border-slate-100">{day}</div>
            ))}
            {days}
        </div>
     )
  };
  
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - startOfWeek.getDay());

    const days = Array.from({ length: 7 }, (_, i) => {
        const dayDate = new Date(startOfWeek);
        dayDate.setDate(startOfWeek.getDate() + i);
        return dayDate;
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            {days.map(day => {
                const dateKey = getDateKey(day, timeZone);
                const dayWorklets = getWorkForDate(day, worklets, timeZone);
                const isToday = todayKey === dateKey;
                return (
                    <div key={dateKey} className={`p-4 rounded-xl shadow-lg flex flex-col gap-4 bg-gradient-to-br from-white to-sky-50 ${isToday ? 'ring-2 ring-blue-500' : 'ring-1 ring-slate-100'}`}>
                        <div className="text-center">
                            <p className={`text-sm font-semibold ${isToday ? 'text-blue-700' : 'text-slate-500'}`}>{day.toLocaleDateString(undefined, { weekday: 'long', timeZone })}</p>
                            <p className={`text-3xl font-bold ${isToday ? 'text-blue-700' : 'text-slate-800'}`}>{day.getDate()}</p>
                        </div>
                        <div className="space-y-3 flex-grow border-t border-slate-200 pt-4">
                           {dayWorklets.length > 0 ? dayWorklets.map(item => (
                             <WorkletItem key={item.worklet.id + item.dateKey} worklet={item.worklet} onClick={() => onSelectWorklet(item.worklet)} displaySettings={displaySettings} description={item.description} />
                           )) : (
                             <div className="text-center text-xs text-slate-400 pt-8">No items</div>
                           )}
                        </div>
                    </div>
                )
            })}
        </div>
    );
  };
  
  const renderDayView = () => {
     const dayWorklets = getWorkForDate(currentDate, worklets, timeZone);
     return (
        <div className="bg-gradient-to-br from-white to-sky-100 p-6 rounded-xl shadow-lg max-w-2xl mx-auto">
            <h3 className="font-bold text-slate-800 text-lg mb-4 pb-3 border-b border-slate-200">{dayWorklets.length} item(s) scheduled</h3>
            <div className="space-y-3">
                {dayWorklets.length > 0 ? dayWorklets.map(item => (
                    <WorkletItem key={item.worklet.id + item.dateKey} worklet={item.worklet} onClick={() => onSelectWorklet(item.worklet)} displaySettings={displaySettings} description={item.description} />
                )) : (
                    <p className="text-center text-slate-500 py-8">Nothing scheduled for this day.</p>
                )}
            </div>
        </div>
     );
  };

  const renderContent = () => {
    switch(view) {
        case 'year': return renderYearView();
        case 'month': return renderMonthView();
        case 'week': return renderWeekView();
        case 'day': return renderDayView();
    }
  }
  
  const parseICSDate = (dateString: string): string => {
    const year = parseInt(dateString.substring(0, 4), 10);
    const month = parseInt(dateString.substring(4, 6), 10) - 1;
    const day = parseInt(dateString.substring(6, 8), 10);

    if (dateString.includes('T')) {
        const hour = parseInt(dateString.substring(9, 11), 10);
        const minute = parseInt(dateString.substring(11, 13), 10);
        const second = parseInt(dateString.substring(13, 15), 10);
        
        if (dateString.endsWith('Z')) {
            return new Date(Date.UTC(year, month, day, hour, minute, second)).toISOString();
        }
        return new Date(year, month, day, hour, minute, second).toISOString();
    }
    return new Date(Date.UTC(year, month, day)).toISOString();
  };
  
  const parseICS = (icsString: string): Event[] => {
    const events: Event[] = [];
    const unfoldedIcsString = icsString.replace(/\r\n[ \t]/g, '');
    const eventBlocks = unfoldedIcsString.split('BEGIN:VEVENT');
    eventBlocks.shift();

    for (const block of eventBlocks) {
        const lines = block.split(/\r\n|\n|\r/).filter(line => line.includes(':'));
        const eventData: any = {};
        
        lines.forEach(line => {
            const [key, ...valueParts] = line.split(':');
            const value = valueParts.join(':');
            const keyParts = key.split(';');
            const mainKey = keyParts[0].toUpperCase();

            if (mainKey && value) {
                eventData[mainKey] = value;
            }
        });
        
        const deadlineDateStr = eventData.DTEND || eventData.DTSTART;

        if (eventData.SUMMARY && deadlineDateStr) {
            events.push({
                id: eventData.UID || crypto.randomUUID(),
                type: WorkletType.Event,
                name: eventData.SUMMARY,
                details: eventData.DESCRIPTION || '',
                deadline: parseICSDate(deadlineDateStr),
                location: eventData.LOCATION || '',
                completed: false,
                showCountdown: true,
            });
        }
    }
    return events;
  };
  
  const handleExport = () => {
    const start = new Date(exportStartDate + "T00:00:00Z");
    const end = new Date(exportEndDate + "T23:59:59Z");

    const workletsToExport = worklets.filter(w => {
        const deadline = new Date(w.deadline);
        return deadline >= start && deadline <= end;
    });

    if (workletsToExport.length === 0) {
        alert("No worklets found in the selected date range to export.");
        return;
    }

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
    };

    let icsString = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//GeminiScheduler//NONSGML v1.0//EN',
    ].join('\r\n') + '\r\n';

    workletsToExport.forEach(w => {
        const deadline = new Date(w.deadline);
        const uid = `${w.id}@gemini-scheduler.app`;
        const dtstamp = formatICSDate(new Date());
        const dtstart = formatICSDate(deadline);
        const dtend = formatICSDate(new Date(deadline.getTime() + 60 * 60 * 1000));
        
        const escapeICS = (str: string) => str.replace(/\n/g, '\\n');

        let description = escapeICS(w.details || `Type: ${w.type}`);

        if (w.type === WorkletType.Assignment || w.type === WorkletType.Exam) {
            const detailedWorklet = w as Assignment | Exam;
            description += '\\n\\n--- Subtasks ---\\n';
            detailedWorklet.subtasks.forEach(s => {
                description += `- ${s.name} (Weight: ${s.weight})\\n`;
            });
        }

        const eventLines = [
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `DTSTAMP:${dtstamp}`,
            `DTSTART:${dtstart}`,
            `DTEND:${dtend}`,
            `SUMMARY:${escapeICS(w.name)}`,
            `DESCRIPTION:${description}`,
        ];
        
        eventLines.push('END:VEVENT');
        icsString += eventLines.join('\r\n') + '\r\n';
    });

    icsString += 'END:VCALENDAR';

    const blob = new Blob([icsString], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gemini-scheduler-export.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    closeExportModal();
  };
  const handleImportClick = () => { importInputRef.current?.click(); };
  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target?.result as string;
        try {
            const newEvents = parseICS(text);
            if(newEvents.length > 0) {
              if (window.confirm(`Found ${newEvents.length} event(s) in the file. Do you want to import them?`)) {
                  onImportWorklets(newEvents);
                  alert(`${newEvents.length} event(s) imported successfully.`);
              }
            } else {
              alert("No valid events found in the selected file.");
            }
        } catch (error) {
            console.error("Error parsing ICS file:", error);
            alert(`Could not parse the calendar file. It might be corrupted or in an unsupported format. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };
    reader.readAsText(file);
    if (event.target) {
        event.target.value = '';
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-2">
            <button onClick={() => handleDateChange('prev')} className="p-2 rounded-full hover:bg-sky-100/70 transition-colors">
            <ChevronLeftIcon className="w-6 h-6 text-slate-600" />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 text-center w-48 sm:w-auto">
            {headerTitle}
            </h2>
            <button onClick={() => handleDateChange('next')} className="p-2 rounded-full hover:bg-sky-100/70 transition-colors">
                <ChevronRightIcon className="w-6 h-6 text-slate-600" />
            </button>
            <button onClick={handleJumpToPresent} disabled={isAtPresent} title="Jump to Present" className="p-2 rounded-full hover:bg-sky-100/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <MapPinIcon className="w-5 h-5 text-slate-600" />
            </button>
        </div>

        <ViewSwitcher />
        
        <div className="flex items-center gap-2">
            <input type="file" ref={importInputRef} className="hidden" onChange={handleFileSelected} accept=".ics,text/calendar" />
            <button onClick={handleImportClick} title="Import from Calendar" className="p-2 rounded-full hover:bg-sky-100/70 transition-colors">
                <ArrowDownTrayIcon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
            </button>
            <button onClick={openExportModal} title="Export to Calendar" className="p-2 rounded-full hover:bg-sky-100/70 transition-colors">
                <ArrowUpTrayIcon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" />
            </button>
        </div>
      </div>
      
      <div
        className={`relative transition-opacity duration-300 ${animationClass}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{ minHeight: '60vh' }}
      >
        {renderContent()}
      </div>

      {dayModalInfo && (
        <div className={`fixed inset-0 flex justify-center items-center z-50 ${isDayModalOpen ? 'modal-backdrop-in' : 'modal-backdrop-out'}`} onClick={closeDayModal}>
            <div className={`bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-2xl p-4 sm:p-6 w-full max-w-md mx-4 ${isDayModalOpen ? 'modal-content-in' : 'modal-content-out'}`} onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-slate-900">
                        {dayModalInfo.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone })}
                    </h3>
                    <button onClick={closeDayModal} className="p-1 rounded-full text-slate-500 hover:bg-slate-200"><XMarkIcon /></button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {dayModalInfo.worklets.length > 0 ? (
                        dayModalInfo.worklets.map(item => (
                            <WorkletItem key={item.worklet.id + (item.dateKey || item.worklet.deadline)} worklet={item.worklet} onClick={() => { onSelectWorklet(item.worklet); closeDayModal(); }} displaySettings={displaySettings} description={item.description} />
                        ))
                    ) : (
                        <p className="text-slate-500 text-center py-4">No items scheduled for this day.</p>
                    )}
                </div>
            </div>
        </div>
      )}
      
      {isExportModalOpen && (
         <div className={`fixed inset-0 flex justify-center items-center z-50 modal-backdrop-in`} onClick={closeExportModal}>
            <div className={`bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-2xl p-4 sm:p-6 w-full max-w-md mx-4 modal-content-in`} onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-slate-900 mb-4">Export to Calendar</h3>
                <p className="text-sm text-slate-600 mb-4">Select a date range to export worklets as a downloadable .ics file, which can be imported into most calendar applications.</p>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="export-start" className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                        <input type="date" id="export-start" value={exportStartDate} onChange={e => setExportStartDate(e.target.value)} className="w-full p-2 bg-sky-50/80 border border-slate-300 rounded-md"/>
                    </div>
                     <div>
                        <label htmlFor="export-end" className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                        <input type="date" id="export-end" value={exportEndDate} onChange={e => setExportEndDate(e.target.value)} className="w-full p-2 bg-sky-50/80 border border-slate-300 rounded-md"/>
                    </div>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={closeExportModal} className="px-4 py-2 rounded-md font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                    <button onClick={handleExport} className="px-4 py-2 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">Export</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default CalendarView;