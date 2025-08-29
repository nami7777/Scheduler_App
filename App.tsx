import React, { useState, useEffect, useMemo } from 'react';
import { Worklet, View, Assignment, WorkletType, Event, Routine, Exam, SpeedSession, AppSettings, DisplaySettings, NotificationSettings, Habit, Birthday, DailyTask, DailyWorkload, Material, PrefillWorklet, MaterialType, TimeBlock } from './types.ts';
import Dashboard from './components/Dashboard.tsx';
import CalendarView from './components/CalendarView.tsx';
import AddWorkletView, { AddEventForm, AddBirthdayForm } from './components/AddWorkletView.tsx';
import AddAssignmentView from './components/AddAssignmentView.tsx';
import AddRoutineView from './components/AddRoutineView.tsx';
import PastWorkView from './components/PastWorkView.tsx';
import SpeedCheckView from './components/SpeedCheckView.tsx';
import SettingsView from './components/SettingsView.tsx';
import AnalyticsView from './components/AnalyticsView.tsx';
import HabitsView from './components/HabitsView.tsx';
import ReschedulesView from './components/ReschedulesView.tsx';
import MaterialsView from './components/MaterialsView.tsx';
import PlaygroundView from './components/PlaygroundView.tsx';
import NotebookPlaygroundView from './components/NotebookPlaygroundView.tsx';
import AiAssistantView from './components/AiAssistantView.tsx';
import DailyPlannerView from './components/DailyPlannerView.tsx';
import WorkletDetailModal from './components/WorkletDetailModal.tsx';
import RadialMenu from './components/RadialMenu.tsx';
import Guide from './components/Guide.tsx';
import { guideSteps } from './components/guideSteps.ts';
import { PlusIcon, CalendarIcon, ChartBarIcon, ArchiveBoxIcon, StopwatchIcon, Cog6ToothIcon, ChartPieIcon, StarIcon, ListBulletIcon, DocumentDuplicateIcon, SparklesIcon, ClockIcon } from './components/icons.tsx';
import { getWorkForDate, calculateNextBirthday, generateSubtaskPlan, getDateKey } from './utils.ts';
import { 
    getAllWorklets, saveWorklet as dbSaveWorklet, deleteWorklet as dbDeleteWorklet,
    getAllHabits, saveHabit as dbSaveHabit, deleteHabit as dbDeleteHabit,
    getAllSessions, saveSession as dbSaveSession, deleteSessionsForWorklet as dbDeleteSessionsForWorklet,
    getAllMaterials, saveMaterial as dbSaveMaterial, deleteMaterial as dbDeleteMaterial,
    getAllTimeBlocks, saveTimeBlock as dbSaveTimeBlock, deleteTimeBlock as dbDeleteTimeBlock,
    clearStore, bulkSaveWorklets, bulkSaveHabits, bulkSaveSessions, bulkSaveMaterials, bulkSaveTimeBlocks
} from './db.ts';
import AddHabitView from './components/AddHabitView.tsx';

const SETTINGS_STORAGE_KEY = 'gemini-scheduler-settings-v2';

const defaultSettings: AppSettings = {
    display: {
        timeFormat: '12h',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        autoTimeZone: true,
        mobileNavStyle: 'column',
        showBirthdayWidget: true,
    },
    notifications: {
        morningSummary: { enabled: true, time: "08:00" },
        dueSoonReminder: { enabled: true, minutesBefore: 15 },
        notifyFor: {
            [WorkletType.Assignment]: true,
            [WorkletType.Exam]: true,
            [WorkletType.Event]: true,
            [WorkletType.Routine]: true,
            [WorkletType.Birthday]: true,
        }
    },
};

