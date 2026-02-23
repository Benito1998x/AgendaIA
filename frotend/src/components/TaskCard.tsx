import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import {
  Play,
  ArrowRight,
  Pencil,
  Trash2,
  Check,
  GripVertical,
} from "lucide-react";
import { useState } from "react";
import { useAgendaStore } from "@/store/useAgendaStore";
import type { Task } from "@/lib/types";
import { TaskEditModal } from "./TaskEditModal";

const priorityBorder: Record<number, string> = {
  1: "border-priority-urgent",
  2: "border-priority-important",
  3: "border-priority-normal",
};

const priorityBadge: Record<number, string> = {
  1: "bg-urgent/20 text-urgent",
  2: "bg-important/20 text-important",
  3: "bg-normal/20 text-normal",
};

export function TaskCard({ task, index }: { task: Task; index: number }) {
  const { completeTask, postponeTask, removeTask, startPomodoro, activePomodoro } =
    useAgendaStore();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isDone = task.status === "done";
  const isPostponed = task.status === "postponed";
  const hour = task.target_hour || task.suggested_hour;
  const pomodorosLeft = task.pomodoros - task.pomodoros_done;
  const isRunning = activePomodoro?.taskId === task.id;

  return (
    <>
      <motion.div
        ref={setNodeRef}
        style={style}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: isDone ? 0.45 : 1, y: 0 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.25, delay: index * 0.04 }}
        className={`group relative bg-card rounded-lg border border-border ${priorityBorder[task.priority]} ${
          isDragging ? "z-50 shadow-lg shadow-black/30" : ""
        } ${isRunning ? "glow-cyan ring-1 ring-pomodoro/30" : ""}`}
      >
        <div className="flex items-start gap-3 p-3 sm:p-4">
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab opacity-0 group-hover:opacity-40 hover:!opacity-70 transition-opacity touch-manipulation"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span
                className={`text-sm font-medium leading-snug ${
                  isDone ? "line-through text-muted-foreground" : ""
                }`}
              >
                {task.title}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {isPostponed && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-important/20 text-important font-medium">
                    Pospuesta
                  </span>
                )}
                {hour && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground font-medium tabular-nums">
                    {hour}
                  </span>
                )}
              </div>
            </div>

            {task.context && (
              <p
                onClick={() => setExpanded(!expanded)}
                className={`mt-1 text-xs text-muted-foreground cursor-pointer ${
                  expanded ? "" : "line-clamp-2"
                }`}
              >
                {task.context}
              </p>
            )}

            <div className="flex items-center justify-between mt-2">
              {/* Pomodoro dots */}
              <div className="flex gap-1">
                {Array.from({ length: task.pomodoros }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i < task.pomodoros_done ? "bg-pomodoro" : "bg-surface-3"
                    }`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {!isDone && pomodorosLeft > 0 && (
                  <button
                    onClick={() => startPomodoro(task.id)}
                    className="p-1.5 rounded hover:bg-secondary transition-colors"
                    title="Iniciar Pomodoro"
                  >
                    <Play className="w-3.5 h-3.5 text-pomodoro" />
                  </button>
                )}
                {!isDone && (
                  <button
                    onClick={() => postponeTask(task.id)}
                    className="p-1.5 rounded hover:bg-secondary transition-colors"
                    title="Posponer"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded hover:bg-secondary transition-colors"
                  title="Editar"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                {confirmDelete ? (
                  <button
                    onClick={() => removeTask(task.id)}
                    className="p-1.5 rounded bg-destructive/20 text-destructive"
                    title="Confirmar eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-1.5 rounded hover:bg-secondary transition-colors"
                    title="Eliminar"
                    onBlur={() => setTimeout(() => setConfirmDelete(false), 200)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                {!isDone && (
                  <button
                    onClick={() => completeTask(task.id)}
                    className="p-1.5 rounded hover:bg-normal/20 transition-colors"
                    title="Completar"
                  >
                    <Check className="w-3.5 h-3.5 text-normal" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {editing && <TaskEditModal task={task} onClose={() => setEditing(false)} />}
    </>
  );
}
