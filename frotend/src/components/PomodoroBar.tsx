import { useAgendaStore } from "@/store/useAgendaStore";
import { Pause, Play, SkipForward, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PomodoroBar() {
  const { activePomodoro, pausePomodoro, resumePomodoro, skipPomodoro, cancelPomodoro } =
    useAgendaStore();

  return (
    <AnimatePresence>
      {activePomodoro && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border glow-cyan-strong"
        >
          <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  activePomodoro.isBreak ? "bg-normal animate-pulse" : "bg-pomodoro animate-pulse"
                }`}
              />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {activePomodoro.isBreak ? "Descanso" : "Enfocado"}
                </p>
                <p className="text-sm font-medium truncate">{activePomodoro.taskTitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-xl font-bold tabular-nums text-pomodoro">
                {formatTime(activePomodoro.secondsLeft)}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={activePomodoro.isPaused ? resumePomodoro : pausePomodoro}
                  className="p-2 rounded-md hover:bg-secondary transition-colors"
                >
                  {activePomodoro.isPaused ? (
                    <Play className="w-4 h-4" />
                  ) : (
                    <Pause className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={skipPomodoro}
                  className="p-2 rounded-md hover:bg-secondary transition-colors"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
                <button
                  onClick={cancelPomodoro}
                  className="p-2 rounded-md hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
