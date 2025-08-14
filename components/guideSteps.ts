import { View, WorkletType } from '../types.ts';

export interface GuideStep {
  elementSelector?: string;
  title: string;
  content: string;
  view: View;
  isModal?: boolean;
  preAction?: (setters: { setAddingWorkletType: (type: WorkletType | null) => void }) => void;
}

export const guideSteps: GuideStep[] = [
  {
    view: View.Dashboard,
    title: "👋 Welcome to Your Scheduler!",
    content: "This quick tour will walk you through the main features of the app. Use the 'Next' and 'Prev' buttons to navigate. Let's get started!",
    isModal: true,
  },
  {
    elementSelector: '#guide-logo',
    view: View.Dashboard,
    title: "The Dashboard",
    content: "This is your main view. Clicking the 'Scheduler' logo will always bring you back here."
  },
  {
    elementSelector: '#guide-nav-dashboard',
    view: View.Dashboard,
    title: "QuickLook",
    content: "The dashboard gives you a 'QuickLook' at your overdue tasks and what's scheduled for today and the next 6 days."
  },
  {
    elementSelector: '#guide-nav-add',
    view: View.Dashboard,
    title: "Creating New Items",
    content: "This is the most important button! Click here to add new assignments, exams, events, and more."
  },
  {
    elementSelector: '[data-testid="add-worklet-assignment"]',
    view: View.AddWorklet,
    title: "Scheduling an Assignment",
    content: "Select this to create a new assignment or exam. The app will help you break it down into manageable daily tasks."
  },
  {
    view: View.AddWorklet,
    title: "Smart Scheduling",
    preAction: ({ setAddingWorkletType }) => setAddingWorkletType(WorkletType.Assignment),
    elementSelector: '#add-assignment-form',
    content: "Here, you can define subtasks, set a deadline, and customize a daily work plan. The app automatically calculates what you need to do each day to finish on time."
  },
  {
    elementSelector: '#guide-nav-habits',
    view: View.Habits,
    title: "Habit Tracker",
    content: "Track daily or weekly habits here. The app visualizes your streaks to keep you motivated."
  },
  {
    elementSelector: '#guide-nav-calendar',
    view: View.Calendar,
    title: "Calendar View",
    content: "Get a visual overview of your schedule. You can switch between year, month, week, and day views. You can also import and export calendar files (.ics)."
  },
  {
    elementSelector: '#guide-nav-analytics',
    view: View.Analytics,
    title: "Analytics & Progress",
    content: "Check your overall completion rate, see your most productive days, and view your activity over time with a heatmap."
  },
  {
    elementSelector: '#guide-nav-settings',
    view: View.Settings,
    title: "Settings",
    content: "Customize the app's appearance, manage notifications, and export all your data for backup."
  },
  {
    elementSelector: '#guide-start-button',
    view: View.Settings,
    title: "You're All Set!",
    content: "That's the end of the tour! You can restart this guide anytime from the settings page. Now you're ready to start scheduling!",
    isModal: true,
  },
];
