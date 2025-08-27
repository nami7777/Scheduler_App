

import React, { useState, useEffect, useRef } from 'react';
import { Worklet, WorkletType, Event, Birthday, PrefillWorklet } from '../types.ts';
import { calculateNextBirthday } from '../utils.ts';
import { XMarkIcon } from './icons.tsx';

// --- Extracted Form Components ---

const colorOptions = [
  '#3b82f6', '#ef4444', '#f97316', '#84cc16', 
  '#22c55e', '#14b8a6', '#8b5cf6', '#d946ef',
];
const emojiOptions = ['🎂', '🥳', '🎁', '🎈', '🎉', '🍰', '⭐'];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const AddEventForm: React.FC<{
    onSaveWorklet: (worklet: Event) => void;
    onCancel: () => void;
    prefillData?: PrefillWorklet | null;
}> = ({ onSaveWorklet, onCancel, prefillData }) => {
    const [name, setName] = useState(prefillData?.name || '');
    const [deadline, setDeadline] = useState(prefillData?.deadline ? new Date(prefillData.deadline).toISOString().slice(0, 16) : '');
    const [details, setDetails] = useState(prefillData?.details || '');
    const [showCountdown, setShowCountdown] = useState<boolean>(prefillData?.showCountdown || false);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSaveWorklet({ 
            id: crypto.randomUUID(), 
            name, 
            details, 
            deadline: new Date(deadline).toISOString(),
            type: WorkletType.Event, 
            location: '', 
            completed: false,
            showCountdown,
        });
    };
    
    const inputClasses = "w-full p-2 bg-sky-50/80 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900 placeholder:text-slate-400";

    return (
         <div className="p-4 sm:p-6 max-w-lg mx-auto">
             <div className="py-4 mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent text-center truncate">{name || 'New Event'}</h1>
            </div>
            <form id="add-event-form" onSubmit={handleSubmit} className="space-y-6">
                 <div className="p-4 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm space-y-4">
                     <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className={inputClasses} required />
                    </div>
                    <div>
                        <label htmlFor="deadline" className="block text-sm font-medium text-slate-700 mb-1">Date & Time</label>
                        <input type="datetime-local" id="deadline" value={deadline} onChange={e => setDeadline(e.target.value)} className={inputClasses} required />
                    </div>
                    <div>
                        <label htmlFor="details" className="block text-sm font-medium text-slate-700 mb-1">Details</label>
                        <textarea id="details" value={details} onChange={e => setDetails(e.target.value)} rows={4} className={inputClasses}></textarea>
                    </div>
                    <div>
                         <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={showCountdown} onChange={e => setShowCountdown(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                            <span className="text-sm font-medium text-slate-700">Show a live countdown for this item</span>
                        </label>
                    </div>
                 </div>
            </form>

            {/* Spacer to prevent overlap with fixed action bar */}
            <div className="h-24" />

            {/* Action Bar */}
            <div className="fixed bottom-6 left-0 right-0 z-40">
              <div className="max-w-lg mx-auto flex justify-center items-center gap-3 py-2 px-4 sm:px-6">
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
                    form="add-event-form"
                    className="px-8 py-3 rounded-full text-white font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:to-blue-600 backdrop-blur-lg border border-white/10 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:shadow-none transition-all duration-300 ease-in-out text-base"
                    disabled={!name || !deadline}>Save</button>
              </div>
            </div>
        </div>
    );
}

export const AddBirthdayForm: React.FC<{
    onSaveWorklet: (worklet: Birthday) => void;
    onCancel: () => void;
    workletToEdit?: Birthday | null;
    prefillData?: PrefillWorklet | null;
}> = ({ onSaveWorklet, onCancel, workletToEdit, prefillData }) => {
    const isEditing = !!workletToEdit;
    const initialData = workletToEdit || prefillData;
    
    const [name, setName] = useState(initialData?.name || '');
    const [details, setDetails] = useState(initialData?.details || '');
    const [birthMonth, setBirthMonth] = useState(initialData?.birthMonth || 1);
    const [birthDay, setBirthDay] = useState(initialData?.birthDay || 1);
    const [birthYear, setBirthYear] = useState(initialData?.birthYear || '');
    const [emoji, setEmoji] = useState(initialData?.emoji || '🎂');
    const [color, setColor] = useState(initialData?.color || colorOptions[1]);
    const [showCountdown, setShowCountdown] = useState<boolean>(initialData?.showCountdown ?? true);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const nextDeadline = calculateNextBirthday(birthMonth, birthDay);
        
        onSaveWorklet({
            id: workletToEdit?.id || crypto.randomUUID(),
            type: WorkletType.Birthday,
            name,
            details,
            deadline: nextDeadline.toISOString(),
            birthMonth,
            birthDay,
            birthYear: birthYear ? Number(birthYear) : undefined,
            emoji,
            color,
            showCountdown,
        });
    };

    const inputClasses = "w-full p-2 bg-sky-50/80 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900 placeholder:text-slate-400";
    
    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
            <div className="py-4 mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent text-center truncate">{name || (isEditing ? 'Edit Birthday' : 'New Birthday')}</h1>
            </div>
             <form id="add-birthday-form" onSubmit={handleSubmit} className="space-y-6">
                 <div className="p-4 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm space-y-4">
                    <h2 className="text-xl font-semibold text-slate-800">Birthday Details</h2>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className={inputClasses} required />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="birthMonth" className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                            <select id="birthMonth" value={birthMonth} onChange={e => setBirthMonth(Number(e.target.value))} className={inputClasses}>
                                {monthNames.map((month, index) => (
                                    <option key={month} value={index + 1}>{month}</option>
                                ))}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="birthDay" className="block text-sm font-medium text-slate-700 mb-1">Day</label>
                            <input type="number" id="birthDay" value={birthDay} onChange={e => setBirthDay(Number(e.target.value))} min="1" max="31" className={inputClasses} required onFocus={e => e.target.select()} />
                        </div>
                         <div>
                            <label htmlFor="birthYear" className="block text-sm font-medium text-slate-700 mb-1">Year (Optional)</label>
                            <input type="number" id="birthYear" value={birthYear} onChange={e => setBirthYear(e.target.value)} min="1900" max={new Date().getFullYear()} className={inputClasses} onFocus={e => e.target.select()} />
                        </div>
                    </div>
                 </div>

                 <div className="p-4 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm space-y-4">
                     <h2 className="text-xl font-semibold text-slate-800">Customization</h2>
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
                        <label htmlFor="details" className="block text-sm font-medium text-slate-700 mb-1">Details / Notes</label>
                        <textarea id="details" value={details} onChange={e => setDetails(e.target.value)} rows={2} className={inputClasses}></textarea>
                    </div>
                     <div>
                         <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input type="checkbox" checked={showCountdown} onChange={e => setShowCountdown(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                            <span className="text-sm font-medium text-slate-700">Show a live countdown for this birthday</span>
                        </label>
                    </div>
                 </div>
             </form>

             {/* Spacer to prevent overlap with fixed action bar */}
             <div className="h-24" />

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
                      form="add-birthday-form"
                      className="px-8 py-3 rounded-full text-white font-bold backdrop-blur-lg border border-white/10 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:shadow-none transition-all duration-300 ease-in-out text-base"
                      style={{ background: `linear-gradient(to right, ${color}, ${color}BF)`}}
                      disabled={!name}
                    >
                      {isEditing ? 'Save Changes' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// --- Main Selection View ---

interface AddWorkletViewProps {
  onSelectType: (type: WorkletType) => void;
  onCancel: () => void;
}

const AddWorkletView: React.FC<AddWorkletViewProps> = ({ onSelectType, onCancel }) => {
  const TypeButton: React.FC<{ type: WorkletType, label: string, icon: string, testId?: string }> = ({ type, label, icon, testId }) => (
    <button onClick={() => onSelectType(type)} data-testid={testId} className="flex flex-col items-center justify-center gap-4 p-6 bg-gradient-to-br from-white to-sky-100/50 rounded-lg shadow-md hover:shadow-xl hover:scale-105 transition-all duration-200 text-center border border-slate-200/50">
        <span className="text-5xl">{icon}</span>
        <span className="text-xl font-bold text-slate-800">{label}</span>
    </button>
  );

  return (
    <div className="p-4 sm:p-6">
        <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-2">What would you like to schedule?</h1>
            <p className="text-lg text-slate-600">Choose a category to get started.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <TypeButton type={WorkletType.Assignment} label="Assignment" icon="📝" testId="add-worklet-assignment" />
            <TypeButton type={WorkletType.Exam} label="Exam" icon="📄" />
            <TypeButton type={WorkletType.Event} label="Event" icon="🎉" />
            <TypeButton type={WorkletType.Routine} label="Routine" icon="🔁" />
            <TypeButton type={WorkletType.Birthday} label="Birthday" icon="🎂" />
        </div>
        <div className="text-center mt-12">
            <button type="button" onClick={onCancel} className="px-6 py-2 rounded-md font-semibold transition bg-gradient-to-r text-slate-800 from-slate-100 to-slate-50 hover:to-slate-200 shadow-sm hover:shadow-md">Cancel</button>
        </div>
    </div>
  );
};

export default AddWorkletView;