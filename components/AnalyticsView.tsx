import React, { useMemo } from 'react';
import { Worklet, SpeedSession, WorkletType, Routine, DisplaySettings } from '../types.ts';
import { getWorkForDate, getDateKey } from '../utils.ts';

interface AnalyticsViewProps {
  worklets: Worklet[];
  speedSessions: SpeedSession[];
  displaySettings: DisplaySettings;
}

const StatCard: React.FC<{ title: string; value: string; description: string }> = ({ title, value, description }) => (
    <div className="bg-white/70 p-6 rounded-lg shadow-sm text-center">
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <p className="text-4xl font-bold text-blue-600 my-2">{value}</p>
        <p className="text-xs text-slate-400">{description}</p>
    </div>
);

const WorkletPieChart: React.FC<{ data: { type: string; count: number; percentage: number }[] }> = ({ data }) => {
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#8b5cf6', '#f97316'];
    const radius = 80;
    const circumference = 2 * Math.PI * radius;

    let accumulatedPercentage = 0;

    return (
        <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-3 text-center">Worklet Distribution</h3>
            <div className="flex justify-center items-center gap-8">
                <svg width="200" height="200" viewBox="0 0 200 200">
                    <circle r={radius} cx="100" cy="100" fill="transparent" stroke="#e2e8f0" strokeWidth="20" />
                    {data.map((slice, index) => {
                        const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`;
                        const strokeDashoffset = -accumulatedPercentage / 100 * circumference;
                        accumulatedPercentage += slice.percentage;

                        return (
                            <circle
                                key={slice.type}
                                r={radius}
                                cx="100"
                                cy="100"
                                fill="transparent"
                                stroke={colors[index % colors.length]}
                                strokeWidth="20"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                transform="rotate(-90 100 100)"
                            />
                        );
                    })}
                </svg>
                <ul className="space-y-2">
                    {data.map((slice, index) => (
                        <li key={slice.type} className="flex items-center text-sm">
                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: colors[index % colors.length] }}></span>
                            <span className="font-semibold text-slate-700">{slice.type}</span>
                            <span className="ml-2 text-slate-500">({slice.count}) - {slice.percentage.toFixed(0)}%</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

const ProductivityTrendChart: React.FC<{ sessions: SpeedSession[] }> = ({ sessions }) => {
     if (sessions.length < 2) {
        return <div className="text-center text-sm text-slate-500 p-8 h-full flex items-center justify-center">Complete at least two Speed Check trials to see your productivity trend.</div>;
    }

    const rates = sessions.map(s => (s.unitsCompleted / (s.timeElapsedSeconds / 60)));
    const maxRate = Math.max(...rates, 0);
    
    const width = Math.max(300, sessions.length * 50);
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };

    const getX = (index: number) => padding.left + (index / (sessions.length - 1)) * (width - padding.left - padding.right);
    const getY = (rate: number) => height - padding.bottom - (rate / (maxRate || 1)) * (height - padding.top - padding.bottom);
    
    const pathData = rates.map((rate, index) => `${index === 0 ? 'M' : 'L'} ${getX(index)} ${getY(rate)}`).join(' ');

    return (
        <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-3 text-center">Productivity Trend</h3>
            <div className="w-full overflow-x-auto">
                <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: `${width}px`}} aria-labelledby="graph-title" role="img">
                    <path d={pathData} fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500" />
                    {rates.map((rate, index) => (
                         <circle key={index} cx={getX(index)} cy={getY(rate)} r="3" fill="currentColor" className="text-green-500"/>
                    ))}
                </svg>
            </div>
        </div>
    );
};

const ActivityHeatmap: React.FC<{ worklets: Worklet[], displaySettings: DisplaySettings }> = ({ worklets, displaySettings }) => {
    const heatmapData = useMemo(() => {
        const counts = new Map<string, number>();
        const today = new Date();
        for (let i = 0; i < 91; i++) { // Approx 3 months
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            const dateKey = getDateKey(date, displaySettings.timeZone);
            const workForDay = getWorkForDate(date, worklets, displaySettings.timeZone).length;
            counts.set(dateKey, workForDay);
        }
        return counts;
    }, [worklets, displaySettings]);

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 90);
    
    const days = [];
    let currentDate = new Date(startDate);
    while (currentDate <= today) {
        days.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const firstDayOffset = startDate.getDay();

    const maxCount = Math.max(...Array.from(heatmapData.values()), 1);

    const getColor = (count: number) => {
        if (count === 0) return 'bg-slate-200/50';
        const opacity = Math.min(1, 0.2 + (count / maxCount) * 0.8);
        return `bg-blue-500`; // Use opacity in style
    };

    return (
         <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-3 text-center">Activity Heatmap (Last 3 Months)</h3>
            <div className="grid grid-cols-7 gap-1 p-4 bg-white/70 rounded-lg shadow-sm">
                {Array.from({ length: firstDayOffset }).map((_, i) => <div key={`empty-${i}`} />)}
                {days.map(day => {
                    const dateKey = getDateKey(day, displaySettings.timeZone);
                    const count = heatmapData.get(dateKey) || 0;
                    return (
                        <div 
                            key={dateKey} 
                            className={`w-full aspect-square rounded ${getColor(count)}`}
                            style={{ opacity: count > 0 ? 0.2 + (count / maxCount) * 0.8 : 1 }}
                            title={`${dateKey}: ${count} item(s)`}
                        />
                    )
                })}
            </div>
        </div>
    );
};

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ worklets, speedSessions, displaySettings }) => {
    
    const stats = useMemo(() => {
        let totalCompletableItems = 0;
        let completedItems = 0;
        const completionsByDay = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat

        worklets.forEach(w => {
            if (w.type === WorkletType.Assignment || w.type === WorkletType.Exam) {
                totalCompletableItems += w.dailyTasks.length;
                w.dailyTasks.forEach(task => {
                    if (task.completed) {
                        completedItems++;
                        const day = new Date(task.date + 'T00:00:00').getDay();
                        completionsByDay[day]++;
                    }
                });
            } else if (w.type === WorkletType.Event) {
                totalCompletableItems += 1;
                if (w.completed) {
                    completedItems++;
                    const day = new Date(w.deadline).getDay();
                    completionsByDay[day]++;
                }
            } else if (w.type === WorkletType.Routine) {
                const routine = w;
                const startDate = new Date(routine.startDate + 'T00:00:00');
                const today = new Date();
                
                let iterDate = new Date(startDate);
                while (iterDate <= today) {
                    const dayOfWeek = iterDate.getDay();
                    if(routine.schedule.some(s => s.dayOfWeek === dayOfWeek)) {
                        totalCompletableItems++;
                    }
                    iterDate.setDate(iterDate.getDate() + 1);
                }
                routine.completedDates.forEach(dateStr => {
                     completedItems++;
                     const day = new Date(dateStr + 'T00:00:00').getDay();
                     completionsByDay[day]++;
                });
            }
        });
        
        const completionRate = totalCompletableItems > 0 ? (completedItems / totalCompletableItems) * 100 : 0;
        const mostProductiveDayIndex = completionsByDay.indexOf(Math.max(...completionsByDay));
        const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        return {
            completionRate: completionRate.toFixed(0) + '%',
            mostProductiveDay: completionsByDay.some(c => c > 0) ? daysOfWeek[mostProductiveDayIndex] : 'N/A'
        };
    }, [worklets]);

    const pieData = useMemo(() => {
        const counts = worklets.reduce((acc, w) => {
            acc[w.type] = (acc[w.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const total = worklets.length;
        if (total === 0) return [];
        
        return Object.entries(counts)
            .map(([type, count]) => ({ type, count, percentage: (count / total) * 100 }))
            .sort((a, b) => b.count - a.count);
    }, [worklets]);

    return (
        <div className="p-4 sm:p-6 space-y-8">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent mb-6">Analytics & Progress</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="Overall Completion Rate" value={stats.completionRate} description="Percentage of all scheduled tasks marked complete." />
                <StatCard title="Most Productive Day" value={stats.mostProductiveDay} description="The day you complete the most tasks." />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div className="bg-white/70 p-6 rounded-lg shadow-sm h-full">
                    {pieData.length > 0 ? <WorkletPieChart data={pieData} /> : <div className="text-center text-sm text-slate-500 p-8 h-full flex items-center justify-center">Add some worklets to see your distribution.</div>}
                </div>
                 <div className="bg-white/70 p-6 rounded-lg shadow-sm h-full">
                    <ProductivityTrendChart sessions={speedSessions} />
                </div>
            </div>

            <div className="bg-white/70 p-6 rounded-lg shadow-sm">
                <ActivityHeatmap worklets={worklets} displaySettings={displaySettings} />
            </div>
        </div>
    );
};

export default AnalyticsView;