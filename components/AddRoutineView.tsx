





import React, { useState, useEffect } from 'react';
import { Routine, RoutineSchedule, WorkletType } from '../types.ts';
import { XMarkIcon } from './icons.tsx';

interface AddRoutineViewProps {
  onSave: (routine: Routine) => void;
  onCancel: () => void;
  routineToEdit?: Routine | null;
}

const colorOptions = [
  '#3b82f6', '#ef4444', '#f97316', '#84cc16', 
  '#22c55e', '#14b8a6', '#8b5cf6', '#d946ef',
];

const emojiOptions = ['🏃', '🏋️', '🧘', '📖', '🎨', '🎵', '🧹', '🧺', '🍳', '🛒', '💼', '🧑‍💻'];
const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const AddRoutineView: React.FC<AddRoutineViewProps> = ({ onSave, onCancel, routineToEdit }) => {
  const isEditing = !!routineToEdit;

  const [name, setName] = useState(routineToEdit?.name || '');
  const [details, setDetails] = useState(routineToEdit?.details || '');
  const [emoji, setEmoji] = useState(routineToEdit?.emoji || '🏃');
  const [color, setColor] = useState(routineToEdit?.color || colorOptions[4]);
  const [startDate, setStartDate] = useState(routineToEdit?.startDate || new Date().toISOString().split('T')[0]);
  const [isIndefinite, setIsIndefinite] = useState(routineToEdit ? routineToEdit.endDate === null : true);
  const [endDate, setEndDate] = useState(routineToEdit?.endDate || '');
  const [showCountdown, setShowCountdown] = useState(routineToEdit?.showCountdown || false);

  const [schedule, setSchedule] = useState<({enabled: boolean} & RoutineSchedule)[]>(() => {
    const initial = daysOfWeek.map((_, i) => ({ dayOfWeek: i, time: '08:00', enabled: false }));
    if (routineToEdit) {
      routineToEdit.schedule.forEach(s => {
        initial[s.dayOfWeek] = { ...s, enabled: true };
      });
    }
    return initial;
  });

  const handleScheduleChange = (dayIndex: number, field: 'time' | 'enabled', value: string | boolean) => {
    setSchedule(prev => prev.map((s, i) => i === dayIndex ? { ...s, [field]: value } : s));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSchedule = schedule.filter(s => s.enabled).map(({ dayOfWeek, time }) => ({ dayOfWeek, time }));
    
    if (finalSchedule.length === 0) {
      alert('Please select at least one day for the routine.');
      return;
    }

    const finalEndDate = isIndefinite ? null : endDate;
    
    // For sorting and filtering, 'deadline' needs a value. Use end date or a far-future date.
    const deadline = finalEndDate 
        ? new Date(finalEndDate).toISOString() 
        : new Date('2099-12-31').toISOString();

    onSave({
      id: routineToEdit?.id || crypto.randomUUID(),
      type: WorkletType.Routine,
      name,
      details,
      emoji,
      color,
      startDate,
      endDate: finalEndDate,
      schedule: finalSchedule,
      completedDates: routineToEdit?.completedDates || [],
      deadline: deadline,
      showCountdown
    });
  };

  const inputClasses = "w-full p-2 bg-sky-50/80 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900 placeholder:text-slate-400";

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto pb-24">
      <div className="py-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent text-center truncate">{name || (isEditing ? 'Edit Routine' : 'New Routine')}</h1>
      </div>

      <form id="add-routine-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="p-4 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Routine Details</h2>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className={inputClasses} required />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Icon</label>
              <div className="flex flex-wrap gap-2">
                {emojiOptions.map(em => (
                  <button key={em} type="button" onClick={() => setEmoji(em)} className={`text-2xl p-2 rounded-lg transition transform hover:scale-110 ${emoji === em ? 'bg-blue-200' : 'bg-slate-200'}`}>{em}</button>
                ))}
              </div>
            </div>
            <div className="flex-shrink-0">
              <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)} style={{backgroundColor: c}} className={`w-8 h-8 rounded-full transition transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-offset-white ring-current' : ''}`}></button>
                ))}
              </div>
            </div>
          </div>
           <div>
              <label htmlFor="details" className="block text-sm font-medium text-slate-700 mb-1">Details</label>
              <textarea id="details" value={details} onChange={e => setDetails(e.target.value)} rows={2} className={inputClasses}></textarea>
            </div>
        </div>
        
        <div className="p-4 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">Display Options</h2>
             <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={showCountdown} onChange={e => setShowCountdown(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                <span className="text-sm font-medium text-slate-700">Show a live countdown for this routine</span>
            </label>
        </div>

        <div className="p-4 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Duration</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClasses} required />
            </div>
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`${inputClasses} ${isIndefinite ? 'opacity-50' : ''}`} disabled={isIndefinite} min={startDate} />
            </div>
             <div className="md:col-span-2">
                 <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={isIndefinite} onChange={() => setIsIndefinite(prev => !prev)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                    <span className="text-sm font-medium text-slate-700">This routine continues indefinitely</span>
                </label>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Weekly Schedule</h2>
          {schedule.map((day, index) => (
            <div key={index} className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
              <input 
                type="checkbox" 
                checked={day.enabled} 
                onChange={e => handleScheduleChange(index, 'enabled', e.target.checked)}
                id={`day-${index}`}
                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor={`day-${index}`} className={`font-medium transition-colors ${day.enabled ? 'text-slate-800' : 'text-slate-500'}`}>{daysOfWeek[index]}</label>
              <input 
                type="time" 
                value={day.time} 
                onChange={e => handleScheduleChange(index, 'time', e.target.value)}
                disabled={!day.enabled}
                className={`${inputClasses} w-32 ${!day.enabled ? 'opacity-50' : ''}`}
              />
            </div>
          ))}
        </div>
      </form>

      {/* Action Bar */}
      <div className="fixed bottom-6 left-0 right-0 z-40">
        <div className="max-w-2xl mx-auto flex justify-center items-center gap-3 py-2 px-4 sm:px-6">
            <button
              type="button"
              onClick={onCancel}
              className="w-12 h-12 flex items-center justify-center bg-white rounded-full shadow-lg hover:bg-slate-100 transition-all duration-300 ease-in-out"
              aria-label="Cancel"
            >
              <XMarkIcon className="w-7 h-7 text-slate-700" />
            </button>
            <button
              type="submit"
              form="add-routine-form"
              className="px-8 py-3 rounded-full text-white font-bold backdrop-blur-lg border border-white/10 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:shadow-none transition-all duration-300 ease-in-out text-base"
              style={{ background: `linear-gradient(to right, ${color}, ${color}BF)`}}
              disabled={!name || !startDate}
            >
              {isEditing ? 'Save Changes' : 'Save'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AddRoutineView;