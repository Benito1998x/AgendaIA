import { create } from "zustand";
import { format, addDays, subDays } from "date-fns";
import type { Task, DayStats, ActivePomodoro, WeekStats } from "@/lib/types";
import * as api from "@/lib/api";
import { toast } from "sonner";

const WORK_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

let timerInterval: ReturnType<typeof setInterval> | null = null;

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.value = 0.3;
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {
    // AudioContext no disponible en algunos navegadores — se ignora silenciosamente
  }
}

function notify(title: string, body?: string) {
  playBeep();
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

interface AgendaState {
  currentDate: string;
  tasks: Task[];
  isLoading: boolean;
  dayStats: DayStats | null;
  weekStats: WeekStats | null;
  activePomodoro: ActivePomodoro | null;

  setCurrentDate: (date: string) => void;
  goNextDay: () => void;
  goPrevDay: () => void;
  goToday: () => void;

  fetchAgenda: (date?: string) => Promise<void>;
  addTaskFromText: (text: string, priorityHint?: number) => Promise<void>;
  addTasksDayPlan: (text: string) => Promise<Partial<Task>[]>;
  confirmDayPlan: (tasks: Partial<Task>[]) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  reorderTasks: (ids: string[]) => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  postponeTask: (id: string) => Promise<void>;

  startPomodoro: (taskId: string) => void;
  pausePomodoro: () => void;
  resumePomodoro: () => void;
  skipPomodoro: () => void;
  cancelPomodoro: () => void;

  fetchWeekStats: () => Promise<void>;
}

export const useAgendaStore = create<AgendaState>((set, get) => ({
  currentDate: format(new Date(), "yyyy-MM-dd"),
  tasks: [],
  isLoading: false,
  dayStats: null,
  weekStats: null,
  activePomodoro: null,

  setCurrentDate: (date) => {
    set({ currentDate: date });
    get().fetchAgenda(date);
  },
  goNextDay: () => {
    const next = format(addDays(new Date(get().currentDate + "T12:00:00"), 1), "yyyy-MM-dd");
    get().setCurrentDate(next);
  },
  goPrevDay: () => {
    const prev = format(subDays(new Date(get().currentDate + "T12:00:00"), 1), "yyyy-MM-dd");
    get().setCurrentDate(prev);
  },
  goToday: () => get().setCurrentDate(format(new Date(), "yyyy-MM-dd")),

  fetchAgenda: async (date) => {
    const d = date || get().currentDate;
    set({ isLoading: true });
    try {
      const data = await api.getAgenda(d);
      set({ tasks: data.tasks, dayStats: data.stats, isLoading: false });
    } catch {
      // fallback to getTasks
      try {
        const tasks = await api.getTasks(d);
        set({
          tasks,
          dayStats: {
            total: tasks.length,
            done: tasks.filter((t) => t.status === "done").length,
            pomodoros_done: tasks.reduce((s, t) => s + t.pomodoros_done, 0),
            pomodoros_total: tasks.reduce((s, t) => s + t.pomodoros, 0),
          },
          isLoading: false,
        });
      } catch {
        set({ isLoading: false });
        toast.error("No se pudo conectar con el servidor. ¿Está corriendo el backend?");
      }
    }
  },

  addTaskFromText: async (text, priorityHint) => {
    try {
      const parsed = await api.parseTask(text, priorityHint);
      const task = await api.createTask({
        title: parsed.title || text,
        priority: (parsed.priority as 1 | 2 | 3) || 3,
        pomodoros: parsed.pomodoros || 1,
        target_hour: parsed.target_hour || null,
        context: parsed.context || null,
        date: get().currentDate,
      });
      set((s) => ({ tasks: [...s.tasks, task] }));
      toast.success(`Tarea añadida: ${task.title}`);
      get().fetchAgenda();
    } catch {
      toast.error("La IA no pudo interpretar tu texto. Intenta ser más específico.");
    }
  },

  addTasksDayPlan: async (text) => {
    return api.parseDayPlan(text);
  },

  confirmDayPlan: async (tasks) => {
    for (const t of tasks) {
      await api.createTask({
        title: t.title || "",
        priority: (t.priority as 1 | 2 | 3) || 3,
        pomodoros: t.pomodoros || 1,
        target_hour: t.target_hour || null,
        context: t.context || null,
        date: get().currentDate,
      });
    }
    toast.success(`${tasks.length} tareas añadidas`);
    get().fetchAgenda();
  },

  updateTask: async (id, updates) => {
    try {
      const updated = await api.updateTask(id, updates);
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
    } catch {
      toast.error("Error al actualizar tarea");
    }
  },

  removeTask: async (id) => {
    try {
      await api.deleteTask(id);
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
      toast.success("Tarea eliminada");
    } catch {
      toast.error("Error al eliminar tarea");
    }
  },

  reorderTasks: async (ids) => {
    const reordered = ids.map((id, i) => {
      const t = get().tasks.find((t) => t.id === id)!;
      return { ...t, position: i };
    });
    set({ tasks: reordered });
    try {
      await api.reorderTasks(ids);
    } catch {
      toast.error("Error al reordenar");
    }
  },

  completeTask: async (id) => {
    try {
      const updated = await api.updateTask(id, { status: "done" });
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
      toast.success("¡Tarea completada!");
      get().fetchAgenda();
    } catch {
      toast.error("Error al completar tarea");
    }
  },

  postponeTask: async (id) => {
    try {
      const updated = await api.updateTask(id, { status: "postponed" });
      set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
      toast("Tarea pospuesta para mañana");
    } catch {
      toast.error("Error al posponer tarea");
    }
  },

  startPomodoro: (taskId) => {
    const task = get().tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (timerInterval) clearInterval(timerInterval);

    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    set({
      activePomodoro: {
        taskId,
        taskTitle: task.title,
        secondsLeft: WORK_SECONDS,
        isBreak: false,
        isPaused: false,
      },
    });

    timerInterval = setInterval(() => {
      const pom = get().activePomodoro;
      if (!pom || pom.isPaused) return;

      const next = pom.secondsLeft - 1;
      if (next <= 0) {
        if (!pom.isBreak) {
          // Work done
          const currentTask = get().tasks.find((t) => t.id === pom.taskId);
          const newCount = (currentTask?.pomodoros_done ?? 0) + 1;
          api.completePomodoro(pom.taskId, newCount).then((updated) => {
            set((s) => ({
              tasks: s.tasks.map((t) => (t.id === pom.taskId ? updated : t)),
            }));
          });
          notify("¡Pomodoro completado!", "Descanso de 5 minutos");
          set({
            activePomodoro: {
              ...pom,
              secondsLeft: BREAK_SECONDS,
              isBreak: true,
            },
          });
        } else {
          // Break done
          const task = get().tasks.find((t) => t.id === pom.taskId);
          if (task && task.pomodoros_done + 1 < task.pomodoros) {
            notify("Descanso terminado", "¿Listo para el siguiente Pomodoro?");
            set({
              activePomodoro: {
                ...pom,
                secondsLeft: WORK_SECONDS,
                isBreak: false,
              },
            });
          } else {
            notify("🎉 ¡Todos los Pomodoros completados!");
            toast.success("🎉 ¡Todos los Pomodoros completados!");
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = null;
            set({ activePomodoro: null });
          }
        }
      } else {
        set({ activePomodoro: { ...pom, secondsLeft: next } });
      }
    }, 1000);
  },

  pausePomodoro: () => {
    const pom = get().activePomodoro;
    if (pom) set({ activePomodoro: { ...pom, isPaused: true } });
  },
  resumePomodoro: () => {
    const pom = get().activePomodoro;
    if (pom) set({ activePomodoro: { ...pom, isPaused: false } });
  },
  skipPomodoro: () => {
    const pom = get().activePomodoro;
    if (!pom) return;
    if (!pom.isBreak) {
      set({ activePomodoro: { ...pom, secondsLeft: BREAK_SECONDS, isBreak: true } });
    } else {
      set({ activePomodoro: { ...pom, secondsLeft: WORK_SECONDS, isBreak: false } });
    }
  },
  cancelPomodoro: () => {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
    set({ activePomodoro: null });
  },

  fetchWeekStats: async () => {
    try {
      const stats = await api.getStats(7);
      set({ weekStats: stats });
    } catch {
      // getStats no está implementado en el backend — falla silenciosamente
    }
  },
}));
