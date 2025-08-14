import React, { useMemo } from 'react';
import { Worklet, WorkletType, Assignment, Exam, DisplaySettings } from '../types.ts';
import WorkletItem from './WorkletItem.tsx';
import { ArrowUturnLeftIcon } from './icons.tsx';

interface ReschedulesViewProps {
  worklets: Worklet[];
  onSelectWorklet: (worklet: Worklet) => void;
  displaySettings: DisplaySettings;
  onUndoRedistribute: (workletId: string) => void;
}

const ReschedulesView: React.FC<ReschedulesViewProps> = ({ worklets, onSelectWorklet, displaySettings, onUndoRedistribute }) => {
  const rescheduledWorklets = useMemo(() => {
    return worklets.filter((w): w is Assignment | Exam => 
        (w.type === WorkletType.Assignment || w.type === WorkletType.Exam) && !!w.undoState
    );
  }, [worklets]);

  const handleUndoClick = (e: React.MouseEvent, workletId: string) => {
    e.stopPropagation();
    onUndoRedistribute(workletId);
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent mb-6">Rescheduled Work</h1>
      <p className="text-lg text-slate-600 mb-8">These worklets contain tasks that were missed and have been redistributed into your future schedule. You can undo this action if needed.</p>

      {rescheduledWorklets.length > 0 ? (
        <div className="space-y-4 max-w-3xl mx-auto">
          {rescheduledWorklets.map(worklet => (
            <div key={worklet.id} className="flex items-center gap-2">
              <button 
                  onClick={(e) => handleUndoClick(e, worklet.id)}
                  title="Undo redistribution" 
                  className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-blue-600 transition-colors flex-shrink-0"
                  aria-label="Undo redistribution"
              >
                  <ArrowUturnLeftIcon className="w-5 h-5" />
              </button>
              <div className="flex-grow">
                <WorkletItem 
                  worklet={worklet}
                  onClick={() => onSelectWorklet(worklet)}
                  displaySettings={displaySettings}
                  onUndoRedistribute={onUndoRedistribute}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 bg-gradient-to-br from-sky-50 to-white/50 rounded-lg shadow-inner mt-8">
          <p className="text-lg text-slate-500">No rescheduled work found.</p>
          <p className="text-sm text-slate-400 mt-2">When you redistribute a missed task from the dashboard, the parent worklet will appear here.</p>
        </div>
      )}
    </div>
  );
};

export default ReschedulesView;
