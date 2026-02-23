import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import { useAgendaStore } from "@/store/useAgendaStore";
import { TaskCard } from "./TaskCard";
import { EmptyState } from "./EmptyState";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function TaskList() {
  const { tasks, isLoading, reorderTasks } = useAgendaStore();
  const [showDone, setShowDone] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const pending = tasks
    .filter((t) => t.status === "pending" || t.status === "postponed")
    .sort((a, b) => a.position - b.position);
  const done = tasks.filter((t) => t.status === "done");

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = pending.findIndex((t) => t.id === active.id);
    const newIndex = pending.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(pending, oldIndex, newIndex);
    reorderTasks(reordered.map((t) => t.id));
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 rounded-lg shimmer" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) return <EmptyState />;

  return (
    <div className="px-4 sm:px-6 space-y-6 pb-32">
      {/* Section: Pending */}
      <div>
        <p className="text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Tu agenda
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={pending.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {pending.map((task, i) => (
                  <TaskCard key={task.id} task={task} index={i} />
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Section: Done */}
      {done.length > 0 && (
        <div>
          <button
            onClick={() => setShowDone(!showDone)}
            className="flex items-center gap-1.5 text-[10px] font-display font-semibold uppercase tracking-widest text-muted-foreground mb-3 hover:text-foreground transition-colors"
          >
            <ChevronDown
              className={`w-3 h-3 transition-transform ${showDone ? "rotate-0" : "-rotate-90"}`}
            />
            Completadas ({done.length})
          </button>
          <AnimatePresence>
            {showDone && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 overflow-hidden"
              >
                {done.map((task, i) => (
                  <TaskCard key={task.id} task={task} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
