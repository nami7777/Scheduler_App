
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Assignment, Subtask, DailyWorkload, WorkletType, DailyTask, Exam, Material, MaterialType, PrefillWorklet } from '../types.ts';
import { TrashIcon, XMarkIcon } from './icons.tsx';
import { generateSubtaskPlan, getYoutubeVideoId } from '../utils.ts';

interface AddDetailedWorkletProps {
  onSave: (worklet: Assignment | Exam, materials: Material[]) => void;
  onCancel: () => void;
  workletToEdit?: Assignment | Exam | null;
  workletType: WorkletType.Assignment | WorkletType.Exam;
  prefillData?: PrefillWorklet | null;
}

const colorOptions = [
  '#3b82f6', // blue-500
  '#ef4444', // red-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
  '#22c55e', // green-500
  '#14b8a6', // teal-500
  '#8b5cf6', // violet-500
  '#d946ef', // fuchsia-500
];

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const AddAssignmentView: React.FC<AddDetailedWorkletProps> = ({ onSave, onCancel, workletToEdit, workletType, prefillData }) => {
  const isEditing = !!workletToEdit;
  const initialData = workletToEdit || prefillData;
  
  const [title, setTitle] = useState(initialData?.name || '');
  const [details, setDetails] = useState(initialData?.details || '');
  const [deadline, setDeadline] = useState(initialData?.deadline ? new Date(initialData.deadline).toISOString().slice(0, 16) : '');
  const [daysBeforeStart, setDaysBeforeStart] = useState<number | ''>('');
  const [workOnDeadlineDay, setWorkOnDeadlineDay] = useState(true);
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [subtasks, setSubtasks] = useState<Subtask[]>(initialData?.subtasks || []);
  
  const [dailyEfforts, setDailyEfforts] = useState<{ date: string; effort: number }[]>([]);
  const [weightUnit, setWeightUnit] = useState(initialData?.weightUnit || (workletType === WorkletType.Exam ? 'topics' : 'pages'));
  const [color, setColor] = useState(initialData?.color || (workletType === WorkletType.Exam ? colorOptions[1] : colorOptions[0]));
  
  const [useSpecificWeekdays, setUseSpecificWeekdays] = useState(initialData?.useSpecificWeekdays || false);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(initialData?.selectedWeekdays || [1,2,3,4,5]);
  const [showCountdown, setShowCountdown] = useState(initialData?.showCountdown || false);
  const [offDays, setOffDays] = useState<Set<string>>(new Set());
  
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);


  useEffect(() => {
    if (workletToEdit) {
      // Note: In a real app, you'd fetch materials from DB using workletToEdit.materialIds
      // For this implementation, we assume they are not loaded on edit, simplifying the logic.
      const end = new Date(workletToEdit.deadline);
      const start = new Date(workletToEdit.startDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const deadlineDayIncluded = workletToEdit.dailyWorkload.some(d => {
          const dl = new Date(workletToEdit.deadline);
          const workloadDate = new Date(d.date + "T00:00:00");
          return workloadDate.getFullYear() === dl.getFullYear() &&
                 workloadDate.getMonth() === dl.getMonth() &&
                 workloadDate.getDate() === dl.getDate();
      });
      
      setWorkOnDeadlineDay(deadlineDayIncluded);
      setDaysBeforeStart(diffDays);
      setSubtasks(workletToEdit.subtasks.map(s => ({ ...s, progress: s.progress || 0 })));

      const totalEffort = workletToEdit.dailyWorkload.reduce((sum, day) => sum + day.percentage, 0);
      if (totalEffort > 0) {
        setDailyEfforts(workletToEdit.dailyWorkload.map(d => ({
          date: d.date,
          effort: d.percentage // Use percentage as a proxy for effort on load
        })));
      }
    }
  }, [workletToEdit]);
  
  const daysUntilDeadline = useMemo(() => {
    if (!deadline) return null;
    const end = new Date(deadline);
    const now = new Date();
    end.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [deadline]);
  
  const activeDailyEfforts = useMemo(() => dailyEfforts.filter(d => !offDays.has(d.date)), [dailyEfforts, offDays]);
  const totalEffort = useMemo(() => activeDailyEfforts.reduce((sum, day) => sum + day.effort, 0), [activeDailyEfforts]);
  
  const { totalWeight, completedWeight, workForPlanning, subtasksForPlanning } = useMemo(() => {
    const subtasksToPlan = subtasks.filter(s => !s.completed);
    const progressOnIncomplete = subtasksToPlan.reduce((sum, s) => sum + s.progress, 0);
    const weightOfIncomplete = subtasksToPlan.reduce((sum, s) => sum + s.weight, 0);

    return {
        totalWeight: subtasks.reduce((sum, task) => sum + task.weight, 0),
        completedWeight: subtasks.reduce((sum, task) => sum + task.progress, 0),
        workForPlanning: weightOfIncomplete - progressOnIncomplete,
        subtasksForPlanning: subtasksToPlan,
    };
  }, [subtasks]);
  
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

  const calculateWorkDays = useCallback(() => {
    if (!deadline) {
      setDailyEfforts([]);
      return;
    }
    setOffDays(new Set()); // Reset off days when schedule changes

    const endDate = new Date(deadline);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (Number(daysBeforeStart) || 0));
    
    const finalWorkDay = new Date(endDate);
    if(!workOnDeadlineDay) {
        finalWorkDay.setDate(finalWorkDay.getDate() - 1);
    }

    let potentialDays = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= finalWorkDay && currentDate <= endDate) {
      potentialDays.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const workDays = useSpecificWeekdays
        ? potentialDays.filter(day => selectedWeekdays.includes(day.getDay()))
        : potentialDays;

    if (workDays.length === 0) {
        setDailyEfforts([]);
        return;
    }
    
    setDailyEfforts(workDays.map(d => {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateString = `${yyyy}-${mm}-${dd}`;
        const existing = dailyEfforts.find(e => e.date === dateString);
        return {
            date: dateString,
            effort: existing?.effort ?? 100,
        };
    }));
  }, [deadline, daysBeforeStart, workOnDeadlineDay, useSpecificWeekdays, selectedWeekdays]); // dailyEfforts intentionally omitted

  useEffect(() => {
    calculateWorkDays();
  }, [calculateWorkDays]);
  
  const handleDaysBeforeStartChange = (value: string) => {
    if (value === '') {
        setDaysBeforeStart('');
        return;
    }
    const val = parseInt(value, 10);
    if (isNaN(val)) {
        return; // Don't update for non-numeric input
    }
    if (daysUntilDeadline !== null && val > daysUntilDeadline) {
      setDaysBeforeStart(daysUntilDeadline);
    } else {
      setDaysBeforeStart(val < 0 ? 0 : val);
    }
  };
  
    const processFile = (file: File): Promise<{ material: Material, subtask: Subtask }> => {
        return new Promise((resolve, reject) => {
            const materialId = crypto.randomUUID();
            let materialType: MaterialType = MaterialType.OTHER;
            let weight = 10; // Default weight
            let unit = 'units';

            if (file.type.startsWith('video/')) materialType = MaterialType.VIDEO;
            if (file.type.startsWith('audio/')) materialType = MaterialType.AUDIO;
            if (file.type === 'application/pdf') materialType = MaterialType.PDF;
            if (file.name.endsWith('.epub')) materialType = MaterialType.EPUB;
            
            const commonMaterial = {
                id: materialId, name: file.name, type: materialType, blob: file, metadata: { size: file.size }
            };
            const commonSubtask = {
                id: crypto.randomUUID(), name: file.name, completed: false, progress: 0, materialId
            };

            if (materialType === MaterialType.VIDEO || materialType === MaterialType.AUDIO) {
                const url = URL.createObjectURL(file);
                const media = document.createElement(materialType === MaterialType.VIDEO ? 'video' : 'audio');
                media.onloadedmetadata = () => {
                    const duration = Math.round(media.duration);
                    resolve({
                        material: { ...commonMaterial, metadata: { ...commonMaterial.metadata, durationSeconds: duration }},
                        subtask: { ...commonSubtask, weight: duration }
                    });
                    setWeightUnit('seconds');
                    URL.revokeObjectURL(url);
                };
                media.onerror = () => {
                     resolve({ material: commonMaterial, subtask: { ...commonSubtask, weight } }); // Fallback
                     URL.revokeObjectURL(url);
                };
                media.src = url;
            } else if (materialType === MaterialType.PDF) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const typedarray = new Uint8Array(e.target!.result as ArrayBuffer);
                        const pdf = await (window as any).pdfjsLib.getDocument({data: typedarray}).promise;
                        resolve({
                            material: { ...commonMaterial, metadata: { ...commonMaterial.metadata, pageCount: pdf.numPages }},
                            subtask: { ...commonSubtask, weight: pdf.numPages }
                        });
                        setWeightUnit('pages');
                    } catch (err) {
                        resolve({ material: commonMaterial, subtask: { ...commonSubtask, weight } }); // Fallback
                    }
                };
                reader.readAsArrayBuffer(file);
            } else { // OTHER, EPUB etc.
                resolve({ material: commonMaterial, subtask: { ...commonSubtask, weight } });
            }
        });
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) return;
        
        setIsProcessingFiles(true);
        const results = await Promise.all(files.map(processFile));
        setMaterials(prev => [...prev, ...results.map(r => r.material)]);
        setSubtasks(prev => [...prev, ...results.map(r => r.subtask)]);
        setIsProcessingFiles(false);
    };

    const handleAddYoutubeLink = () => {
        if (!youtubeUrl.trim()) return;
        const videoId = getYoutubeVideoId(youtubeUrl);
        if (!videoId) {
            alert('Invalid YouTube URL.');
            return;
        }

        const materialId = crypto.randomUUID();
        const material: Material = {
            id: materialId,
            name: `YouTube: ${youtubeUrl}`,
            type: MaterialType.YOUTUBE,
            url: youtubeUrl,
            metadata: { size: 0, durationSeconds: 600 } // Default 10 mins, user should edit
        };
        const subtask: Subtask = {
            id: crypto.randomUUID(),
            name: `Watch: ${youtubeUrl}`,
            weight: 600, // Default 10 mins
            completed: false,
            progress: 0,
            materialId: materialId,
        };
        
        setMaterials(prev => [...prev, material]);
        setSubtasks(prev => [...prev, subtask]);
        setYoutubeUrl('');
    };

    const handleRemoveMaterial = (materialId: string) => {
        setMaterials(prev => prev.filter(m => m.id !== materialId));
        setSubtasks(prev => prev.filter(s => s.materialId !== materialId));
    };


  const handleAddSubtask = () => {
    setSubtasks([...subtasks, { id: crypto.randomUUID(), name: '', weight: 1, completed: false, progress: 0 }]);
  };

  const handleSubtaskFieldChange = (id: string, field: 'name' | 'weight', value: string) => {
    setSubtasks(subtasks.map(s => {
        if (s.id === id) {
            const newWeight = field === 'weight' ? parseInt(value, 10) || 0 : s.weight;
            const newProgress = Math.min(newWeight, s.progress);
            return { ...s, [field]: field === 'weight' ? newWeight : value, progress: newProgress, completed: newProgress >= newWeight };
        }
        return s;
    }));
};

