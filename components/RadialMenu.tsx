



import React from 'react';
import { View } from '../types.ts';
import { 
    Squares2X2Icon, XMarkIcon, PlusIcon, ChartBarIcon, 
    CalendarIcon, ArchiveBoxIcon, StopwatchIcon, 
    ChartPieIcon, Cog6ToothIcon, StarIcon, ListBulletIcon, DocumentDuplicateIcon, SparklesIcon,
    ClockIcon
} from './icons.tsx';

interface ColumnMenuProps {
    currentView: View;
    onNavigate: (view: View) => void;
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const ColumnMenu: React.FC<ColumnMenuProps> = ({ currentView, onNavigate, isOpen, setIsOpen }) => {

    const menuItems = [
        { view: View.Dashboard, icon: <ChartBarIcon className="w-6 h-6"/>, label: 'Dashboard' },
        { view: View.DailyPlanner, icon: <ClockIcon className="w-6 h-6"/>, label: 'Daily Planner' },
        { view: View.AiAssistant, icon: <SparklesIcon className="w-6 h-6"/>, label: 'AI Assistant' },
        { view: View.Materials, icon: <DocumentDuplicateIcon className="w-6 h-6"/>, label: 'Materials' },
        { view: View.Habits, icon: <StarIcon className="w-6 h-6"/>, label: 'Habits' },
        { view: View.Calendar, icon: <CalendarIcon className="w-6 h-6"/>, label: 'Calendar' },
        { view: View.PastWork, icon: <ArchiveBoxIcon className="w-6 h-6"/>, label: 'Past Work' },
        { view: View.Reschedules, icon: <ListBulletIcon className="w-6 h-6"/>, label: 'Reschedules' },
        { view: View.SpeedCheck, icon: <StopwatchIcon className="w-6 h-6"/>, label: 'Speed Check' },
        { view: View.Analytics, icon: <ChartPieIcon className="w-6 h-6"/>, label: 'Progress' },
        { view: View.Settings, icon: <Cog6ToothIcon className="w-6 h-6"/>, label: 'Settings' },
    ];
    
    const handleNavigation = (view: View) => {
        onNavigate(view);
        setIsOpen(false);
    };

    return (
        <>
            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 z-40 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsOpen(false)}
            ></div>
            
            {/* Centered Menu Wrapper */}
            <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 {/* Animated Panel */}
                 <div 
                    className={`p-4 pt-6 bg-gradient-to-t from-slate-900 to-gray-800 rounded-2xl shadow-2xl w-full max-w-xs transition-all duration-300 ease-in-out ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="space-y-3">
                        {/* Add New Button */}
                        <button 
                            onClick={() => handleNavigation(View.AddWorklet)}
                            style={{ transitionDelay: isOpen ? `100ms` : '0ms' }}
                            className={`w-full flex items-center justify-center gap-3 text-lg font-bold p-4 rounded-xl text-white bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 ease-out ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
                        >
                            <PlusIcon className="w-7 h-7" />
                            <span>Add New</span>
                        </button>

                        <hr className="border-slate-600/50 my-4"/>

                        {/* Navigation Items */}
                        {menuItems.map((item, index) => (
                             <button
                                key={item.view}
                                onClick={() => handleNavigation(item.view)}
                                style={{ transitionDelay: isOpen ? `${150 + index * 50}ms` : '0ms' }}
                                className={`w-full flex items-center gap-4 p-3 rounded-lg text-left text-base font-semibold transition-all duration-300 ease-out ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} ${currentView === item.view ? 'bg-slate-700/80 text-white' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full shadow-lg text-white flex items-center justify-center z-50 transition-all duration-300 ease-in-out hover:scale-110 active:scale-95"
                aria-label={isOpen ? "Close Menu" : "Open Menu"}
            >
                <div className="relative w-8 h-8">
                    {/* Menu Icon */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${isOpen ? 'rotate-45 opacity-0' : 'rotate-0 opacity-100'}`}>
                        <Squares2X2Icon />
                    </div>
                     {/* X (Close) Icon */}
                     <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${isOpen ? 'rotate-0 opacity-100' : '-rotate-45 opacity-0'}`}>
                        <XMarkIcon />
                    </div>
                </div>
            </button>
        </>
    );
};

export default ColumnMenu;