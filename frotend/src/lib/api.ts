import type { Task, Feedback, DayStats, WeekStats } from "./types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "Unknown error");
    throw new Error(err);
  }
  return res.json();
}

// Parse a single task with AI — backend: POST /parse {texto}
export const parseTask = (text: string, _priorityHint?: number) =>
  request<Partial<Task>>("/parse", {
    method: "POST",
    body: JSON.stringify({ texto: text }),
  });

// Create task — backend returns {id, mensaje}, reconstruct full Task locally
export const createTask = async (task: {
  title: string;
  priority: number;
  pomodoros: number;
  target_hour: string | null;
  context: string | null;
  date: string;
}): Promise<Task> => {
  const created = await request<{ id: string }>("/tasks", {
    method: "POST",
    body: JSON.stringify(task),
  });
  return {
    id: created.id,
    title: task.title,
    context: task.context,
    priority: task.priority as 1 | 2 | 3,
    pomodoros: task.pomodoros,
    pomodoros_done: 0,
    target_hour: task.target_hour,
    suggested_hour: null,
    status: "pending",
    date: task.date,
    position: 0,
    created_at: new Date().toISOString(),
    done_at: null,
  };
};

// Get tasks for a date — backend: GET /agenda/{fecha} returns Task[]
export const getTasks = (date: string) =>
  request<Task[]>(`/agenda/${date}`);

// Update any task fields — backend: PATCH /tasks/{id}
export const updateTask = (id: string, updates: Partial<Task>) =>
  request<Task>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });

// Soft-delete via status=cancelled — backend has no DELETE endpoint
export const deleteTask = (id: string) =>
  request<Task>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "cancelled" }),
  });

// Reorder — backend: PATCH /tasks/reorder [{id, position}]
export const reorderTasks = (taskIds: string[]) =>
  request<{ ok: boolean }>("/tasks/reorder", {
    method: "PATCH",
    body: JSON.stringify(taskIds.map((id, i) => ({ id, position: i }))),
  });

// Increment pomodoros_done — newCount provided by store
export const completePomodoro = (taskId: string, newCount: number) =>
  request<Task>(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ pomodoros_done: newCount }),
  });

// Parse full day description — backend: POST /parse-day {texto}
export const parseDayPlan = (text: string) =>
  request<Partial<Task>[]>("/parse-day", {
    method: "POST",
    body: JSON.stringify({ texto: text }),
  });

// Get agenda — backend returns flat Task[], compute stats here
export const getAgenda = async (date: string): Promise<{ tasks: Task[]; stats: DayStats }> => {
  const tasks = await request<Task[]>(`/agenda/${date}`);
  const stats: DayStats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === "done").length,
    pomodoros_done: tasks.reduce((s, t) => s + t.pomodoros_done, 0),
    pomodoros_total: tasks.reduce((s, t) => s + t.pomodoros, 0),
  };
  return { tasks, stats };
};

// Feedback — backend: POST /feedback {date, score, notes}
export const submitFeedback = (date: string, score: number, notes?: string) =>
  request<Feedback>("/feedback", {
    method: "POST",
    body: JSON.stringify({ date, score, notes }),
  });

// Not implemented in backend — return null
export const getFeedback = (_date: string): Promise<Feedback | null> =>
  Promise.resolve(null);

// Not implemented in backend — return empty stats
export const getStats = (_days = 7): Promise<WeekStats> =>
  Promise.resolve({ days: [], avg_score: 0, completion_rate: 0, total_pomodoros: 0 });

// Not implemented in backend — return empty prefs
export const getPrefs = (): Promise<Record<string, unknown>> =>
  Promise.resolve({});
