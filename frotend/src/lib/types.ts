export interface Task {
  id: string;
  title: string;
  context: string | null;
  priority: 1 | 2 | 3;
  pomodoros: number;
  pomodoros_done: number;
  target_hour: string | null;
  suggested_hour: string | null;
  status: "pending" | "done" | "postponed" | "cancelled";
  date: string;
  position: number;
  created_at: string;
  done_at: string | null;
}

export interface Feedback {
  date: string;
  score: number;
  notes: string | null;
  tasks_done: number;
  tasks_total: number;
}

export interface DayStats {
  total: number;
  done: number;
  pomodoros_done: number;
  pomodoros_total: number;
}

export interface WeekStats {
  days: Array<{
    date: string;
    total: number;
    done: number;
    pomodoros: number;
    score: number | null;
  }>;
  avg_score: number;
  completion_rate: number;
  total_pomodoros: number;
}

export interface ActivePomodoro {
  taskId: string;
  taskTitle: string;
  secondsLeft: number;
  isBreak: boolean;
  isPaused: boolean;
}