// --- Main App Component ---
const App: React.FC = () => {
  const [view, setView] = useState<View>(View.Dashboard);
  const [isLoading, setIsLoading] = useState(true);
  
  const [worklets, setWorklets] = useState<Worklet[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [speedSessions, setSpeedSessions] = useState<SpeedSession[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);
  
  const [playgroundArgs, setPlaygroundArgs] = useState<{workletId?: string; dateKey?: string; materialId?: string; returnTo?: View} | null>(null);

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
        const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (savedSettings) {
            const loaded = JSON.parse(savedSettings);
            // Deep merge to ensure all nested properties from default settings exist
             return {
                display: { ...defaultSettings.display, ...(loaded.display || {}) },
                notifications: {
                    ...defaultSettings.notifications,
                    ...(loaded.notifications || {}),
                    morningSummary: { ...defaultSettings.notifications.morningSummary, ...(loaded.notifications?.morningSummary || {}) },
                    dueSoonReminder: { ...defaultSettings.notifications.dueSoonReminder, ...(loaded.notifications?.dueSoonReminder || {}) },
                    notifyFor: { ...defaultSettings.notifications.notifyFor, ...(loaded.notifications?.notifyFor || {}) },
                },
            };
        }
        return defaultSettings;
    } catch (error) {
        console.error("Could not load settings from localStorage", error);
        return defaultSettings;
    }
  });
  
  const [selectedWorklet, setSelectedWorklet] = useState<Worklet | null>(null);
  const [editingWorklet, setEditingWorklet] = useState<Worklet | null>(null);
  const [addingWorkletType, setAddingWorkletType] = useState<WorkletType | null>(null);
  const [prefillData, setPrefillData] = useState<PrefillWorklet | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [habitViewMode, setHabitViewMode] = useState<'list' | 'form'>('list');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGuideModeActive, setIsGuideModeActive] = useState(false);
  const [guideStep, setGuideStep] = useState(0);

  useEffect(() => {
    const loadData = async () => {
        try {
            const [workletsData, habitsData, sessionsData, materialsData, timeBlocksData] = await Promise.all([
                getAllWorklets(),
                getAllHabits(),
                getAllSessions(),
                getAllMaterials(),
                getAllTimeBlocks(),
            ]);

            // Birthday maintenance task
            const todayKey = getDateKey(new Date(), appSettings.display.timeZone);
            const workletsToUpdate: Birthday[] = [];
            
            workletsData.forEach(w => {
              if (w.type === WorkletType.Birthday) {
                if (getDateKey(new Date(w.deadline), appSettings.display.timeZone) < todayKey) {
                  const bDay = w as Birthday;
                  const newDeadline = calculateNextBirthday(bDay.birthMonth, bDay.birthDay);
                  workletsToUpdate.push({ ...bDay, deadline: newDeadline.toISOString() });
                }
              }
            });

            if (workletsToUpdate.length > 0) {
              await Promise.all(workletsToUpdate.map(w => dbSaveWorklet(w)));
              const updatedWorklets = workletsData.map(w => {
                  const updatedVersion = workletsToUpdate.find(u => u.id === w.id);
                  return updatedVersion || w;
              });
              setWorklets(updatedWorklets.sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()));
            } else {
              setWorklets(workletsData.sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()));
            }

            setHabits(habitsData.sort((a, b) => a.name.localeCompare(b.name)));
            setSpeedSessions(sessionsData);
            setMaterials(materialsData);
            setTimeBlocks(timeBlocksData);
        } catch (error) {
            console.error("Failed to load data from IndexedDB", error);
            // Optionally, show an error message to the user
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, []);

  useEffect(() => {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(appSettings));
    } catch (error) {
        console.error("Could not save settings to localStorage", error);
    }
  }, [appSettings]);


  // Advanced Notification Scheduler
  useEffect(() => {
    const sentNotifications = new Set<string>();

    const intervalId = setInterval(() => {
        if (Notification.permission !== 'granted') return;
        
        const { timeZone } = appSettings.display;
        const now = new Date();
        
        // Get work for today based on the user's timezone setting
        const workForToday = getWorkForDate(now, worklets, timeZone);

        // Morning Summary
        if (appSettings.notifications.morningSummary.enabled) {
            // Get current time in the user's selected timezone
            const timeInZone = new Date().toLocaleTimeString('en-GB', { timeZone, hour: '2-digit', minute: '2-digit' });
            
            if (timeInZone === appSettings.notifications.morningSummary.time) {
                const summaryNotificationId = `summary-${getDateKey(now, timeZone)}`;
                if (!sentNotifications.has(summaryNotificationId) && workForToday.length > 0) {
                    const items = workForToday
                        .filter(item => appSettings.notifications.notifyFor[item.worklet.type])
                        .map(item => item.worklet.name)
                        .join(', ');
                    
                    if (items) {
                        new Notification("Today's Agenda", {
                            body: `You have ${workForToday.length} item(s) today: ${items}`,
                            tag: summaryNotificationId
                        });
                        sentNotifications.add(summaryNotificationId);
                    }
                }
            }
        }

        // Due Soon Reminders
        if (appSettings.notifications.dueSoonReminder.enabled) {
            workForToday.forEach(item => {
                if (!appSettings.notifications.notifyFor[item.worklet.type]) return;

                const deadline = new Date(item.worklet.deadline);
                const diffMinutes = (deadline.getTime() - now.getTime()) / (1000 * 60);
                const minutesBefore = appSettings.notifications.dueSoonReminder.minutesBefore;
                
                if (diffMinutes > minutesBefore - 1 && diffMinutes <= minutesBefore) {
                    const uniqueId = `due-${item.worklet.id}-${item.dateKey || ''}`;
                    if (!sentNotifications.has(uniqueId)) {
                        const time = deadline.toLocaleTimeString([], { 
                            hour: '2-digit', minute: '2-digit',
                            hour12: appSettings.display.timeFormat === '12h',
                            timeZone
                        });
                        new Notification(`${item.worklet.name} is due soon!`, {
                            body: `${item.description}\nDue at ${time}`,
                            tag: uniqueId
                        });
                        sentNotifications.add(uniqueId);
                    }
                }
            });
        }

    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [worklets, appSettings]);

  // Guide Mode View Synchronization
  useEffect(() => {
    if (isGuideModeActive) {
        const currentStepData = guideSteps[guideStep];
        if (currentStepData && currentStepData.view !== view) {
            // Need to handle view navigation for the guide
            handleNavigate(currentStepData.view);
        }
        if (currentStepData && currentStepData.preAction) {
            currentStepData.preAction({
                setAddingWorkletType
            });
        }
    }
  }, [isGuideModeActive, guideStep]);


  const handleSaveWorklet = async (worklet: Worklet, newMaterials: Material[] = []) => {
    if (newMaterials.length > 0) {
        await Promise.all(newMaterials.map(mat => dbSaveMaterial(mat)));
        setMaterials(prev => [...prev.filter(m => !newMaterials.find(nm => nm.id === m.id)), ...newMaterials]);
    }
    
    // Auto-schedule time block for assignments/exams
    if (worklet.type === WorkletType.Assignment || worklet.type === WorkletType.Exam) {
        const detailedWorklet = worklet as Assignment | Exam;
        const existingBlock = timeBlocks.find(tb => tb.workletId === detailedWorklet.id && tb.isRecurring);

        if (detailedWorklet.dailyWorkTime) {
            // Create or update a recurring time block
            const daysOfWeek = detailedWorklet.useSpecificWeekdays && detailedWorklet.selectedWeekdays?.length
                ? detailedWorklet.selectedWeekdays 
                : [0, 1, 2, 3, 4, 5, 6];

            const newBlock: TimeBlock = {
                id: existingBlock?.id || crypto.randomUUID(),
                title: detailedWorklet.name,
                startTime: detailedWorklet.dailyWorkTime.start,
                endTime: detailedWorklet.dailyWorkTime.end,
                color: detailedWorklet.color,
                workletId: detailedWorklet.id,
                isRecurring: true,
                daysOfWeek,
                startDate: detailedWorklet.startDate.split('T')[0],
                endDate: new Date(detailedWorklet.deadline).toISOString().split('T')[0],
            };
            await dbSaveTimeBlock(newBlock);
            setTimeBlocks(prev => {
                const index = prev.findIndex(tb => tb.id === newBlock.id);
                if (index > -1) {
                    const newTimeBlocks = [...prev];
                    newTimeBlocks[index] = newBlock;
                    return newTimeBlocks;
                }
                return [...prev, newBlock];
            });
        } else if (existingBlock) {
            // Delete the existing block if the daily time was removed
            await dbDeleteTimeBlock(existingBlock.id);
            setTimeBlocks(prev => prev.filter(tb => tb.id !== existingBlock.id));
        }
    }

    await dbSaveWorklet(worklet);
    setWorklets(prev => {
        const index = prev.findIndex(w => w.id === worklet.id);
        let newWorklets;
        if (index > -1) { // It's an update
            newWorklets = [...prev];
            newWorklets[index] = worklet;
        } else { // It's a new one
            newWorklets = [...prev, worklet];
        }
        return newWorklets.sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    });
    
    // Only navigate if not in playground
    if (view !== View.Playground) {
        setView(View.Dashboard);
        setEditingWorklet(null);
        setAddingWorkletType(null);
        setPrefillData(null);
    }
  };

  const handleSaveMaterial = async (material: Material) => {
    await dbSaveMaterial(material);
    setMaterials(prev => {
        const index = prev.findIndex(m => m.id === material.id);
        if (index > -1) {
            const newMaterials = [...prev];
            newMaterials[index] = material;
            return newMaterials;
        }
        return [...prev, material];
    });
  };
  
  const handleImportWorklets = async (newWorklets: Worklet[]) => {
      await Promise.all(newWorklets.map(w => dbSaveWorklet(w)));
      setWorklets(prev => [...prev, ...newWorklets].sort((a,b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()));
  };

  const handleDeleteWorklet = async (workletId: string) => {
    if (window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
        const workletToDelete = worklets.find(w => w.id === workletId);
        await dbDeleteWorklet(workletId);
        await dbDeleteSessionsForWorklet(workletId);
        if (workletToDelete && (workletToDelete.type === WorkletType.Assignment || workletToDelete.type === WorkletType.Exam)) {
            await Promise.all(workletToDelete.materialIds.map(id => dbDeleteMaterial(id)));
            setMaterials(prev => prev.filter(m => !workletToDelete.materialIds.includes(m.id)));
        }
        setWorklets(prev => prev.filter(w => w.id !== workletId));
        setSpeedSessions(prev => prev.filter(s => s.workletId !== workletId));
        setSelectedWorklet(null); // Close the modal
    }
  }

  const handleRedistribute = async (workletId: string, missedDateKey: string) => {
    const workletToUpdate = worklets.find(w => w.id === workletId) as Assignment | Exam | undefined;
    if (!workletToUpdate || (workletToUpdate.type !== WorkletType.Assignment && workletToUpdate.type !== WorkletType.Exam)) return;

    const missedTaskIndex = workletToUpdate.dailyTasks.findIndex(t => t.date === missedDateKey);
    const missedTask = workletToUpdate.dailyTasks[missedTaskIndex];
    if (!missedTask || missedTask.completed) return;

    // --- Core Redistribution Logic ---
    
    // 1. Calculate total work remaining and work already done
    const tasksFromMissedDayOn = workletToUpdate.dailyTasks.slice(missedTaskIndex);
    const totalRemainingWork = tasksFromMissedDayOn.reduce((sum, task) => sum + task.weightForDay, 0);

    const tasksBeforeMissedDay = workletToUpdate.dailyTasks.slice(0, missedTaskIndex);
    const cumulativeWorkDone = tasksBeforeMissedDay.reduce((sum, task) => sum + task.weightForDay, 0);

    // 2. Find future days to distribute work across
    const futureWorkloadEntries = workletToUpdate.dailyWorkload.filter(wl => 
        new Date(wl.date + 'T00:00:00') > new Date(missedDateKey + 'T00:00:00')
    );

    if (futureWorkloadEntries.length === 0) {
        alert("No future work days available to redistribute to. Please edit the worklet and extend the deadline.");
        return;
    }

    // 3. Create a new proportional workload plan for the future days
    const totalFutureEffortPercentage = futureWorkloadEntries.reduce((sum, wl) => sum + wl.percentage, 0);
    const newFutureWorkload = futureWorkloadEntries.map(wl => ({
        date: wl.date,
        percentage: totalFutureEffortPercentage > 0 
            ? (wl.percentage / totalFutureEffortPercentage) * 100 
            : (100 / futureWorkloadEntries.length) // Fallback for zero-effort days
    }));

    // 4. Generate new daily tasks based on the new plan
    const newFutureTasksUnprefixed = generateSubtaskPlan(
        newFutureWorkload,
        workletToUpdate.subtasks,
        materials,
        workletToUpdate.weightUnit,
        totalRemainingWork,
        cumulativeWorkDone
    );

    const newFutureTasks = newFutureTasksUnprefixed.map(task => ({
        ...task,
        title: `[Catch-up] ${task.title.replace(/^\[(Catch-up|Redistributed)\]\s*/, '')}`
    }));

    // 5. Assemble the final task list
    const finalDailyTasks = [
      ...workletToUpdate.dailyTasks.slice(0, missedTaskIndex),
      {
        ...missedTask,
        title: `[Redistributed] ${missedTask.title.replace(/^\[(Catch-up|Redistributed)\]\s*/, '')}`,
        weightForDay: 0,
      },
      ...newFutureTasks
    ];
    
    // 6. Assemble the final workload list (recalculating all percentages)
    const totalNewWeightInFinalPlan = finalDailyTasks.reduce((sum, task) => sum + task.weightForDay, 0);
    const finalDailyWorkload = workletToUpdate.dailyWorkload.map(wl => {
      const correspondingTask = finalDailyTasks.find(dt => dt.date === wl.date);
      const weight = correspondingTask ? correspondingTask.weightForDay : 0;
      return {
        ...wl,
        percentage: totalNewWeightInFinalPlan > 0 ? (weight / totalNewWeightInFinalPlan) * 100 : 0,
      };
    });

    // 7. Create the updated worklet object with an undo state
    const updatedWorklet: Assignment | Exam = {
      ...workletToUpdate,
      dailyTasks: finalDailyTasks,
      dailyWorkload: finalDailyWorkload,
      undoState: {
        originalDailyTasks: workletToUpdate.dailyTasks,
        originalDailyWorkload: workletToUpdate.dailyWorkload
      }
    };
    
    await handleSaveWorklet(updatedWorklet);
  };

  const handleUndoRedistribution = async (workletId: string) => {
    const workletToUpdate = worklets.find(w => w.id === workletId) as Assignment | Exam | undefined;
    if (!workletToUpdate || !workletToUpdate.undoState) return;

    const restoredWorklet: Assignment | Exam = {
      ...workletToUpdate,
      dailyTasks: workletToUpdate.undoState.originalDailyTasks,
      dailyWorkload: workletToUpdate.undoState.originalDailyWorkload,
    };
    delete restoredWorklet.undoState;

    await handleSaveWorklet(restoredWorklet);
  };

  const handleStartEdit = (worklet: Worklet) => {
    setSelectedWorklet(null); // Close the detail modal
    setAddingWorkletType(null);
    setEditingWorklet(worklet);
    setView(View.AddWorklet);
  }

  const handleSelectWorklet = (worklet: Worklet) => {
    setSelectedWorklet(worklet);
  };

  const handleCloseModal = () => {
    setSelectedWorklet(null);
  };
  
  const handleCancelAddOrEdit = () => {
    setView(View.Dashboard);
    setEditingWorklet(null);
    setAddingWorkletType(null);
    setPrefillData(null);
  }
  
  const handleBackToSelection = () => {
    setAddingWorkletType(null);
    setPrefillData(null);
  };

  const handleNavigate = (targetView: View) => {
    if (targetView === View.AddWorklet) {
        setEditingWorklet(null);
        setAddingWorkletType(null);
        setPrefillData(null);
    }
    if (targetView !== View.Habits) {
        setHabitViewMode('list');
        setEditingHabit(null);
    }
    if (targetView !== View.Playground) {
        setPlaygroundArgs(null);
    }
    setView(targetView);
    setIsMobileMenuOpen(false);
  };
  
  const handleNavigateWithPrefill = (data: PrefillWorklet) => {
      if (!data.type) {
          alert("The AI assistant didn't specify what type of item to create.");
          return;
      }
      setPrefillData(data);
      setEditingWorklet(null);
      setAddingWorkletType(data.type as WorkletType);
      setView(View.AddWorklet);
  };
  
  const handleStudy = (workletId: string, dateKey: string) => {
    setPlaygroundArgs({ workletId, dateKey, returnTo: View.Dashboard });
    setView(View.Playground);
  };

  const handleNavigateToPlayground = (materialId: string) => {
      setPlaygroundArgs({ materialId, returnTo: View.Materials });
      setView(View.Playground);
  }

  const handleToggleCompletion = async (workletId: string, dateKey?: string) => {
      let workletToUpdate: Worklet | undefined;
      const newWorklets = worklets.map(w => {
          if (w.id === workletId) {
              if ((w.type === WorkletType.Assignment || w.type === WorkletType.Exam) && dateKey) {
                  const updatedWorklet = { ...w };
                  updatedWorklet.dailyTasks = updatedWorklet.dailyTasks.map(task => 
                      task.date === dateKey ? { ...task, completed: !task.completed } : task
                  );
                  workletToUpdate = updatedWorklet;
                  return updatedWorklet;
              }
              if (w.type === WorkletType.Routine && dateKey) {
                 const routine = w as Routine;
                 const completedDates = new Set(routine.completedDates);
                 if (completedDates.has(dateKey)) {
                   completedDates.delete(dateKey);
                 } else {
                   completedDates.add(dateKey);
                 }
                 const updatedWorklet = { ...routine, completedDates: Array.from(completedDates) };
                 workletToUpdate = updatedWorklet;
                 return updatedWorklet;
              }
              if (w.type === WorkletType.Event) {
                   const updatedWorklet = { ...w, completed: !w.completed };
                   workletToUpdate = updatedWorklet;
                   return updatedWorklet;
              }
          }
          return w;
      });
      setWorklets(newWorklets);
      if (workletToUpdate) {
        await dbSaveWorklet(workletToUpdate);
      }
  };

  const handleAddSpeedSession = async (session: SpeedSession) => {
    await dbSaveSession(session);
    setSpeedSessions(prev => [...prev, session]);
  }

  const handleSaveHabit = async (habit: Habit) => {
    await dbSaveHabit(habit);
    setHabits(prev => {
        const index = prev.findIndex(h => h.id === habit.id);
        if (index > -1) {
            const newHabits = [...prev];
            newHabits[index] = habit;
            return newHabits;
        }
        return [...prev, habit].sort((a, b) => a.name.localeCompare(b.name));
    });
    setHabitViewMode('list');
    setEditingHabit(null);
  };

  const handleDeleteHabit = async (habitId: string) => {
      if (window.confirm("Are you sure you want to delete this habit? This action cannot be undone.")) {
          await dbDeleteHabit(habitId);
          setHabits(prev => prev.filter(h => h.id !== habitId));
      }
  };

  const handleToggleHabitCompletion = async (habitId: string, dateKey: string) => {
      let habitToUpdate: Habit | undefined;
      const newHabits = habits.map(habit => {
          if (habit.id === habitId) {
              const newCompletions = { ...habit.completions };
              if (newCompletions[dateKey]) {
                  delete newCompletions[dateKey];
              } else {
                  newCompletions[dateKey] = true;
              }
              const updatedHabit = { ...habit, completions: newCompletions };
              habitToUpdate = updatedHabit;
              return updatedHabit;
          }
          return habit;
      });
      setHabits(newHabits);
      if(habitToUpdate) {
          await dbSaveHabit(habitToUpdate);
      }
  };

  const handleStartAddHabit = () => {
    setEditingHabit(null);
    setHabitViewMode('form');
  };

  const handleStartEditHabit = (habit: Habit) => {
    setEditingHabit(habit);
    setHabitViewMode('form');
  };

  const handleCancelAddEditHabit = () => {
    setEditingHabit(null);
    setHabitViewMode('list');
  };

  const handleSaveTimeBlock = async (timeBlock: TimeBlock) => {
    // If the block is linked to an assignment/exam and its color has changed,
    // update the parent worklet as well.
    if (timeBlock.workletId) {
      const workletIndex = worklets.findIndex(w => w.id === timeBlock.workletId);
      if (workletIndex > -1) {
        const worklet = worklets[workletIndex];
        if ((worklet.type === WorkletType.Assignment || worklet.type === WorkletType.Exam) && worklet.color !== timeBlock.color) {
          const updatedWorklet = { ...worklet, color: timeBlock.color };
          await dbSaveWorklet(updatedWorklet);
          
          const newWorklets = [...worklets];
          newWorklets[workletIndex] = updatedWorklet;
          setWorklets(newWorklets); // Update state directly to avoid navigation/sorting side-effects
        }
      }
    }

    await dbSaveTimeBlock(timeBlock);
    setTimeBlocks(prev => {
        const index = prev.findIndex(tb => tb.id === timeBlock.id);
        if (index > -1) {
            const newTimeBlocks = [...prev];
            newTimeBlocks[index] = timeBlock;
            return newTimeBlocks;
        }
        return [...prev, timeBlock];
    });
  };

  const handleDeleteTimeBlock = async (timeBlockId: string) => {
    await dbDeleteTimeBlock(timeBlockId);
    setTimeBlocks(prev => prev.filter(tb => tb.id !== timeBlockId));
  };


    const handleExportData = () => {
        const dataToExport = {
            version: "1.1.0",
            exportDate: new Date().toISOString(),
            data: {
                worklets,
                habits,
                speedSessions,
                settings: appSettings,
                materials,
                timeBlocks,
            }
        };

        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateKey = new Date().toISOString().split('T')[0];
        a.download = `gemini-scheduler-backup-${dateKey}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportData = (file: File, mode: 'replace' | 'merge') => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            try {
                const importedData = JSON.parse(text);
                
                if (!importedData.version || !importedData.data || !importedData.data.worklets || !importedData.data.habits || !importedData.data.speedSessions || !importedData.data.settings) {
                    throw new Error("Invalid or corrupted backup file.");
                }
                
                if (mode === 'replace') {
                    if (!window.confirm("Are you sure you want to replace all current data? This will overwrite EVERYTHING in the app and cannot be undone.")) {
                        return;
                    }

                    setIsLoading(true);

                    // Clear existing data
                    await Promise.all([
                        clearStore('worklets'),
                        clearStore('habits'),
                        clearStore('speed-sessions'),
                        clearStore('materials'),
                        clearStore('time_blocks'),
                    ]);
                    
                    // Save imported data
                    await Promise.all([
                        bulkSaveWorklets(importedData.data.worklets),
                        bulkSaveHabits(importedData.data.habits),
                        bulkSaveSessions(importedData.data.speedSessions),
                        bulkSaveMaterials(importedData.data.materials || []),
                        bulkSaveTimeBlocks(importedData.data.timeBlocks || []),
                    ]);

                } else { // mode === 'merge'
                    if (!window.confirm("Are you sure you want to merge this data with your current data? New items will be added and any conflicting items will be overwritten by the imported file.")) {
                        return;
                    }

                    setIsLoading(true);

                    // No need to clear stores, bulkSave acts as an "upsert"
                    await Promise.all([
                        bulkSaveWorklets(importedData.data.worklets),
                        bulkSaveHabits(importedData.data.habits),
                        bulkSaveSessions(importedData.data.speedSessions),
                        bulkSaveMaterials(importedData.data.materials || []),
                        bulkSaveTimeBlocks(importedData.data.timeBlocks || []),
                    ]);
                }

                // In both cases, the settings from the imported file take precedence.
                localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(importedData.data.settings));

                alert("Import successful! The application will now reload to apply changes.");
                window.location.reload();

            } catch (error) {
                console.error("Error importing data:", error);
                alert(`Failed to import data. Please make sure you are using a valid backup file. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                setIsLoading(false);
            }
        };
        reader.readAsText(file);
    };

    const handleStartGuide = () => {
        setGuideStep(0);
        setIsGuideModeActive(true);
    };

  const renderView = () => {
    switch (view) {
      case View.DailyPlanner:
        return <DailyPlannerView 
            worklets={worklets}
            timeBlocks={timeBlocks}
            onSaveTimeBlock={handleSaveTimeBlock}
            onDeleteTimeBlock={handleDeleteTimeBlock}
            displaySettings={appSettings.display}
        />;
      case View.AiAssistant:
        return <AiAssistantView worklets={worklets} displaySettings={appSettings.display} onNavigateWithPrefill={handleNavigateWithPrefill} />;
      case View.Playground: {
        if (!playgroundArgs) {
          return <div className="p-4">Error: Playground arguments missing.</div>;
        }

        let materialToDisplay: Material | undefined;
        if (playgroundArgs.materialId) {
            materialToDisplay = materials.find(m => m.id === playgroundArgs.materialId);
        } else if (playgroundArgs.workletId && playgroundArgs.dateKey) {
            const worklet = worklets.find(w => w.id === playgroundArgs.workletId) as Assignment | Exam | undefined;
            const task = worklet?.dailyTasks?.find(t => t.date === playgroundArgs.dateKey);
            const materialId = task?.workSegments?.[0]?.materialId;
            if(materialId) {
                materialToDisplay = materials.find(m => m.id === materialId);
            }
        }

        if (!materialToDisplay) {
            return <div className="p-4">Error: Could not find the material to display in the Playground.</div>
        }
        
        const commonProps = {
            ...playgroundArgs,
            worklets,
            materials,
            onBack: () => handleNavigate(playgroundArgs.returnTo || View.Dashboard),
            onSaveWorklet: handleSaveWorklet,
            onSaveMaterial: handleSaveMaterial,
        };

        if (materialToDisplay.type === MaterialType.NOTEBOOK) {
            return <NotebookPlaygroundView {...commonProps} />;
        } else {
            return <PlaygroundView {...commonProps} />;
        }
      }
      case View.Materials:
        return <MaterialsView materials={materials} worklets={worklets} onSaveMaterial={handleSaveMaterial} onDeleteMaterial={dbDeleteMaterial} onNavigateToPlayground={handleNavigateToPlayground} />;
      case View.Habits:
        if (habitViewMode === 'form') {
            return <AddHabitView 
                key={editingHabit?.id || 'add-habit'}
                onSave={handleSaveHabit}
                onCancel={handleCancelAddEditHabit}
                habitToEdit={editingHabit}
            />;
        }
        return <HabitsView 
          key="habits-list"
          habits={habits}
          onStartAdding={handleStartAddHabit}
          onStartEditing={handleStartEditHabit}
          onDeleteHabit={handleDeleteHabit}
          onToggleCompletion={handleToggleHabitCompletion}
          displaySettings={appSettings.display}
        />;
      case View.Calendar:
        return <CalendarView worklets={worklets} onSelectWorklet={handleSelectWorklet} displaySettings={appSettings.display} onImportWorklets={handleImportWorklets} />;
      case View.AddWorklet: {
            const typeToRender = editingWorklet ? editingWorklet.type : addingWorkletType;
            const onCancelForForm = editingWorklet ? handleCancelAddOrEdit : handleBackToSelection;

            if (typeToRender) {
                switch (typeToRender) {
                    case WorkletType.Assignment:
                    case WorkletType.Exam:
                        return <AddAssignmentView 
                                    key={editingWorklet?.id || 'add-assignment-exam'}
                                    onSave={handleSaveWorklet} 
                                    onCancel={onCancelForForm}
                                    workletToEdit={editingWorklet as Assignment | Exam | null} 
                                    workletType={typeToRender} 
                                    prefillData={prefillData}
                                    />;
                    case WorkletType.Routine:
                        return <AddRoutineView 
                                    key={editingWorklet?.id || 'add-routine'}
                                    onSave={handleSaveWorklet} 
                                    onCancel={onCancelForForm}
                                    routineToEdit={editingWorklet as Routine | null} 
                                    prefillData={prefillData}
                                    />;
                    case WorkletType.Birthday:
                        return <AddBirthdayForm 
                                    key={editingWorklet?.id || 'add-birthday'}
                                    onSaveWorklet={handleSaveWorklet} 
                                    onCancel={onCancelForForm}
                                    workletToEdit={editingWorklet as Birthday | null} 
                                    prefillData={prefillData}
                                    />;
                    case WorkletType.Event:
                        return <AddEventForm 
                                    key={'add-event'}
                                    onSaveWorklet={handleSaveWorklet} 
                                    onCancel={onCancelForForm} 
                                    prefillData={prefillData}
                                    />;
                    default:
                        // Fallback for unhandled type, should not be reached
                        return <div key="fallback" onClick={handleCancelAddOrEdit} className="p-8 text-center">Unhandled item type. Click to go back.</div>;
                }
            } else {
                // No type selected and not editing, so show the main selection screen.
                return <AddWorkletView 
                            key="add-selection"
                            onSelectType={setAddingWorkletType}
                            onCancel={handleCancelAddOrEdit} />;
            }
        }
      case View.PastWork:
        return <PastWorkView 
            worklets={worklets} 
            onSelectWorklet={handleSelectWorklet} 
            displaySettings={appSettings.display}
            onRedistribute={handleRedistribute}
            onUndoRedistribute={handleUndoRedistribution}
        />;
      case View.Reschedules:
        return <ReschedulesView 
            worklets={worklets}
            onSelectWorklet={handleSelectWorklet}
            displaySettings={appSettings.display}
            onUndoRedistribute={handleUndoRedistribution}
        />;
      case View.SpeedCheck:
        return <SpeedCheckView worklets={worklets} speedSessions={speedSessions} onAddSession={handleAddSpeedSession} displaySettings={appSettings.display} />;
      case View.Settings:
        return <SettingsView 
            settings={appSettings} 
            onSettingsChange={setAppSettings}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onStartGuide={handleStartGuide}
        />;
      case View.Analytics:
        return <AnalyticsView worklets={worklets} speedSessions={speedSessions} displaySettings={appSettings.display} />;
      case View.Dashboard:
      default:
        return <Dashboard worklets={worklets} onSelectWorklet={handleSelectWorklet} onToggleComplete={handleToggleCompletion} onRedistribute={handleRedistribute} onUndoRedistribute={handleUndoRedistribution} displaySettings={appSettings.display} onStudy={handleStudy}/>;
    }
  };

  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen bg-sky-50">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h1 className="text-2xl font-bold text-slate-700">Loading your scheduler...</h1>
                <p className="text-slate-500">Getting your data ready.</p>
            </div>
        </div>
    );
  }
    
  let animationKey: string = view;
  if (view === View.Habits) {
      animationKey = `${view}-${habitViewMode}`;
  } else if (view === View.AddWorklet) {
      const typeToRender = editingWorklet ? editingWorklet.type : addingWorkletType;
      animationKey = `${view}-${typeToRender || 'selection'}`;
  }


  const NavButton: React.FC<{
    targetView: View;
    icon: React.ReactNode;
    label: string;
    isMobile?: boolean;
    id?: string;
  }> = ({ targetView, icon, label, isMobile, id }) => (
    <button
      id={id}
      onClick={() => handleNavigate(targetView)}
      className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        view === targetView
          ? 'bg-blue-100/80 text-blue-700'
          : 'text-slate-600 hover:bg-sky-100/70'
      } ${isMobile ? 'flex-col' : 'sm:flex-row'}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-sky-100 text-slate-900 transition-colors duration-300">
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex justify-between items-center">
            <button id="guide-logo" onClick={() => handleNavigate(View.Dashboard)} className="text-left">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">
                Scheduler
              </h1>
            </button>
            <div className="hidden sm:flex items-center gap-2">
                <NavButton targetView={View.Dashboard} icon={<ChartBarIcon className="w-5 h-5"/>} label="Dashboard" id="guide-nav-dashboard" />
                <NavButton targetView={View.DailyPlanner} icon={<ClockIcon className="w-5 h-5"/>} label="Daily Planner" id="guide-nav-daily-planner" />
                <NavButton targetView={View.AiAssistant} icon={<SparklesIcon className="w-5 h-5"/>} label="AI Assistant" />
                <NavButton targetView={View.Materials} icon={<DocumentDuplicateIcon className="w-5 h-5"/>} label="Materials" />
                <NavButton targetView={View.Habits} icon={<StarIcon className="w-5 h-5"/>} label="Habits" id="guide-nav-habits"/>
                <NavButton targetView={View.Calendar} icon={<CalendarIcon className="w-5 h-5"/>} label="Calendar" id="guide-nav-calendar" />
                <NavButton targetView={View.PastWork} icon={<ArchiveBoxIcon className="w-5 h-5"/>} label="Past Work" />
                <NavButton targetView={View.Reschedules} icon={<ListBulletIcon className="w-5 h-5"/>} label="Reschedules" />
                <NavButton targetView={View.SpeedCheck} icon={<StopwatchIcon className="w-5 h-5"/>} label="Speed Check" />
                <NavButton targetView={View.Analytics} icon={<ChartPieIcon className="w-5 h-5"/>} label="Progress" id="guide-nav-analytics"/>
                <NavButton targetView={View.Settings} icon={<Cog6ToothIcon className="w-5 h-5"/>} label="Settings" id="guide-nav-settings"/>
                 <button id="guide-nav-add" onClick={() => handleNavigate(View.AddWorklet)} className="ml-4 px-4 py-2 rounded-md text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:to-blue-500 font-semibold transition shadow-sm hover:shadow-md flex items-center gap-2">
                    <PlusIcon className="w-5 h-5"/>
                    <span>Add New</span>
                 </button>
            </div>
        </nav>
        
        {/* Mobile Header Bar */}
        {appSettings.display.mobileNavStyle === 'header' && (
            <div className="sm:hidden border-t border-slate-200/80">
                <div className="px-2 py-1 flex items-center gap-2 overflow-x-auto">
                    <NavButton targetView={View.Dashboard} icon={<ChartBarIcon className="w-5 h-5"/>} label="Dashboard" isMobile />
                    <NavButton targetView={View.DailyPlanner} icon={<ClockIcon className="w-5 h-5"/>} label="Planner" isMobile />
                    <NavButton targetView={View.AiAssistant} icon={<SparklesIcon className="w-5 h-5"/>} label="AI Assistant" isMobile />
                    <NavButton targetView={View.Materials} icon={<DocumentDuplicateIcon className="w-5 h-5"/>} label="Materials" isMobile />
                    <NavButton targetView={View.Habits} icon={<StarIcon className="w-5 h-5"/>} label="Habits" isMobile />
                    <NavButton targetView={View.Calendar} icon={<CalendarIcon className="w-5 h-5"/>} label="Calendar" isMobile />
                    <NavButton targetView={View.PastWork} icon={<ArchiveBoxIcon className="w-5 h-5"/>} label="Past Work" isMobile />
                    <NavButton targetView={View.Reschedules} icon={<ListBulletIcon className="w-5 h-5"/>} label="Reschedules" isMobile />
                    <NavButton targetView={View.SpeedCheck} icon={<StopwatchIcon className="w-5 h-5"/>} label="Speed Check" isMobile />
                    <NavButton targetView={View.Analytics} icon={<ChartPieIcon className="w-5 h-5"/>} label="Progress" isMobile />
                    <NavButton targetView={View.Settings} icon={<Cog6ToothIcon className="w-5 h-5"/>} label="Settings" isMobile />
                </div>
            </div>
        )}
      </header>

      <main className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32`}>
        <div key={animationKey} className="fade-in-up">
            {renderView()}
        </div>
      </main>

      <div className="sm:hidden">
        {appSettings.display.mobileNavStyle === 'column' ? (
          <RadialMenu 
            currentView={view} 
            onNavigate={handleNavigate} 
            isOpen={isMobileMenuOpen}
            setIsOpen={setIsMobileMenuOpen}
          />
        ) : (
          <button
              id="guide-mobile-add-button"
              onClick={() => handleNavigate(View.AddWorklet)}
              className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-lg text-white flex items-center justify-center z-40"
              aria-label="Add new worklet"
          >
              <PlusIcon className="w-8 h-8"/>
          </button>
        )}
      </div>

      {isGuideModeActive && (
          <Guide
              steps={guideSteps}
              currentStepIndex={guideStep}
              setCurrentStepIndex={setGuideStep}
              onExit={() => setIsGuideModeActive(false)}
          />
      )}
      <WorkletDetailModal worklet={selectedWorklet} onClose={handleCloseModal} onDelete={handleDeleteWorklet} onEdit={handleStartEdit} displaySettings={appSettings.display} />
    </div>
  );
};

export default App;