const handleSubtaskCompletionToggle = (id: string) => {
    setSubtasks(subtasks.map(s => {
        if (s.id === id) {
            const isCompleted = !s.completed;
            return { ...s, completed: isCompleted, progress: isCompleted ? s.weight : 0 };
        }
        return s;
    }));
};

const handleSubtaskProgressChange = (id: string, value: string) => {
    setSubtasks(subtasks.map(s => {
        if (s.id === id) {
            const newProgress = Math.max(0, Math.min(s.weight, parseInt(value, 10) || 0));
            return { ...s, progress: newProgress, completed: newProgress >= s.weight };
        }
        return s;
    }));
};

  const handleRemoveSubtask = (id: string) => {
    const subtaskToRemove = subtasks.find(s => s.id === id);
    setSubtasks(subtasks.filter(s => s.id !== id));
    if (subtaskToRemove?.materialId) {
        handleRemoveMaterial(subtaskToRemove.materialId);
    }
  };

  const handleEffortChange = (date: string, newEffort: number) => {
    const val = Math.max(0, newEffort || 0);
    setDailyEfforts(dailyEfforts.map(d => d.date === date ? { ...d, effort: val } : d));
  };

  const distributeEvenly = () => {
    setDailyEfforts(dailyEfforts.map(d => offDays.has(d.date) ? d : { ...d, effort: 100 }));
  };
  
  const handleToggleDayOff = (date: string) => {
    setOffDays(prev => {
        const newSet = new Set(prev);
        if (newSet.has(date)) {
            newSet.delete(date);
        } else {
            newSet.add(date);
        }
        return newSet;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeDailyEfforts.length > 0) {
        if (totalEffort <= 0) {
             alert("Total effort must be greater than zero. Please assign some effort to at least one active day.");
             return;
        }
        if (useSpecificWeekdays && selectedWeekdays.length === 0) {
            alert("Please select at least one weekday to work on.");
            return;
        }
    }

    const endDate = new Date(deadline);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (Number(daysBeforeStart) || 0));
    
    const finalDailyWorkload: DailyWorkload[] = activeDailyEfforts.map(day => ({
        date: day.date,
        percentage: totalEffort > 0 ? (day.effort / totalEffort) * 100 : (100 / (activeDailyEfforts.length || 1)),
    }));

    const finalDailyTasks = generateSubtaskPlan(
      finalDailyWorkload,
      subtasks,
      materials,
      weightUnit
    );

    const workletToSave: Assignment | Exam = {
      id: workletToEdit?.id || (prefillData && prefillData.id) || crypto.randomUUID(),
      type: workletType,
      name: title,
      details,
      deadline: endDate.toISOString(),
      startDate: startDate.toISOString(),
      subtasks,
      materialIds: materials.map(m => m.id),
      dailyWorkload: finalDailyWorkload,
      dailyTasks: finalDailyTasks,
      color,
      weightUnit,
      useSpecificWeekdays,
      selectedWeekdays,
      showCountdown
    };
    
    onSave(workletToSave, materials);
  };

  const inputClasses = "w-full p-2 bg-sky-50/80 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900 placeholder:text-slate-400 disabled:opacity-50 disabled:bg-slate-100";
  const subtaskTitle = workletType === WorkletType.Assignment ? 'Subtasks' : 'Topics / Subjects';
  const addSubtaskText = workletType === WorkletType.Assignment ? '+ Add Subtask' : '+ Add Topic';

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto pb-24">
       <div className="py-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent text-center truncate">{title || (isEditing ? `Edit ${workletType}` : `New ${workletType}`)}</h1>
      </div>

      <form id="add-assignment-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="p-4 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-slate-800">Core Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} className={inputClasses} required />
            </div>
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
              <input type="datetime-local" id="deadline" value={deadline} onChange={e => setDeadline(e.target.value)} className={inputClasses} required />
            </div>
             <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Color Tag</label>
                <div className="flex flex-wrap gap-2">
                    {colorOptions.map(c => (
                        <button key={c} type="button" onClick={() => setColor(c)} style={{backgroundColor: c}} className={`w-8 h-8 rounded-full transition transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-offset-white ring-current' : ''}`}></button>
                    ))}
                </div>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6 items-end">
                <div>
                   <label htmlFor="daysBeforeStart" className="block text-sm font-medium text-slate-700 mb-1">Start working days before deadline?</label>
                    <input
                        type="number"
                        id="daysBeforeStart"
                        value={daysBeforeStart}
                        onChange={e => handleDaysBeforeStartChange(e.target.value)}
                        className={inputClasses}
                        min="0"
                        placeholder={daysUntilDeadline !== null && daysUntilDeadline > 0 ? `Max: ${daysUntilDeadline}` : 'Pick deadline'}
                        onFocus={e => e.target.select()}
                    />
                </div>
                 <label className="flex items-center gap-2 cursor-pointer select-none pb-2">
                    <input type="checkbox" checked={workOnDeadlineDay} onChange={() => setWorkOnDeadlineDay(prev => !prev)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                    <span className="text-sm font-medium text-slate-700">Include deadline day in schedule</span>
                </label>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="details" className="block text-sm font-medium text-slate-700 mb-1">Details</label>
              <textarea id="details" value={details} onChange={e => setDetails(e.target.value)} rows={3} className={inputClasses}></textarea>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">Materials</h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="file-upload" className="w-full text-center px-4 py-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-sky-100/50 hover:border-blue-400 transition block">
                        <span className="text-blue-600 font-semibold">Click to upload files</span>
                        <span className="mt-1 text-sm text-slate-500 block">(PDF, Video, Audio, etc.)</span>
                    </label>
                    <input id="file-upload" type="file" multiple className="hidden" onChange={handleFileChange} />
                </div>
                {isProcessingFiles && <p className="text-sm text-slate-600">Processing files...</p>}
                
                <div className="flex gap-2">
                    <input type="text" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="Paste YouTube link here" className={inputClasses + " flex-grow"} />
                    <button type="button" onClick={handleAddYoutubeLink} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md font-semibold hover:bg-slate-300 transition">Add</button>
                </div>
                
                 {materials.length > 0 && (
                    <ul className="space-y-2 pt-2">
                        {materials.map(mat => (
                            <li key={mat.id} className="flex items-center gap-2 p-2 bg-sky-50/70 rounded-md">
                                <span className="font-semibold text-sm text-slate-600">{mat.type}</span>
                                <span className="flex-grow text-slate-800 text-sm truncate">{mat.name}</span>
                                <button type="button" onClick={() => handleRemoveMaterial(mat.id)} className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors"><XMarkIcon className="w-4 h-4" /></button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
        
        <div className="p-4 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-semibold text-slate-800">{subtaskTitle}</h2>
                 <div>
                    <label htmlFor="weight-unit" className="sr-only">Unit Name</label>
                     <input id="weight-unit" type="text" value={weightUnit} onChange={e => setWeightUnit(e.target.value)} className={`${inputClasses} w-32 text-sm`} title="Unit for weights (e.g., pages, problems)"/>
                 </div>
            </div>
            <div className="space-y-3">
            {subtasks.map((subtask) => (
                 <div key={subtask.id} className="p-3 bg-sky-50/70 rounded-md">
                    <div className="flex items-center gap-3">
                       <input 
                         type="checkbox"
                         id={`subtask-complete-${subtask.id}`}
                         checked={subtask.completed}
                         onChange={() => handleSubtaskCompletionToggle(subtask.id)}
                         className="h-5 w-5 rounded border-slate-400 text-blue-600 focus:ring-blue-500"
                       />
                        <input id={`subtask-name-${subtask.id}`} type="text" placeholder="Title" value={subtask.name} onChange={e => handleSubtaskFieldChange(subtask.id, 'name', e.target.value)} className={`${inputClasses} flex-grow ${subtask.completed ? 'line-through text-slate-500' : ''}`} />
                        <button type="button" onClick={() => handleRemoveSubtask(subtask.id)} className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-full transition-colors"><TrashIcon/></button>
                    </div>
                     <div className="flex items-center gap-2 pl-8 pt-2">
                        <label htmlFor={`subtask-progress-${subtask.id}`} className="text-sm font-medium text-slate-600">Progress:</label>
                        <input
                            id={`subtask-progress-${subtask.id}`}
                            type="number"
                            value={subtask.progress}
                            onChange={(e) => handleSubtaskProgressChange(subtask.id, e.target.value)}
                            className={`${inputClasses} w-20 text-center`}
                            min="0"
                            max={subtask.weight}
                            disabled={subtask.completed}
                            onFocus={e => e.target.select()}
                        />
                        <span className="text-slate-500">/</span>
                         <input
                            id={`subtask-weight-${subtask.id}`}
                            type="number"
                            placeholder="Total"
                            value={subtask.weight}
                            onChange={e => handleSubtaskFieldChange(subtask.id, 'weight', e.target.value)}
                            className={`${inputClasses} w-20 text-center`}
                            min="0"
                            onFocus={e => e.target.select()}
                        />
                         <span className="text-sm text-slate-500">{weightUnit}</span>
                    </div>
                </div>
            ))}
            </div>
            {subtasks.length === 0 && <p className="text-sm text-center py-4 text-slate-500">No {subtaskTitle.toLowerCase()} added. Add them manually or by attaching materials.</p>}
            <button type="button" onClick={handleAddSubtask} className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-800">
                {addSubtaskText}
            </button>
        </div>

        <div className="p-4 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-slate-800 mb-4">Weekly Schedule & Display</h2>
            <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={useSpecificWeekdays} onChange={e => setUseSpecificWeekdays(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                    <span className="text-sm font-medium text-slate-700">Only work on specific days of the week</span>
                </label>
                {useSpecificWeekdays && (
                    <div className="pl-6 flex flex-wrap gap-2">
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
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={showCountdown} onChange={e => setShowCountdown(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"/>
                    <span className="text-sm font-medium text-slate-700">Show a live countdown for this item on the dashboard</span>
                </label>
            </div>
        </div>

        <div className="p-4 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-slate-800">Customize Daily Effort</h2>
                <button type="button" onClick={distributeEvenly} className="px-3 py-1 text-sm font-semibold bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition">Distribute Evenly</button>
            </div>
            <div className="space-y-3">
                {dailyEfforts.length > 0 ? (
                    dailyEfforts.map(({ date, effort }) => {
                        const isOff = offDays.has(date);
                        const workAmount = totalEffort > 0 ? (effort / totalEffort) * workForPlanning : 0;
                        return (
                            <div key={date} className={`p-3 rounded-md flex flex-col sm:flex-row sm:items-center gap-3 ${isOff ? 'bg-slate-200/60' : 'bg-sky-50/70'}`}>
                                <div className="flex-shrink-0 w-full sm:w-32">
                                    <p className={`font-semibold ${isOff ? 'text-slate-500' : 'text-slate-700'}`}>{new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                    {!isOff && <p className="text-xs text-blue-600 font-medium">~ {workAmount.toFixed(1)} {weightUnit}</p>}
                                </div>
                                <div className="flex-grow flex items-center gap-2">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={isOff ? 0 : effort}
                                        onChange={e => handleEffortChange(date, parseInt(e.target.value, 10))}
                                        disabled={isOff}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                                    />
                                    <input
                                        type="number"
                                        value={isOff ? 0 : effort}
                                        onChange={e => handleEffortChange(date, parseInt(e.target.value, 10))}
                                        disabled={isOff}
                                        className={`${inputClasses} w-20 text-center`}
                                    />
                                </div>
                                <button type="button" onClick={() => handleToggleDayOff(date)} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${isOff ? 'bg-green-500 text-white' : 'bg-slate-300 text-slate-700'}`}>
                                    {isOff ? 'Work Day' : 'Day Off'}
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <p className="text-sm text-center py-4 text-slate-500">Set a deadline and start date to plan your work days.</p>
                )}
            </div>
        </div>
      </form>
      
      {/* Action Bar */}
      <div className="fixed bottom-6 left-0 right-0 z-40">
        <div className="max-w-4xl mx-auto flex justify-center items-center gap-3 py-2 px-4 sm:px-6">
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
              form="add-assignment-form"
              className="px-8 py-3 rounded-full text-white font-bold backdrop-blur-lg border border-white/10 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:shadow-none transition-all duration-300 ease-in-out text-base"
              style={{ background: `linear-gradient(to right, ${color}, ${color}BF)`}}
              disabled={!title || !deadline || (activeDailyEfforts.length > 0 && totalEffort <= 0) || (dailyEfforts.length > 0 && activeDailyEfforts.length === 0)}
            >
              {isEditing ? 'Save Changes' : 'Save'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AddAssignmentView;
