import { useState } from "react";
import { useAgendaStore } from "@/store/useAgendaStore";
import type { Task } from "@/lib/types";
import { Loader2, X } from "lucide-react";

const priorityLabels: Record<number, { label: string; color: string }> = {
  1: { label: "Urgente", color: "bg-urgent/20 text-urgent" },
  2: { label: "Importante", color: "bg-important/20 text-important" },
  3: { label: "Normal", color: "bg-normal/20 text-normal" },
};

export function DayPlanPreview({
  tasks,
  onConfirm,
  onCancel,
}: {
  tasks: Partial<Task>[];
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { confirmDayPlan } = useAgendaStore();
  const [items, setItems] = useState(
    tasks.map((t, i) => ({ ...t, selected: true, _idx: i }))
  );
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    const selected = items.filter((i) => i.selected);
    await confirmDayPlan(selected);
    setLoading(false);
    onConfirm();
  };

  const toggle = (idx: number) =>
    setItems((prev) =>
      prev.map((item) =>
        item._idx === idx ? { ...item, selected: !item.selected } : item
      )
    );

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-display font-semibold uppercase tracking-wider text-muted-foreground">
          Vista previa ({items.filter((i) => i.selected).length} tareas)
        </p>
        <button onClick={onCancel} className="p-1 hover:bg-secondary rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {items.map((item) => {
          const p = priorityLabels[item.priority || 3];
          return (
            <label
              key={item._idx}
              className={`flex items-center gap-3 p-2 rounded-md border border-border cursor-pointer transition-all ${
                item.selected ? "bg-surface-2" : "opacity-40"
              }`}
            >
              <input
                type="checkbox"
                checked={item.selected}
                onChange={() => toggle(item._idx)}
                className="accent-primary"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${p.color}`}>
                    {p.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {item.pomodoros || 1} pom
                  </span>
                  {item.target_hour && (
                    <span className="text-[10px] text-muted-foreground">{item.target_hour}</span>
                  )}
                </div>
              </div>
            </label>
          );
        })}
      </div>

      <button
        onClick={handleConfirm}
        disabled={loading || items.every((i) => !i.selected)}
        className="w-full px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Agregar todas
      </button>
    </div>
  );
}
