import { useEffect } from "react";
import { useAgendaStore } from "@/store/useAgendaStore";
import { BarChart3 } from "lucide-react";

export function StatsPanel() {
  const { weekStats, fetchWeekStats } = useAgendaStore();

  useEffect(() => {
    fetchWeekStats();
  }, [fetchWeekStats]);

  if (!weekStats) return null;

  const maxTasks = Math.max(...weekStats.days.map((d) => d.total), 1);

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-display font-bold text-sm">Esta semana</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xl font-display font-bold">{Math.round(weekStats.completion_rate * 100)}%</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Completado</p>
        </div>
        <div>
          <p className="text-xl font-display font-bold">{weekStats.total_pomodoros}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pomodoros</p>
        </div>
        <div>
          <p className="text-xl font-display font-bold">
            {weekStats.avg_score > 0 ? weekStats.avg_score.toFixed(1) : "—"}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</p>
        </div>
      </div>

      {/* Mini bar chart */}
      <div className="flex items-end gap-1.5 h-16">
        {weekStats.days.map((day) => {
          const height = day.total > 0 ? (day.done / maxTasks) * 100 : 0;
          const totalHeight = day.total > 0 ? (day.total / maxTasks) * 100 : 4;
          const dayLabel = new Date(day.date + "T12:00:00").toLocaleDateString("es", { weekday: "short" });
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full relative" style={{ height: `${totalHeight}%` }}>
                <div className="absolute bottom-0 w-full rounded-sm bg-surface-3" style={{ height: "100%" }} />
                <div
                  className="absolute bottom-0 w-full rounded-sm bg-primary transition-all duration-500"
                  style={{ height: `${day.total > 0 ? (day.done / day.total) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground capitalize">{dayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
