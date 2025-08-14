


import React, { useState, useEffect } from 'react';
import { Worklet, WorkletType, Assignment, DailyTask, Exam, Routine, DisplaySettings, Birthday } from '../types.ts';
import { XMarkIcon, CalendarIcon, TrashIcon, PencilIcon } from './icons.tsx';
import { formatTime, formatDateTime } from '../utils.ts';

interface WorkletDetailModalProps {
  worklet: Worklet | null;
  onClose: () => void;
  onDelete: (workletId: string) => void;
  onEdit: (worklet: Worklet) => void;
  displaySettings: DisplaySettings;
}

const WorkletDetailModal: React.FC<WorkletDetailModalProps> = ({ worklet, onClose, onDelete, onEdit, displaySettings }) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (worklet) {
      setShow(true);
    }
  }, [worklet]);
  
  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 300); // Animation duration must match CSS
  };

  if (!worklet) return null;

  const isDetailedWorklet = worklet.type === WorkletType.Assignment || worklet.type === WorkletType.Exam;
  const isRoutine = worklet.type === WorkletType.Routine;
  const isBirthday = worklet.type === WorkletType.Birthday;
  const customEmojiWorklet = (isRoutine || isBirthday) ? (worklet as Routine | Birthday) : null;

  const renderRoutineDetails = (w: Routine) => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
        <div className="mt-4">
            <h4 className="font-semibold text-slate-700">Weekly Schedule</h4>
            <ul className="mt-2 space-y-2">
            {w.schedule.map(s => {
                const dummyDate = new Date(`1970-01-01T${s.time}`);
                return (
                     <li key={s.dayOfWeek} className="flex justify-between items-center bg-sky-50/70 p-2 rounded-md">
                        <span className="text-slate-700">{daysOfWeek[s.dayOfWeek]}</span>
                        <span className="text-sm font-mono bg-slate-200 px-2 py-0.5 rounded">{formatTime(dummyDate, displaySettings)}</span>
                    </li>
                )
            })}
            </ul>
        </div>
    );
  };
  
  const renderBirthdayDetails = (w: Birthday) => {
      const nextBirthdayDate = new Date(w.deadline);
      const birthDate = new Date(w.birthYear || nextBirthdayDate.getFullYear(), w.birthMonth - 1, w.birthDay);
      let ageInfo = '';
      if (w.birthYear) {
          const age = nextBirthdayDate.getFullYear() - w.birthYear;
          ageInfo = `Turns ${age} on this day.`
      }

      return (
         <div className="mt-4">
            <h4 className="font-semibold text-slate-700">Birthday Info</h4>
             <ul className="mt-2 space-y-2">
                <li className="flex justify-between items-center bg-sky-50/70 p-2 rounded-md">
                    <span className="text-slate-700">Birth Date</span>
                    <span className="text-sm font-medium text-slate-800">{birthDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: w.birthYear ? 'numeric' : undefined })}</span>
                </li>
                 {ageInfo && (
                    <li className="flex justify-between items-center bg-sky-50/70 p-2 rounded-md">
                        <span className="text-slate-700">Upcoming Age</span>
                        <span className="text-sm font-medium text-slate-800">{ageInfo}</span>
                    </li>
                 )}
             </ul>
        </div>
      );
  }

  const renderDetailedWorkletDetails = (w: Assignment | Exam) => (
    <>
      <div className="mt-4">
        <h4 className="font-semibold text-slate-700">Subtasks / Topics</h4>
        <ul className="mt-2 space-y-2">
          {w.subtasks.map(sub => (
            <li key={sub.id} className="flex justify-between items-center bg-sky-50/70 p-2 rounded-md">
              <span className="text-slate-700">{sub.name}</span>
              <span className="text-sm font-mono bg-slate-200 px-2 py-0.5 rounded">Weight: {sub.weight}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <h4 className="font-semibold text-slate-700 flex items-center"><CalendarIcon className="w-5 h-5 mr-2"/>Daily Plan</h4>
        <div className="mt-2 space-y-2">
          {w.dailyTasks.map((task: DailyTask) => (
            <div key={task.date} className="flex items-start text-sm p-2 bg-sky-50/70 rounded-md">
              <span className="font-semibold text-slate-600 w-2/5">{new Date(task.date+'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', timeZone: displaySettings.timeZone })}</span>
              <p className="text-slate-800 w-3/5">{task.title}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className={`fixed inset-0 flex justify-center items-center z-50 ${show ? 'modal-backdrop-in' : 'modal-backdrop-out'}`} onClick={handleClose}>
      <div className={`relative bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-2xl p-4 sm:p-6 w-full max-w-lg mx-4 flex flex-col max-h-[90vh] ${show ? 'modal-content-in' : 'modal-content-out'}`} onClick={e => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-4 right-4 p-1 rounded-full text-slate-500 hover:bg-slate-200 z-10 transition-colors">
          <XMarkIcon />
        </button>
        <div className="flex-grow overflow-y-auto pr-4 -mr-4">
          <div className="flex justify-between items-start pr-8">
            <div>
              <h3 className={`text-2xl ${worklet.type === WorkletType.Exam ? 'font-bold' : 'font-bold'} text-slate-900`}>
                {customEmojiWorklet?.emoji && <span className="mr-2">{customEmojiWorklet.emoji}</span>}
                {worklet.name}
              </h3>
              <span className="text-sm font-semibold text-blue-600 bg-gradient-to-r from-blue-100 to-blue-50 px-2 py-1 rounded-full">{worklet.type}</span>
            </div>
          </div>
          <div className="mt-4 text-slate-600">
            {isDetailedWorklet && <p><strong>Start Date:</strong> {new Date((worklet as Assignment).startDate).toLocaleDateString(undefined, { timeZone: displaySettings.timeZone })}</p>}
            {worklet.type !== WorkletType.Birthday && <p><strong>Deadline:</strong> {formatDateTime(new Date(worklet.deadline), displaySettings)}</p>}
            {isRoutine && <p><strong>Starts:</strong> {new Date((worklet as Routine)!.startDate + 'T00:00:00').toLocaleDateString(undefined, { timeZone: displaySettings.timeZone })}</p>}
            {isRoutine && <p><strong>Ends:</strong> {(worklet as Routine)!.endDate ? new Date((worklet as Routine)!.endDate + 'T00:00:00').toLocaleDateString(undefined, { timeZone: displaySettings.timeZone }) : 'Indefinitely'}</p>}
             {isBirthday && <p><strong>Next Birthday:</strong> {new Date(worklet.deadline).toLocaleDateString(undefined, { timeZone: displaySettings.timeZone, weekday: 'long', month: 'long', day: 'numeric' })}</p>}
          </div>
          <div className="mt-4 prose prose-slate max-w-none">
            <p>{worklet.details}</p>
          </div>
          {isDetailedWorklet && renderDetailedWorkletDetails(worklet as Assignment | Exam)}
          {isRoutine && renderRoutineDetails(worklet as Routine)}
          {isBirthday && renderBirthdayDetails(worklet as Birthday)}
        </div>
        <div className="flex-shrink-0 pt-4 sm:pt-6 mt-4 sm:mt-6 border-t border-slate-200 flex justify-end items-center gap-3">
            {(isDetailedWorklet || isRoutine || isBirthday) && (
                 <button onClick={() => onEdit(worklet)} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-slate-700 bg-gradient-to-r from-slate-100 to-slate-50 hover:to-slate-200 transition-all shadow-sm hover:shadow-md">
                    <PencilIcon className="w-4 h-4" />
                    Edit
                </button>
            )}
            <button onClick={() => onDelete(worklet.id)} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-rose-500 hover:to-red-500 transition-all shadow-sm hover:shadow-md">
                <TrashIcon className="w-4 h-4"/>
                Delete
            </button>
        </div>
      </div>
    </div>
  );
};

export default WorkletDetailModal;