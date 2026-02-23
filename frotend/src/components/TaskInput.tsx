import { useState } from "react";
import { useAgendaStore } from "@/store/useAgendaStore";
import { Sparkles, ListChecks, Loader2 } from "lucide-react";
import { DayPlanPreview } from "./DayPlanPreview";
import type { Task } from "@/lib/types";

const priorities = [
  { value: 1, label: "Urgente", color: "bg-urgent/20 text-urgent border-urgent/30" },
  { value: 2, label: "Importante", color: "bg-important/20 text-important border-important/30" },
  { value: 3, label: "Normal", color: "bg-normal/20 text-normal border-normal/30" },
] as const;

export function TaskInput() {
  const { addTaskFromText, addTasksDayPlan } = useAgendaStore();
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<number | undefined>();
  const [loading, setLoading] = useState(false);
  const [dayMode, setDayMode] = useState(false);
  const [dayPreview, setDayPreview] = useState<Partial<Task>[] | null>(null);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      if (dayMode) {
        const tasks = await addTasksDayPlan(text);
        setDayPreview(tasks);
      } else {
        await addTaskFromText(text, priority);
        setText("");
        setPriority(undefined);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-5 sm:px-6 space-y-3">
      <div className="flex gap-2">
        {dayMode ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe tu día completo... ej: 'Por la mañana revisar emails y preparar la presentación. Después de comer reunión con el equipo. Por la tarde programar el módulo de pagos.'"
            className="flex-1 min-h-[100px] bg-input border border-border rounded-lg px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.metaKey) handleSubmit();
            }}
          />
        ) : (
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="¿Qué necesitas hacer hoy? Escribe naturalmente..."
            className="flex-1 bg-input border border-border rounded-lg px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            autoFocus
          />
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-display font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-2"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {dayMode ? "Planificar" : "Agregar"}
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {!dayMode &&
          priorities.map((p) => (
            <button
              key={p.value}
              onClick={() => setPriority(priority === p.value ? undefined : p.value)}
              className={`px-3 py-1 text-xs font-medium rounded-md border transition-all ${
                priority === p.value ? p.color : "border-border text-muted-foreground hover:border-muted-foreground/50"
              }`}
            >
              {p.label}
            </button>
          ))}
        <button
          onClick={() => setDayMode(!dayMode)}
          className={`ml-auto px-3 py-1 text-xs font-medium rounded-md border transition-all flex items-center gap-1.5 ${
            dayMode ? "border-primary/40 text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-muted-foreground/50"
          }`}
        >
          <ListChecks className="w-3 h-3" />
          Planificar día
        </button>
      </div>

      {loading && (
        <div className="h-12 rounded-lg shimmer" />
      )}

      {dayPreview && (
        <DayPlanPreview
          tasks={dayPreview}
          onConfirm={() => {
            setDayPreview(null);
            setText("");
            setDayMode(false);
          }}
          onCancel={() => setDayPreview(null)}
        />
      )}
    </div>
  );
}
