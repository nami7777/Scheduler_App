import React, { useState, useMemo, useEffect } from 'react';
import { Worklet, TimeBlock, DisplaySettings, DailyWorkItem, WorkletType, Assignment, Exam } from '../types.ts';
import { getWorkForDate, getDateKey, formatTime } from '../utils.ts';
import { PlusIcon, XMarkIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon } from './icons.tsx';

// --- Helper Functions ---
const parseTimeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const formatHour = (hour: number, timeFormat: '12h' | '24h'): string => {
    const d = new Date();
    d.setHours(hour, 0);
    return formatTime(d, { timeFormat } as DisplaySettings);
};

// Color options for custom blocks
const colorOptions = [
  '#64748b', '#ef4444', '#f97316', '#84cc16', 
  '#22c55e', '#14b8a6', '#8b5cf6', '#d946ef',
];
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// --- Sub-components ---

interface TimeBlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (block: TimeBlock) => void;
    onDelete?: (blockId: string) => void;
    blockToEdit?: TimeBlock | null;
    prefillWorklet?: DailyWorkItem | null;
    date: string;
    worklets: Worklet[];
}

const TimeBlockModal: React.FC<TimeBlockModalProps> = ({ isOpen, onClose, onSave, onDelete, blockToEdit, prefillWorklet, date, worklets }) => {
    const isEditing = !!blockToEdit;
    const isWorklet = !!prefillWorklet || (isEditing && !!blockToEdit.workletId);

    const [title, setTitle] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [color, setColor] = useState(colorOptions[0]);
    const [isRecurring, setIsRecurring] = useState(false);
    const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
    const [endDate, setEndDate] = useState('');
    const [isIndefinite, setIsIndefinite] = useState(true);

    const workletForBlock = useMemo(() => {
        if (prefillWorklet) return prefillWorklet.worklet;
        if (blockToEdit?.workletId) {
            return worklets.find(w => w.id === blockToEdit.workletId);
        }
        return null;
    }, [prefillWorklet, blockToEdit, worklets]);
    
    const canChangeColor = !isWorklet || (workletForBlock?.type === WorkletType.Assignment || workletForBlock?.type === WorkletType.Exam);
    
    useEffect(() => {
        if (isOpen) {
            setTitle(blockToEdit?.title || prefillWorklet?.worklet.name || '');
            setStartTime(blockToEdit?.startTime || '09:00');
            setEndTime(blockToEdit?.endTime || '10:00');
            setColor(blockToEdit?.color || (workletForBlock as (Assignment | Exam))?.color || colorOptions[0]);
            setIsRecurring(blockToEdit?.isRecurring || false);
            setDaysOfWeek(blockToEdit?.daysOfWeek || []);
            setEndDate(blockToEdit?.endDate || '');
            setIsIndefinite(blockToEdit ? blockToEdit.endDate === null : true);
        }
    }, [isOpen, blockToEdit, prefillWorklet, workletForBlock]);

    const handleDayToggle = (dayIndex: number) => {
        setDaysOfWeek(prev => {
            const newDays = new Set(prev);
            if (newDays.has(dayIndex)) newDays.delete(dayIndex);
            else newDays.add(dayIndex);
            return Array.from(newDays).sort();
        });
    };

    const handleSave = () => {
        if (!title.trim() || !startTime || !endTime || parseTimeToMinutes(startTime) >= parseTimeToMinutes(endTime)) {
            alert('Please fill in a valid title and time range.');
            return;
        }
        if (isRecurring && daysOfWeek.length === 0) {
            alert('Please select at least one day for a recurring block.');
            return;
        }

        onSave({
            id: blockToEdit?.id || crypto.randomUUID(),
            title,
            startTime,
            endTime,
            color,
            isRecurring,
            daysOfWeek: isRecurring ? daysOfWeek : undefined,
            date: isRecurring ? undefined : date,
            startDate: isRecurring ? (blockToEdit?.startDate || date) : undefined,
            endDate: isRecurring ? (isIndefinite ? null : endDate) : undefined,
            workletId: blockToEdit?.workletId || prefillWorklet?.worklet.id,
            dailyWorkItemDateKey: blockToEdit?.dailyWorkItemDateKey || prefillWorklet?.dateKey,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex justify-center items-center z-50 modal-backdrop-in" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md mx-4 modal-content-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-slate-900 mb-4">{isEditing ? 'Edit Block' : (isWorklet ? 'Schedule Task' : 'Add Time Block')}</h3>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="block-title" className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input id="block-title" type="text" value={title} onChange={e => setTitle(e.target.value)} disabled={isWorklet} className="w-full p-2 bg-sky-50/80 border border-slate-300 rounded-md disabled:bg-slate-200" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start-time" className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                            <input id="start-time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-2 bg-sky-50/80 border border-slate-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="end-time" className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                            <input id="end-time" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-2 bg-sky-50/80 border border-slate-300 rounded-md" />
                        </div>
                    </div>

                    {canChangeColor && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                            <div className="flex flex-wrap gap-2">
                                {colorOptions.map(c => <button key={c} type="button" onClick={() => setColor(c)} style={{ backgroundColor: c }} className={`w-8 h-8 rounded-full transition transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-current' : ''}`} />)}
                            </div>
                        </div>
                    )}

                    {!isWorklet && (
                        <div>
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm font-medium text-slate-700">Repeat on specific days</span>
                            </label>
                            {isRecurring && (
                                <div className="pl-6 pt-2 space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        {weekdays.map((day, index) => (
                                            <button key={day} type="button" onClick={() => handleDayToggle(index)} className={`px-3 py-1 text-sm rounded-full transition-colors ${daysOfWeek.includes(index) ? 'bg-blue-600 text-white font-semibold' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end pt-2">
                                        <div>
                                            <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                            <input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={date} className="w-full p-2 bg-sky-50/80 border border-slate-300 rounded-md disabled:opacity-50" disabled={isIndefinite} />
                                        </div>
                                        <label className="flex items-center gap-2 cursor-pointer select-none pb-2">
                                           <input type="checkbox" checked={isIndefinite} onChange={() => setIsIndefinite(prev => !prev)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                                           <span className="text-sm font-medium text-slate-700">Continues indefinitely</span>
                                       </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex justify-between items-center mt-6">
                    <div>
                        {isEditing && onDelete && <button onClick={() => { onDelete(blockToEdit.id); onClose(); }} className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button>}
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-4 py-2 rounded-md font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                        <button onClick={handleSave} className="px-4 py-2 rounded-md font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors">Save</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main View ---

interface DailyPlannerViewProps {
    worklets: Worklet[];
    timeBlocks: TimeBlock[];
    onSaveTimeBlock: (timeBlock: TimeBlock) => void;
    onDeleteTimeBlock: (timeBlockId: string) => void;
    displaySettings: DisplaySettings;
}

const DailyPlannerView: React.FC<DailyPlannerViewProps> = ({ worklets, timeBlocks, onSaveTimeBlock, onDeleteTimeBlock, displaySettings }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [modalState, setModalState] = useState<{ isOpen: boolean; blockToEdit?: TimeBlock | null; prefillWorklet?: DailyWorkItem | null }>({ isOpen: false });

    const handleDateChange = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            setSelectedDate(new Date());
            return;
        }
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        setSelectedDate(newDate);
    };
    
    const formatDateHeader = (date: Date): string => {
        const today = new Date();
        const todayKey = getDateKey(today, displaySettings.timeZone);
        const dateKey = getDateKey(date, displaySettings.timeZone);

        if (dateKey === todayKey) {
            return `Today (${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`;
        }
        
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        if (dateKey === getDateKey(tomorrow, displaySettings.timeZone)) {
            return `Tomorrow (${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`;
        }

        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (dateKey === getDateKey(yesterday, displaySettings.timeZone)) {
            return `Yesterday (${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})`;
        }
        
        return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    };

    const selectedDateKey = useMemo(() => getDateKey(selectedDate, displaySettings.timeZone), [selectedDate, displaySettings.timeZone]);
    const selectedDayOfWeek = useMemo(() => selectedDate.getDay(), [selectedDate]);

    const workForDay = useMemo(() => getWorkForDate(selectedDate, worklets, displaySettings.timeZone), [selectedDate, worklets, displaySettings.timeZone]);

    const timeBlocksForDay = useMemo(() => {
        return timeBlocks.filter(block => {
            if (block.isRecurring) {
                if (!block.daysOfWeek?.includes(selectedDayOfWeek)) return false;
                if (!block.startDate || selectedDateKey < block.startDate) return false;
                if (block.endDate && selectedDateKey > block.endDate) return false;
                return true;
            } else {
                return block.date === selectedDateKey;
            }
        });
    }, [timeBlocks, selectedDateKey, selectedDayOfWeek]);

    const unplannedWorklets = useMemo(() => {
        return workForDay.filter(item => 
            !timeBlocksForDay.some(block => block.workletId === item.worklet.id && (block.dailyWorkItemDateKey ? block.dailyWorkItemDateKey === item.dateKey : true) )
        );
    }, [workForDay, timeBlocksForDay]);

    const pixelsPerHour = 80;

    const laidOutBlocks = useMemo(() => {
        const sortedBlocks = [...timeBlocksForDay].sort((a, b) => {
            const startA = parseTimeToMinutes(a.startTime);
            const startB = parseTimeToMinutes(b.startTime);
            if (startA !== startB) return startA - startB;
            return parseTimeToMinutes(b.endTime) - parseTimeToMinutes(a.endTime);
        });

        const columns: TimeBlock[][] = [];
        const layout: { block: TimeBlock, col: number, numCols: number }[] = [];

        sortedBlocks.forEach(block => {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                const lastInCol = columns[i][columns[i].length - 1];
                if (parseTimeToMinutes(block.startTime) >= parseTimeToMinutes(lastInCol.endTime)) {
                    columns[i].push(block);
                    layout.push({ block, col: i, numCols: 1 });
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                columns.push([block]);
                layout.push({ block, col: columns.length - 1, numCols: 1 });
            }
        });

        // This is a simplified approach; a full calendar algorithm is more complex.
        // For each block, we determine how many other blocks it overlaps with to set column width.
        return layout.map(item => {
            const startM = parseTimeToMinutes(item.block.startTime);
            const endM = parseTimeToMinutes(item.block.endTime);
            
            const overlappingGroup = sortedBlocks.filter(b => {
                const bStart = parseTimeToMinutes(b.startTime);
                const bEnd = parseTimeToMinutes(b.endTime);
                return Math.max(startM, bStart) < Math.min(endM, bEnd);
            });

            // Re-calculate column and total columns for the overlapping group for more accurate rendering
            const groupLayout = [];
            const groupCols: TimeBlock[][] = [];
            overlappingGroup.forEach(b => {
                let p = false;
                for (let i = 0; i < groupCols.length; i++) {
                    const last = groupCols[i][groupCols[i].length - 1];
                    if(parseTimeToMinutes(b.startTime) >= parseTimeToMinutes(last.endTime)) {
                        groupCols[i].push(b);
                        groupLayout.push({ block: b, col: i, numCols: 1 });
                        p = true;
                        break;
                    }
                }
                if (!p) {
                    groupCols.push([b]);
                    groupLayout.push({ block: b, col: groupCols.length - 1, numCols: 1 });
                }
            });

            const currentBlockInGroupLayout = groupLayout.find(l => l.block.id === item.block.id);
            const col = currentBlockInGroupLayout?.col || 0;
            const numCols = groupCols.length || 1;

            return {
                block: item.block,
                layout: {
                    top: (startM / 60) * pixelsPerHour,
                    height: ((endM - startM) / 60) * pixelsPerHour,
                    width: `${100 / numCols}%`,
                    left: `${(100 / numCols) * col}%`,
                }
            };
        });
    }, [timeBlocksForDay]);

    return (
        <div className="p-4 sm:p-6">
            <TimeBlockModal 
                isOpen={modalState.isOpen}
                onClose={() => setModalState({ isOpen: false })}
                onSave={onSaveTimeBlock}
                onDelete={onDeleteTimeBlock}
                blockToEdit={modalState.blockToEdit}
                prefillWorklet={modalState.prefillWorklet}
                date={selectedDateKey}
                worklets={worklets}
            />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                 <div>
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">Daily Planner</h1>
                    <p className="text-lg text-slate-600 mt-1">Plan your day, hour by hour.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => handleDateChange('prev')} className="p-2 rounded-full hover:bg-slate-200 transition-colors" aria-label="Previous day">
                        <ChevronLeftIcon className="w-5 h-5 text-slate-600"/>
                    </button>
                    <div className="text-center">
                        <h2 className="font-bold text-lg text-slate-800">{formatDateHeader(selectedDate)}</h2>
                        <button onClick={() => handleDateChange('today')} className="text-xs font-semibold text-blue-600 hover:underline">
                            Jump to Today
                        </button>
                    </div>
                    <button onClick={() => handleDateChange('next')} className="p-2 rounded-full hover:bg-slate-200 transition-colors" aria-label="Next day">
                        <ChevronRightIcon className="w-5 h-5 text-slate-600"/>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Available Tasks Column */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-xl font-bold text-slate-800">Today's Available Tasks</h2>
                    <button onClick={() => setModalState({ isOpen: true })} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md font-semibold text-slate-700 bg-gradient-to-r from-slate-100 to-slate-50 hover:to-slate-200 shadow-sm hover:shadow-md transition-all">
                        <PlusIcon className="w-5 h-5"/> Add Custom Block
                    </button>
                    <div className="space-y-3">
                        {unplannedWorklets.length > 0 ? unplannedWorklets.map(item => (
                            <div key={item.worklet.id + item.dateKey} className="p-3 bg-white rounded-lg shadow-sm flex items-center gap-3">
                                <div className="flex-grow min-w-0">
                                    <p className="font-semibold text-slate-800 text-sm truncate">{item.worklet.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{item.description}</p>
                                </div>
                                <button onClick={() => setModalState({ isOpen: true, prefillWorklet: item })} className="px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 flex-shrink-0">
                                    Plan
                                </button>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-sm text-slate-400">All tasks planned!</div>
                        )}
                    </div>
                </div>

                {/* Timeline Column */}
                <div className="lg:col-span-2 bg-white/50 rounded-lg shadow-inner h-[70vh] overflow-y-auto">
                    <div className="relative pr-2" style={{ height: `${24 * pixelsPerHour}px`, marginLeft: '5rem' }}>
                        {/* Hour Labels and Grid Lines */}
                        {Array.from({ length: 24 }).map((_, hour) => (
                            <div key={hour} className="absolute left-0 right-0" style={{ top: `${hour * pixelsPerHour}px` }}>
                                <span className="absolute right-full mr-2 -translate-y-1/2 text-xs font-medium text-slate-400" style={{ width: '4.5rem', textAlign: 'right' }}>
                                    {formatHour(hour, displaySettings.timeFormat)}
                                </span>
                                <div className="h-px bg-slate-200"></div>
                            </div>
                        ))}
                        
                        {/* Time Blocks */}
                        {laidOutBlocks.map(({ block, layout }) => {
                            const duration = parseTimeToMinutes(block.endTime) - parseTimeToMinutes(block.startTime);
                            return (
                                <div
                                    key={block.id}
                                    className="absolute p-px"
                                    style={{
                                        top: layout.top,
                                        height: layout.height,
                                        left: layout.left,
                                        width: layout.width,
                                    }}
                                >
                                    <button 
                                        onClick={() => setModalState({isOpen: true, blockToEdit: block })}
                                        style={{ 
                                            backgroundColor: `${block.color}1A`, 
                                            borderColor: block.color,
                                            color: block.color,
                                        }}
                                        className="w-full h-full rounded-lg text-left border-l-4 transition-all hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 flex flex-col justify-start p-2 overflow-hidden"
                                    >
                                        <p className="font-bold text-xs truncate" style={{ color: block.color }}>{block.title}</p>
                                        {duration >= 15 && (
                                            <p className="text-xs opacity-80 mt-1">
                                                {formatTime(new Date(`1970-01-01T${block.startTime}`), displaySettings)} - {formatTime(new Date(`1970-01-01T${block.endTime}`), displaySettings)}
                                            </p>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DailyPlannerView;