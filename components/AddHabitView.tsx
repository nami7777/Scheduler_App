

import React, { useState, useEffect } from 'react';
import { Habit } from '../types.ts';
import { XMarkIcon } from './icons.tsx';

interface AddHabitViewProps {
  onSave: (habit: Habit) => void;
  onCancel: () => void;
  habitToEdit?: Habit | null;
}

const colorOptions = [
  '#3b82f6', '#ef4444', '#f97316', '#84cc16', 
  '#22c55e', '#14b8a6', '#8b5cf6', '#d946ef',
];

const emojiOptions = ['🏃', '🏋️', '🧘', '📖', '🎨', '🎵', '🧹', '💧', '😊', '📵', '🍎', '📝'];
const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AddHabitView: React.FC<AddHabitViewProps> = ({ onSave, onCancel, habitToEdit }) => {
  const isEditing = !!habitToEdit;

  const [name, setName] = useState(habitToEdit?.name || '');
  const [emoji, setEmoji] = useState(habitToEdit?.emoji || '🏃');
  const [color, setColor] = useState(habitToEdit?.color || colorOptions[4]);
  const [frequencyType, setFrequencyType] = useState(habitToEdit?.frequency.type || 'daily');
  const [selectedWeekdays, setSelectedWeekdays] = useState(habitToEdit?.frequency.days || [1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState(habitToEdit?.startDate || new Date().toISOString().split('T')[0]);
  
  const handleWeekdayToggle = (dayIndex: number) => {
    setSelectedWeekdays(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(dayIndex)) {
            newSelection.delete(dayIndex);
        } else {
            newSelection.add(dayIndex);
        }
        return Array.from(newSelection).sort();
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (frequencyType === 'weekly' && selectedWeekdays.length === 0) {
      alert('Please select at least one day for a weekly habit.');
      return;
    }

    onSave({
      id: habitToEdit?.id || crypto.randomUUID(),
      name,
      emoji,
      color,
      frequency: {
        type: frequencyType as 'daily' | 'weekly',
        days: frequencyType === 'weekly' ? selectedWeekdays : undefined,
      },
      startDate,
      archived: habitToEdit?.archived || false,
      completions: habitToEdit?.completions || {},
    });
  };

  const inputClasses = "w-full p-2 bg-sky-50/80 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900 placeholder:text-slate-400";

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
       <div className="py-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent text-center truncate">{name || (isEditing ? 'Edit Habit' : 'New Habit')}</h1>
      </div>

      <form id="add-habit-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="p-4 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm space-y-4">
          <h2 className="text-xl font-semibold text-slate-800">Habit Details</h2>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className={inputClasses} required placeholder="e.g., Drink 8 glasses of water"/>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Icon</label>
              <div className="flex flex-wrap gap-2">
                {emojiOptions.map(em => (
                  <button key={em} type="button" onClick={() => setEmoji(em)} className={`text-2xl p-2 rounded-lg transition transform hover:scale-110 ${emoji === em ? 'bg-blue-200' : 'bg-slate-200/80'}`}>{em}</button>
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
        </div>

        <div className="p-4 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">Frequency</h2>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="frequency" value="daily" checked={frequencyType === 'daily'} onChange={() => setFrequencyType('daily')} className="h-4 w-4 text-blue-600 focus:ring-blue-500"/>
                    <span className="font-medium text-slate-700">Daily</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="frequency" value="weekly" checked={frequencyType === 'weekly'} onChange={() => setFrequencyType('weekly')} className="h-4 w-4 text-blue-600 focus:ring-blue-500"/>
                    <span className="font-medium text-slate-700">Specific Days</span>
                </label>
            </div>
            {frequencyType === 'weekly' && (
                <div className="pl-2 pt-2 flex flex-wrap gap-2">
                    {weekdays.map((day, index) => (
                        <button 
                            key={day} 
                            type="button" 
                            onClick={() => handleWeekdayToggle(index)}
                            className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedWeekdays.includes(index) ? 'bg-blue-600 text-white font-semibold' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            )}
        </div>

        <div className="p-4 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">Start Date</h2>
             <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 mb-1">When should this habit start?</label>
              <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClasses} required />
            </div>
        </div>
      </form>
      
      {/* Spacer to prevent overlap with fixed action bar */}
      <div className="h-24" />

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
              form="add-habit-form"
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

export default AddHabitView;