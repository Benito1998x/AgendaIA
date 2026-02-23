import { useState, useEffect } from "react";
import { useAgendaStore } from "@/store/useAgendaStore";
import { Star, X } from "lucide-react";
import * as api from "@/lib/api";
import { toast } from "sonner";

export function FeedbackModal({ onClose }: { onClose: () => void }) {
  const { currentDate, dayStats } = useAgendaStore();
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [notes, setNotes] = useState("");
  const [existing, setExisting] = useState(false);

  useEffect(() => {
    api.getFeedback(currentDate).then((fb) => {
      if (fb) {
        setScore(fb.score);
        setNotes(fb.notes || "");
        setExisting(true);
      }
    }).catch(() => {});
  }, [currentDate]);

  const handleSubmit = async () => {
    if (score === 0) return;
    try {
      await api.submitFeedback(currentDate, score, notes || undefined);
      toast.success("Feedback guardado");
      onClose();
    } catch {
      toast.error("Error al guardar feedback");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-sm">¿Cómo estuvo tu día?</h3>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded"><X className="w-4 h-4" /></button>
        </div>

        {dayStats && (
          <p className="text-xs text-muted-foreground">
            Completaste {dayStats.done} de {dayStats.total} tareas y {dayStats.pomodoros_done} Pomodoros
          </p>
        )}

        <div className="flex gap-1 justify-center py-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setScore(s)}
              className="p-1 transition-transform hover:scale-110"
            >
              <Star
                className={`w-7 h-7 ${
                  s <= (hover || score) ? "text-important fill-important" : "text-surface-3"
                }`}
              />
            </button>
          ))}
        </div>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="¿Alguna nota sobre hoy?"
          className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none min-h-[60px]"
        />

        <button
          onClick={handleSubmit}
          disabled={score === 0}
          className="w-full px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {existing ? "Actualizar" : "Enviar"} feedback
        </button>
      </div>
    </div>
  );
}
