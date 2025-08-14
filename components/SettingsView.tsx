

import React, { useMemo, useState, useRef } from 'react';
import { AppSettings, WorkletType, NotificationSettings, DisplaySettings } from '../types.ts';
import { WhatsAppIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, XMarkIcon, QuestionMarkCircleIcon } from './icons.tsx';

interface SettingsViewProps {
    settings: AppSettings;
    onSettingsChange: (settings: AppSettings) => void;
    onExportData: () => void;
    onImportData: (file: File, mode: 'replace' | 'merge') => void;
    onStartGuide: () => void;
}

const ToggleSwitch: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description?: string;
    id: string;
}> = ({ checked, onChange, label, description, id }) => (
    <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <label htmlFor={id} className="font-medium text-slate-900 cursor-pointer pr-4">{label}</label>
          {description && <p className="text-sm text-slate-500 pr-4">{description}</p>}
        </div>
        <button
            type="button"
            id={id}
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`${
                checked ? 'bg-blue-600' : 'bg-slate-300'
            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
        >
            <span
                aria-hidden="true"
                className={`${
                    checked ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);


const SettingsView: React.FC<SettingsViewProps> = ({ settings, onSettingsChange, onExportData, onImportData, onStartGuide }) => {
    const [suggestion, setSuggestion] = useState('');
    const importInputRef = useRef<HTMLInputElement>(null);
    const [fileToImport, setFileToImport] = useState<File | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const timezones = useMemo(() => [
        'UTC', 'GMT',
        'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
        'US/Pacific', 'US/Mountain', 'US/Central', 'US/Eastern',
        'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Dubai', 'Asia/Kolkata',
        'Australia/Sydney', 'Australia/Adelaide', 'Australia/Perth',
        'Africa/Cairo', 'Africa/Nairobi',
        'America/Sao_Paulo', 'America/Mexico_City',
    ].sort(), []);

    const handlePermissionRequest = async () => {
        if (!('Notification' in window)) {
            alert('This browser does not support desktop notification');
            return false;
        }
        if (Notification.permission === 'granted') {
            return true;
        }
        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    };

    const handleSettingsUpdate = (updates: Partial<AppSettings>) => {
        onSettingsChange({
            ...settings,
            ...updates,
            display: { ...settings.display, ...(updates.display || {}) },
            notifications: {
                ...settings.notifications,
                ...(updates.notifications || {}),
                morningSummary: { ...settings.notifications.morningSummary, ...(updates.notifications?.morningSummary || {}) },
                dueSoonReminder: { ...settings.notifications.dueSoonReminder, ...(updates.notifications?.dueSoonReminder || {}) },
                notifyFor: { ...settings.notifications.notifyFor, ...(updates.notifications?.notifyFor || {}) },
            },
        });
    };
    
    const handleNotificationUpdate = async (update: Partial<NotificationSettings>) => {
        let permissionGranted = true;
        // Check if any notification is being enabled
        const isEnablingNotification =
            (update.morningSummary && update.morningSummary.enabled && !settings.notifications.morningSummary.enabled) ||
            (update.dueSoonReminder && update.dueSoonReminder.enabled && !settings.notifications.dueSoonReminder.enabled) ||
            (update.notifyFor && Object.keys(update.notifyFor).some(k => update.notifyFor![k as WorkletType] && !settings.notifications.notifyFor[k as WorkletType]));

        if (isEnablingNotification) {
            permissionGranted = await handlePermissionRequest();
            if (!permissionGranted) {
                alert("You've previously denied notification permissions. Please enable them in your browser settings to use this feature.");
                return; // Don't update settings if permission is denied
            }
        }
        handleSettingsUpdate({ notifications: { ...settings.notifications, ...update }});
    };

    const handleMorningSummaryChange = (updates: Partial<NotificationSettings['morningSummary']>) => {
        handleNotificationUpdate({ morningSummary: { ...settings.notifications.morningSummary, ...updates } });
    };
    
    const handleDueSoonReminderChange = (updates: Partial<NotificationSettings['dueSoonReminder']>) => {
        handleNotificationUpdate({ dueSoonReminder: { ...settings.notifications.dueSoonReminder, ...updates } });
    };

    const handleTypeChange = (type: WorkletType, value: boolean) => {
        handleNotificationUpdate({
            notifyFor: {
                ...settings.notifications.notifyFor,
                [type]: value,
            },
        });
    };

    const handleDisplayUpdate = (updates: Partial<DisplaySettings>) => {
        if (updates.autoTimeZone) {
            updates.timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
        handleSettingsUpdate({ display: { ...settings.display, ...updates } });
    };

    const handleSuggestionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!suggestion.trim()) {
            alert("Please enter a suggestion before sending.");
            return;
        }
        const phoneNumber = "971521728034";
        const message = encodeURIComponent(`Feature Suggestion for Scheduler App:\n\n${suggestion}`);
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        setSuggestion(''); // Clear the textarea after submission
    };

    const handleImportClick = () => {
        importInputRef.current?.click();
    };

    const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileToImport(file);
            setIsImportModalOpen(true);
        }
        if (event.target) {
            event.target.value = '';
        }
    };
    
    const closeImportModal = () => {
        setIsImportModalOpen(false);
        setTimeout(() => setFileToImport(null), 300);
    };

    const handleImportAction = (mode: 'replace' | 'merge') => {
        if (fileToImport) {
            onImportData(fileToImport, mode);
            closeImportModal();
        }
    };


    const CheckboxOption: React.FC<{
        id: string;
        label: string;
        description: string;
        checked: boolean;
        onChange: (checked: boolean) => void;
    }> = ({ id, label, description, checked, onChange }) => (
        <div className="relative flex items-start">
            <div className="flex h-6 items-center">
                <input
                    id={id}
                    type="checkbox"
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
            </div>
            <div className="ml-3 text-sm leading-6">
                <label htmlFor={id} className="font-medium text-slate-900 cursor-pointer">{label}</label>
                <p className="text-slate-500">{description}</p>
            </div>
        </div>
    );
    
    const inputClasses = "p-2 bg-sky-50/80 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";

    return (
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent mb-6">Settings</h1>

            <div className="space-y-8">
                 <div className="p-6 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 border-b border-slate-200 pb-2">Display</h2>
                     <div className="space-y-6">
                        {/* Time Format */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <p className="font-medium text-slate-900 mb-2 sm:mb-0">Time Format</p>
                            <div className="flex items-center gap-2 p-1 bg-slate-200/70 rounded-lg">
                                <button onClick={() => handleDisplayUpdate({ timeFormat: '12h' })} className={`px-4 py-1 text-sm rounded-md transition-all ${settings.display.timeFormat === '12h' ? 'bg-white shadow-sm font-semibold' : 'font-medium text-slate-600'}`}>12-Hour</button>
                                <button onClick={() => handleDisplayUpdate({ timeFormat: '24h' })} className={`px-4 py-1 text-sm rounded-md transition-all ${settings.display.timeFormat === '24h' ? 'bg-white shadow-sm font-semibold' : 'font-medium text-slate-600'}`}>24-Hour</button>
                            </div>
                        </div>
                        {/* Mobile Nav Style */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <p className="font-medium text-slate-900 mb-2 sm:mb-0">Mobile Navigation Style</p>
                            <div className="flex items-center gap-2 p-1 bg-slate-200/70 rounded-lg">
                                <button onClick={() => handleDisplayUpdate({ mobileNavStyle: 'column' })} className={`px-4 py-1 text-sm rounded-md transition-all ${settings.display.mobileNavStyle === 'column' ? 'bg-white shadow-sm font-semibold' : 'font-medium text-slate-600'}`}>Dynamic Column</button>
                                <button onClick={() => handleDisplayUpdate({ mobileNavStyle: 'header' })} className={`px-4 py-1 text-sm rounded-md transition-all ${settings.display.mobileNavStyle === 'header' ? 'bg-white shadow-sm font-semibold' : 'font-medium text-slate-600'}`}>Header Bar</button>
                            </div>
                        </div>
                        {/* Birthday Widget Toggle */}
                        <ToggleSwitch
                            id="birthday-widget-toggle"
                            label="Show Birthday Widget on Dashboard"
                            checked={settings.display.showBirthdayWidget}
                            onChange={(checked) => handleDisplayUpdate({ showBirthdayWidget: checked })}
                        />
                        {/* Time Zone */}
                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                             <div className="mb-2 sm:mb-0">
                                <p className="font-medium text-slate-900">Time Zone</p>
                                <CheckboxOption
                                    id="auto-timezone"
                                    label="Use browser time zone"
                                    description="Automatically detect and use your current time zone."
                                    checked={settings.display.autoTimeZone}
                                    onChange={(checked) => handleDisplayUpdate({ autoTimeZone: checked })}
                                />
                             </div>
                        </div>
                        {!settings.display.autoTimeZone && (
                            <div className="sm:pl-8">
                                <label htmlFor="timezone-select" className="sr-only">Select Time Zone</label>
                                <select id="timezone-select" value={settings.display.timeZone} onChange={e => handleDisplayUpdate({ timeZone: e.target.value })} className={`${inputClasses} w-full`}>
                                    {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                                </select>
                            </div>
                        )}
                     </div>
                </div>
                
                <div className="p-6 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 border-b border-slate-200 pb-2">Data Management</h2>
                    <div className="space-y-4">
                        <div>
                            <p className="font-medium text-slate-900">Export / Import Data</p>
                            <p className="text-sm text-slate-500 mb-4">Save all your data to a file or import it on another device.</p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={handleFileSelected} />
                                <button
                                    onClick={onExportData}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:to-blue-500 shadow-sm hover:shadow-md transition-all"
                                >
                                    <ArrowDownTrayIcon className="w-5 h-5"/>
                                    Export All Data
                                </button>
                                <button
                                    onClick={handleImportClick}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-slate-700 bg-gradient-to-r from-slate-100 to-slate-50 hover:to-slate-200 shadow-sm hover:shadow-md transition-all"
                                >
                                    <ArrowUpTrayIcon className="w-5 h-5"/>
                                    Import from File
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 border-b border-slate-200 pb-2">Notification Timing</h2>
                    <div className="space-y-6">
                        {/* Morning Summary Setting */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="mb-2 sm:mb-0">
                                <p className="font-medium text-slate-900">Morning Summary</p>
                                <p className="text-sm text-slate-500">Get a summary of all today's tasks.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                 <input
                                    type="time"
                                    value={settings.notifications.morningSummary.time}
                                    onChange={(e) => handleMorningSummaryChange({ time: e.target.value })}
                                    disabled={!settings.notifications.morningSummary.enabled}
                                    className={`${inputClasses} w-32`}
                                />
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    checked={settings.notifications.morningSummary.enabled}
                                    onChange={(e) => handleMorningSummaryChange({ enabled: e.target.checked })}
                                />
                            </div>
                        </div>
                        {/* Due Soon Reminder Setting */}
                         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                             <div className="mb-2 sm:mb-0">
                                <p className="font-medium text-slate-900">Due Soon Reminders</p>
                                <p className="text-sm text-slate-500">Get a notification before an item is due.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    min="1"
                                    value={settings.notifications.dueSoonReminder.minutesBefore}
                                    onChange={(e) => handleDueSoonReminderChange({ minutesBefore: parseInt(e.target.value, 10) || 1 })}
                                    disabled={!settings.notifications.dueSoonReminder.enabled}
                                    className={`${inputClasses} w-20 text-center`}
                                    onFocus={e => e.target.select()}
                                />
                                <span className={`text-sm ${!settings.notifications.dueSoonReminder.enabled ? 'text-slate-400' : 'text-slate-600'}`}>minutes before</span>
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    checked={settings.notifications.dueSoonReminder.enabled}
                                    onChange={(e) => handleDueSoonReminderChange({ enabled: e.target.checked })}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm">
                     <h2 className="text-xl font-semibold mb-4 text-slate-800 border-b border-slate-200 pb-2">Notify Me For...</h2>
                    <div className="space-y-4">
                        {Object.values(WorkletType).map(type => (
                             <CheckboxOption
                                key={type}
                                id={`notify-${type}`}
                                label={type}
                                description={`Enable notifications for all ${type}s.`}
                                checked={settings.notifications.notifyFor[type] ?? true}
                                onChange={(value) => handleTypeChange(type, value)}
                            />
                        ))}
                    </div>
                </div>

                 <div className="p-6 bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 text-slate-800 border-b border-slate-200 pb-2">Help & Support</h2>
                    <div className="space-y-4">
                        <button
                            id="guide-start-button"
                            onClick={onStartGuide}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-md font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:to-blue-500 shadow-sm hover:shadow-md transition-all"
                        >
                            <QuestionMarkCircleIcon className="w-5 h-5"/>
                            Start Guided Tour
                        </button>
                        <form onSubmit={handleSuggestionSubmit} className="space-y-2 pt-2">
                             <label htmlFor="suggestion-box" className="font-medium text-slate-900">Suggest a Feature</label>
                            <p className="text-sm text-slate-500 mb-2">
                                Have an idea to make this app better? Your suggestion will be sent directly via WhatsApp.
                            </p>
                            <textarea
                                id="suggestion-box"
                                rows={3}
                                value={suggestion}
                                onChange={(e) => setSuggestion(e.target.value)}
                                className={`${inputClasses} w-full`}
                                placeholder="Describe your idea..."
                            />
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 px-6 py-2 rounded-md font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:to-green-500 shadow-sm hover:shadow-md transition-all disabled:opacity-60"
                                disabled={!suggestion.trim()}
                            >
                                <WhatsAppIcon className="w-5 h-5" />
                                Send via WhatsApp
                            </button>
                        </form>
                    </div>
                </div>
            </div>
             {Notification.permission === 'denied' && (
                <div className="mt-8 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-md">
                    <p className="font-bold">Notifications Blocked</p>
                    <p>You have blocked notifications for this site. To receive reminders, please go to your browser's settings and allow notifications for this page.</p>
                </div>
            )}

            {/* Import Mode Selection Modal */}
            {fileToImport && (
                <div className={`fixed inset-0 flex justify-center items-center z-50 ${isImportModalOpen ? 'modal-backdrop-in' : 'modal-backdrop-out'}`} onClick={closeImportModal}>
                    <div className={`bg-gradient-to-br from-white to-sky-50 rounded-lg shadow-2xl p-4 sm:p-6 w-full max-w-lg mx-4 ${isImportModalOpen ? 'modal-content-in' : 'modal-content-out'}`} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-900">Choose Import Mode</h3>
                            <button onClick={closeImportModal} className="p-1 rounded-full text-slate-500 hover:bg-slate-200">
                                <XMarkIcon />
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 mb-6">How would you like to import the data from <span className="font-semibold">{fileToImport.name}</span>?</p>
                        
                        <div className="space-y-4">
                            <button
                                onClick={() => handleImportAction('merge')}
                                className="w-full text-left p-4 rounded-lg border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <h4 className="font-bold text-blue-700">Merge with Existing Data</h4>
                                <p className="text-sm text-slate-600 mt-1">Adds new items and updates existing ones. Your current data will not be deleted.</p>
                            </button>

                            <button
                                onClick={() => handleImportAction('replace')}
                                className="w-full text-left p-4 rounded-lg border-2 border-transparent hover:border-red-500 hover:bg-red-50 transition-all focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                <h4 className="font-bold text-red-700">Replace All Data</h4>
                                <p className="text-sm text-slate-600 mt-1">Deletes all your current data and replaces it with the data from the file. <span className="font-semibold">This cannot be undone.</span></p>
                            </button>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button onClick={closeImportModal} className="px-6 py-2 rounded-md font-semibold transition bg-gradient-to-r text-slate-800 from-slate-100 to-slate-50 hover:to-slate-200 shadow-sm hover:shadow-md">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsView;