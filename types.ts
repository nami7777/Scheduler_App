
export enum WorkletType {
  Assignment = 'Assignment',
  Exam = 'Exam',
  Event = 'Event',
  Routine = 'Routine',
  Birthday = 'Birthday',
}

export enum MaterialType {
  PDF = 'PDF',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  YOUTUBE = 'YOUTUBE',
  TEXT = 'TEXT',
  EPUB = 'EPUB',
  NOTEBOOK = 'NOTEBOOK',
  OTHER = 'OTHER',
}


export type PathAnnotation = {
    id: string;
    type: 'path';
    points: { x: number; y: number }[];
    color: string;
    lineWidth: number;
    mode: 'pen' | 'highlighter' | 'line' | 'eraser';
};

export type TextAnnotation = {
    id: string;
    type: 'text';
    text: string;
    x: number;
    y: number;
    color: string;
    size: number;
    font: string;
    width: number;
    height: number;
};

export type ImageAnnotation = {
    id: string;
    type: 'image';
    imageData: string; // base64 data URL
    x: number;
    y: number;
    width: number;
    height: number;
};

export type Annotation = PathAnnotation | TextAnnotation | ImageAnnotation;
export type PageAnnotations = Annotation[];
export type AllAnnotations = { [pageNum: number]: PageAnnotations };


export interface Material {
    id: string;
    name: string;
    type: MaterialType;
    emoji?: string; // For notebooks
    blob?: Blob; // For file-based materials
    url?: string; // For YouTube links
    text?: string; // For plain text materials
    metadata: {
        pageCount?: number; // For PDF, EPUB
        durationSeconds?: number;
        size: number;
    };
    annotations?: AllAnnotations;
    highlightedPages?: number[];
    pageCount?: number; // For notebooks
    pageBackgrounds?: { [pageNum: number]: 'blank' | 'grid' | 'lines' }; // For notebooks
    orientation?: 'portrait' | 'landscape'; // For notebooks
    lastViewedPage?: number;
    zoom?: number;
    offset?: { x: number, y: number };
}


export interface Subtask {
  id: string;
  name: string;
  weight: number;
  completed: boolean;
  progress: number;
  materialId?: string;
}

export interface DailyWorkload {
  date: string; // YYYY-MM-DD
  percentage: number;
}

export interface WorkSegment {
  subtaskId: string;
  materialId: string;
  start: number; // page number or second
  end: number;
}

export interface DailyTask {
  date: string; // YYYY-MM-DD
  title: string;
  completed: boolean;
  weightForDay: number;
  workSegments: WorkSegment[];
}


export interface SpeedSession {
  id: string;
  workletId: string;
  dailyTaskDate: string;
  timeElapsedSeconds: number;
  unitsCompleted: number;
}


export interface BaseWorklet {
  id: string;
  type: WorkletType;
  name:string;
  details: string;
  deadline: string; // ISO string
  showCountdown?: boolean;
}

export interface Assignment extends BaseWorklet {
  type: WorkletType.Assignment;
  subtasks: Subtask[];
  materialIds: string[];
  startDate: string; // ISO string
  dailyWorkload: DailyWorkload[];
  dailyTasks: DailyTask[];
  color: string; // Hex color string
  weightUnit: string;
  useSpecificWeekdays?: boolean;
  selectedWeekdays?: number[]; // 0 = Sun, 1 = Mon, etc.
  undoState?: {
    originalDailyTasks: DailyTask[];
    originalDailyWorkload: DailyWorkload[];
  };
  dailyWorkTime?: { start: string; end: string };
  completedPages?: { [materialId: string]: number[] };
}

export interface Exam extends BaseWorklet {
  type: WorkletType.Exam;
  subtasks: Subtask[];
  materialIds: string[];
  startDate: string; // ISO string
  dailyWorkload: DailyWorkload[];
  dailyTasks: DailyTask[];
  color: string; // Hex color string
  weightUnit: string;
  useSpecificWeekdays?: boolean;
  selectedWeekdays?: number[]; // 0 = Sun, 1 = Mon, etc.
  undoState?: {
    originalDailyTasks: DailyTask[];
    originalDailyWorkload: DailyWorkload[];
  };
  dailyWorkTime?: { start: string; end: string };
  completedPages?: { [materialId: string]: number[] };
}

export interface Event extends BaseWorklet {
    type: WorkletType.Event;
    location: string;
    completed: boolean;
}

export interface RoutineSchedule {
  dayOfWeek: number; // 0 for Sunday, 1 for Monday, etc.
  time: string; // HH:mm format
}

export interface Routine extends BaseWorklet {
  type: WorkletType.Routine;
  emoji: string;
  color: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD or null
  schedule: RoutineSchedule[];
  completedDates: string[]; // array of 'YYYY-MM-DD'
}

export interface Birthday extends BaseWorklet {
    type: WorkletType.Birthday;
    birthMonth: number; // 1-12
    birthDay: number; // 1-31
    birthYear?: number;
    emoji: string;
    color: string;
}

export type Worklet = Assignment | Exam | Event | Routine | Birthday;

export type PrefillWorklet = {
    id?: string;
    type?: WorkletType;
    name?:string;
    details?: string;
    deadline?: string;
    showCountdown?: boolean;
    subtasks?: Subtask[];
    materialIds?: string[];
    startDate?: string;
    dailyWorkload?: DailyWorkload[];
    dailyTasks?: DailyTask[];
    color?: string;
    weightUnit?: string;
    useSpecificWeekdays?: boolean;
    selectedWeekdays?: number[];
    undoState?: {
        originalDailyTasks: DailyTask[];
        originalDailyWorkload: DailyWorkload[];
    };
    dailyWorkTime?: { start: string, end: string };
    completedPages?: { [materialId: string]: number[] };
    location?: string;
    completed?: boolean;
    emoji?: string;
    endDate?: string | null;
    schedule?: RoutineSchedule[];
    completedDates?: string[];
    birthMonth?: number;
    birthDay?: number;
    birthYear?: number;
};

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  frequency: {
    type: 'daily' | 'weekly';
    days?: number[]; // 0 = Sun, 1 = Mon, etc. Only for 'weekly'
  };
  startDate: string; // YYYY-MM-DD
  archived: boolean;
  completions: { [date: string]: boolean }; // key: 'YYYY-MM-DD'
}

export interface TimeBlock {
  id: string;
  title: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  color: string;
  
  // Link to a worklet if it's based on one
  workletId?: string;
  dailyWorkItemDateKey?: string; // To uniquely identify an instance of a daily task or routine
  
  // Recurrence info
  isRecurring: boolean;
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, etc.
  date?: string; // YYYY-MM-DD for non-recurring events
  startDate?: string; // YYYY-MM-DD for start of recurring event
  endDate?: string | null; // YYYY-MM-DD for end of recurring event, null for indefinite
  isDeadlineBlock?: boolean;
  deadlineTemplateName?: string;
}

export enum View {
  Dashboard = 'DASHBOARD',
  Habits = 'HABITS',
  Calendar = 'CALENDAR',
  DailyPlanner = 'DAILY_PLANNER',
  AddWorklet = 'ADD_WORKLET',
  PastWork = 'PAST_WORK',
  SpeedCheck = 'SPEED_CHECK',
  Settings = 'SETTINGS',
  Analytics = 'ANALYTICS',
  Reschedules = 'RESCHEDULES',
  Materials = 'MATERIALS',
  Playground = 'PLAYGROUND',
  AiAssistant = 'AI_ASSISTANT',
}

export interface DisplaySettings {
    timeFormat: '12h' | '24h';
    timeZone: string;
    autoTimeZone: boolean;
    mobileNavStyle: 'column' | 'header';
    showBirthdayWidget: boolean;
}

export interface NotificationSettings {
    morningSummary: {
        enabled: boolean;
        time: string; // HH:mm
    };
    dueSoonReminder: {
        enabled: boolean;
        minutesBefore: number;
    };
    notifyFor: {
        [key in WorkletType]: boolean;
    };
}

export interface AppSettings {
    display: DisplaySettings;
    notifications: NotificationSettings;
}

// Added for shared logic between Dashboard and Notifications
export interface DailyWorkItem {
    worklet: Worklet;
    description: string;
    isComplete: boolean;
    dateKey?: string;
    dailyTask?: DailyTask;
}