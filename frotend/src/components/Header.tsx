import { format, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useAgendaStore } from "@/store/useAgendaStore";
import { useState } from "react";
import { FeedbackModal } from "./FeedbackModal";

export function Header() {
  const { currentDate, goNextDay, goPrevDay, goToday, dayStats } = useAgendaStore();
  const [showFeedback, setShowFeedback] = useState(false);

  const dateObj = new Date(currentDate + "T12:00:00");
  const dateStr = format(dateObj, "EEEE d 'de' MMMM, yyyy", { locale: es });
  const isCurrentDay = isToday(dateObj);

  const done = dayStats?.done ?? 0;
  const total = dayStats?.total ?? 0;
  const pct = total > 0 ? done / total : 0;
  const ringColor = pct < 0.3 ? "stroke-urgent" : pct < 0.7 ? "stroke-important" : "stroke-normal";
  const circumference = 2 * Math.PI * 18;
  const offset = circumference - pct * circumference;

  return (
    <>
      <header className="flex items-center justify-between px-4 py-4 sm:px-6 border-b border-border">
        <div className="flex items-center gap-2">
          <button onClick={goPrevDay} className="p-2 rounded-md hover:bg-secondary transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <h1 className="font-display font-bold text-base sm:text-lg capitalize">{dateStr}</h1>
          <button onClick={goNextDay} className="p-2 rounded-md hover:bg-secondary transition-colors">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          {!isCurrentDay && (
            <button
              onClick={goToday}
              className="ml-2 px-3 py-1 text-xs font-medium rounded-md bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
            >
              <CalendarDays className="w-3 h-3 inline mr-1" />
              Hoy
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFeedback(true)}
          className="relative w-11 h-11 flex items-center justify-center group"
          title="Feedback del día"
        >
          <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r="18" fill="none" strokeWidth="2.5" className="stroke-surface-3" />
            <circle
              cx="22"
              cy="22"
              r="18"
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              className={`${ringColor} transition-all duration-700`}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-display font-bold">
            {done}/{total}
          </span>
        </button>
      </header>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  );
}
