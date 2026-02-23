import { useState } from "react";
import { useAgendaStore } from "@/store/useAgendaStore";
import type { Task } from "@/lib/types";
import { X } from "lucide-react";

const priorityOptions = [
  { value: 1, label: "Urgente", color: "bg-urgent/20 text-urgent border-urgent/30" },
  { value: 2, label: "Importante", color: "bg-important/20 text-important border-important/30" },
  { value: 3, label: "Normal", color: "bg-normal/20 text-normal border-normal/30" },
];

export function TaskEditModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const { updateTask } = useAgendaStore();
  const [title, setTitle] = useState(task.title);
  const [context, setContext] = useState(task.context || "");
  const [priority, setPriority] = useState(task.priority);
  const [pomodoros, setPomodoros] = useState(task.pomodoros);
  const [targetHour, setTargetHour] = useState(task.target_hour || "");

  const handleSave = async () => {
    await updateTask(task.id, {
      title,
      context: context || null,
      priority: priority as 1 | 2 | 3,
      pomodoros,
      target_hour: targetHour || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-lg w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm">Editar tarea</h3>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded"><X className="w-4 h-4" /></button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Título"
        />

        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none min-h-[60px]"
          placeholder="Contexto (opcional)"
        />

        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">Prioridad</label>
          <div className="flex gap-2">
            {priorityOptions.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value as 1 | 2 | 3)}
                className={`px-3 py-1 text-xs font-medium rounded-md border transition-all ${
                  priority === p.value ? p.color : "border-border text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">Pomodoros</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setPomodoros(n)}
                className={`w-8 h-8 rounded-md text-xs font-medium border transition-all ${
                  pomodoros === n ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 block">Hora objetivo</label>
          <input
            type="time"
            value={targetHour}
            onChange={(e) => setTargetHour(e.target.value)}
            className="bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 px-3 py-2 text-sm rounded-lg border border-border hover:bg-secondary transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex-1 px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
