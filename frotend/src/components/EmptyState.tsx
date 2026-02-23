import { CalendarDays } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-xl bg-surface-2 flex items-center justify-center mb-5">
        <CalendarDays className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="font-display font-bold text-lg mb-1.5">Tu día está vacío</h2>
      <p className="text-sm text-muted-foreground max-w-xs">
        Escribe qué necesitas hacer y la IA organizará tu agenda
      </p>
    </div>
  );
}
