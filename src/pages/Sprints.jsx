import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import {
  Plus,
  Briefcase,
  ListTodo,
  Pencil,
  Trash2,
  Kanban,
  List,
  Zap,
  ChevronRight,
  CalendarDays,
  Clock,
  User,
  Target,
  AlertCircle,
  CheckCircle2,
  Circle,
  Timer,
  FlaskConical,
  BookOpen,
  X,
  TrendingUp,
  Layers,
} from "lucide-react";
import ProjectSelect from "@/components/selects/ProjectSelect";
import SprintSelect from "@/components/selects/SprintSelect";
import {
  getSprintLabel,
  enrichRecordRelations,
  toProjectFields,
  toSprintFields,
} from "@/lib/firestoreQueries";

// ─── Constants ───────────────────────────────────────────────────────────────

const TASK_STATUSES = [
  "Backlog",
  "To Do",
  "In Progress",
  "In Review",
  "Testing",
  "Done",
];

const PRIORITIES = ["Low", "Medium", "High", "Critical"];

const SPRINT_STATUSES = ["Planning", "Active", "Completed", "Cancelled"];

// ─── Column styling ───────────────────────────────────────────────────────────

const COLUMN_CONFIG = {
  Backlog: {
    icon: BookOpen,
    color: "text-slate-500",
    bg: "bg-slate-500/10",
    border: "border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
  },
  "To Do": {
    icon: Circle,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-200 dark:border-blue-800",
    dot: "bg-blue-400",
  },
  "In Progress": {
    icon: Timer,
    color: "text-orange-500",
    bg: "bg-orange-500/10",
    border: "border-orange-200 dark:border-orange-800",
    dot: "bg-orange-400",
  },
  "In Review": {
    icon: AlertCircle,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-200 dark:border-purple-800",
    dot: "bg-purple-400",
  },
  Testing: {
    icon: FlaskConical,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    border: "border-pink-200 dark:border-pink-800",
    dot: "bg-pink-400",
  },
  Done: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-400",
  },
};

const PRIORITY_CONFIG = {
  Low: {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  Medium: {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/50",
    border: "border-blue-200 dark:border-blue-800",
  },
  High: {
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/50",
    border: "border-orange-200 dark:border-orange-800",
  },
  Critical: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/50",
    border: "border-red-200 dark:border-red-800",
  },
};

const SPRINT_STATUS_CONFIG = {
  Planning: {
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  Active: {
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  Completed: {
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-100 dark:bg-slate-800/50",
  },
  Cancelled: {
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clampPercent = (v) => Math.min(100, Math.max(0, Number(v) || 0));

const getTaskCompletion = (task) => {
  if (task.completion_percent !== undefined && task.completion_percent !== "")
    return clampPercent(task.completion_percent);
  return task.status === "Done" ? 100 : 0;
};

const getSprintCompletion = (sprintTasks) => {
  if (!sprintTasks.length) return 0;
  return Math.round(
    sprintTasks.reduce((sum, t) => sum + getTaskCompletion(t), 0) /
    sprintTasks.length,
  );
};

const getNumberedSprintLabel = (sprint, sprints) => {
  const name = getSprintLabel(sprint);
  if (name.startsWith("Sprint ")) return name;
  const index = sprints.findIndex((s) => s.id === sprint.id);
  return `Sprint ${index + 1} — ${name}`;
};

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  return parts.length === 1
    ? parts[0][0].toUpperCase()
    : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.Medium;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5
      rounded-full border ${cfg.bg} ${cfg.color} ${cfg.border}`}
    >
      {priority}
    </span>
  );
}

function SprintStatusBadge({ status }) {
  const cfg = SPRINT_STATUS_CONFIG[status] || SPRINT_STATUS_CONFIG.Planning;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1
      rounded-full ${cfg.bg} ${cfg.color}`}
    >
      {status === "Active" && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      )}
      {status}
    </span>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150
        ${
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
    >
      <Icon className="w-4 h-4" />
      {children}
    </button>
  );
}

// ─── Task Card (Kanban) ───────────────────────────────────────────────────────

function TaskCard({ task, onEdit, onDelete, onMove, allStatuses }) {
  const completion = getTaskCompletion(task);

  return (
    <div
      className="group bg-card border border-border rounded-2xl p-4
      hover:shadow-md hover:border-primary/20 transition-all duration-200
      cursor-pointer"
    >
      {/* Priority + points */}
      <div className="flex items-center justify-between mb-2.5">
        <PriorityBadge priority={task.priority || "Medium"} />
        {task.story_points > 0 && (
          <span
            className="text-[10px] font-bold text-muted-foreground bg-muted
            px-2 py-0.5 rounded-full"
          >
            {task.story_points} pts
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-foreground mb-2 line-clamp-2 leading-snug">
        {task.title}
      </p>

      {/* Sprint tag */}
      {task.sprint_name && (
        <p className="text-[10px] text-muted-foreground mb-2.5 flex items-center gap-1">
          <Zap className="w-3 h-3" />
          {task.sprint_name}
        </p>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-muted-foreground">Progress</span>
          <span className="text-[10px] font-bold text-foreground">
            {completion}%
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400 transition-all duration-500"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      {/* Footer: assignee + due date + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {task.assigned_to_name ? (
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-violet-600
                flex items-center justify-center text-white text-[8px] font-bold shrink-0"
              >
                {getInitials(task.assigned_to_name)}
              </div>
              <span className="text-[10px] text-muted-foreground max-w-[70px] truncate">
                {task.assigned_to_name}
              </span>
            </div>
          ) : (
            <div
              className="w-5 h-5 rounded-full bg-muted border border-dashed border-border
              flex items-center justify-center"
            >
              <User className="w-2.5 h-2.5 text-muted-foreground" />
            </div>
          )}
          {task.due_date && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <CalendarDays className="w-2.5 h-2.5" />
              {task.due_date}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="w-6 h-6 rounded-lg flex items-center justify-center
              hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="w-6 h-6 rounded-lg flex items-center justify-center
              hover:bg-red-50 dark:hover:bg-red-950/40 text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Move to status */}
      {task.status !== "Done" && (
        <div className="mt-3 pt-3 border-t border-border">
          <Select value="" onValueChange={(v) => onMove(task.id, v)}>
            <SelectTrigger className="h-7 text-xs border-dashed">
              <SelectValue placeholder="Move to…" />
            </SelectTrigger>
            <SelectContent>
              {allStatuses
                .filter((s) => s !== task.status)
                .map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// ─── Kanban Board ─────────────────────────────────────────────────────────────

function KanbanBoard({ tasks, onEditTask, onDeleteTask, onMoveTask }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
      {TASK_STATUSES.map((status) => {
        const cfg = COLUMN_CONFIG[status];
        const Icon = cfg.icon;
        const columnTasks = tasks.filter((t) => t.status === status);

        return (
          <div key={status} className="flex-shrink-0 w-[272px]">
            {/* Column header */}
            <div
              className={`flex items-center justify-between mb-3 px-3 py-2.5
              rounded-xl border ${cfg.border} ${cfg.bg}`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${cfg.color}`} />
                <span className={`text-xs font-semibold ${cfg.color}`}>
                  {status}
                </span>
              </div>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full
                ${cfg.bg} ${cfg.color} border ${cfg.border}`}
              >
                {columnTasks.length}
              </span>
            </div>

            {/* Task cards */}
            <div className="space-y-3 min-h-[80px]">
              {columnTasks.length === 0 ? (
                <div
                  className="border-2 border-dashed border-border rounded-2xl
                  h-20 flex items-center justify-center"
                >
                  <p className="text-xs text-muted-foreground/50">No tasks</p>
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onMove={onMoveTask}
                    allStatuses={TASK_STATUSES}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ tasks, onEditTask }) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <ListTodo className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground mb-1">
          No tasks found
        </p>
        <p className="text-xs text-muted-foreground">
          Add your first task to get started
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Header row */}
      <div
        className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3
        bg-muted/40 border-b border-border text-xs font-semibold uppercase tracking-wider
        text-muted-foreground"
      >
        <span>Task</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Assignee</span>
        <span>Progress</span>
        <span></span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border">
        {tasks.map((task) => {
          const completion = getTaskCompletion(task);
          const colCfg = COLUMN_CONFIG[task.status] || COLUMN_CONFIG["Backlog"];
          const ColIcon = colCfg.icon;

          return (
            <div
              key={task.id}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 items-center
                px-5 py-3.5 hover:bg-muted/30 transition-colors group cursor-pointer"
              onClick={() => onEditTask(task)}
            >
              {/* Title */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {task.title}
                </p>
                {task.sprint_name && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Zap className="w-2.5 h-2.5" /> {task.sprint_name}
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5">
                <ColIcon className={`w-3.5 h-3.5 ${colCfg.color}`} />
                <span className={`text-xs font-medium ${colCfg.color}`}>
                  {task.status}
                </span>
              </div>

              {/* Priority */}
              <div>
                <PriorityBadge priority={task.priority || "Medium"} />
              </div>

              {/* Assignee */}
              <div className="flex items-center gap-2 min-w-0">
                {task.assigned_to_name ? (
                  <>
                    <div
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-400 to-violet-600
                      flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                    >
                      {getInitials(task.assigned_to_name)}
                    </div>
                    <span className="text-xs text-foreground truncate">
                      {task.assigned_to_name}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2 min-w-[100px]">
                <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-foreground w-8 text-right">
                  {completion}%
                </span>
              </div>

              {/* Action */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditTask(task);
                }}
                className="w-7 h-7 rounded-lg flex items-center justify-center
                  opacity-0 group-hover:opacity-100 hover:bg-muted
                  text-muted-foreground hover:text-foreground transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Sprint Card ──────────────────────────────────────────────────────────────

function SprintCard({ sprint, tasks, sprints, onEdit, onDelete }) {
  const sprintTasks = tasks.filter((t) => t.sprint_id === sprint.id);
  const doneTasks = sprintTasks.filter((t) => t.status === "Done");
  const pct = getSprintCompletion(sprintTasks);
  const label = getNumberedSprintLabel(sprint, sprints);

  const statusByCol = TASK_STATUSES.map((s) => ({
    status: s,
    count: sprintTasks.filter((t) => t.status === s).length,
    cfg: COLUMN_CONFIG[s],
  })).filter((x) => x.count > 0);

  return (
    <div
      className="bg-card border border-border rounded-2xl overflow-hidden
      hover:shadow-md hover:border-primary/20 transition-all duration-200 group"
    >
      {/* Top accent bar */}
      <div
        className={`h-1.5 w-full ${
          sprint.status === "Active"
            ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
            : sprint.status === "Completed"
              ? "bg-gradient-to-r from-slate-300 to-slate-400"
              : sprint.status === "Cancelled"
                ? "bg-gradient-to-r from-red-400 to-red-600"
                : "bg-gradient-to-r from-blue-400 to-blue-600"
        }`}
      />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 pr-2">
            <p className="text-[10px] text-muted-foreground font-medium mb-0.5 flex items-center gap-1">
              <Layers className="w-3 h-3" />
              {sprint.project_name || "—"}
            </p>
            <h3 className="text-sm font-bold text-foreground leading-snug">
              {label}
            </h3>
          </div>
          <SprintStatusBadge status={sprint.status || "Planning"} />
        </div>

        {/* Goal */}
        {sprint.goal && (
          <div className="mb-4 px-3 py-2 bg-muted/50 rounded-xl border border-border">
            <p className="text-xs text-foreground/70 italic leading-relaxed line-clamp-2">
              "{sprint.goal}"
            </p>
          </div>
        )}

        {/* Dates */}
        {(sprint.start_date || sprint.end_date) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
            <CalendarDays className="w-3.5 h-3.5 shrink-0" />
            <span>{sprint.start_date || "—"}</span>
            <ChevronRight className="w-3 h-3" />
            <span>{sprint.end_date || "—"}</span>
          </div>
        )}

        {/* Progress ring area */}
        <div className="flex items-center gap-4 mb-4 p-3 bg-muted/40 rounded-xl border border-border">
          {/* Circular-ish progress */}
          <div className="relative w-14 h-14 shrink-0">
            <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="5"
              />
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 22}`}
                strokeDashoffset={`${2 * Math.PI * 22 * (1 - pct / 100)}`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-foreground">{pct}%</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total tasks</span>
              <span className="font-semibold text-foreground">
                {sprintTasks.length}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {doneTasks.length}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Remaining</span>
              <span className="font-semibold text-foreground">
                {sprintTasks.length - doneTasks.length}
              </span>
            </div>
          </div>
        </div>

        {/* Status breakdown dots */}
        {statusByCol.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {statusByCol.map(({ status, count, cfg }) => (
              <div
                key={status}
                className={`flex items-center gap-1.5 text-[10px] font-medium
                px-2 py-1 rounded-full border ${cfg.border} ${cfg.bg} ${cfg.color}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {status} · {count}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 mt-1 border-t border-border">
          <button
            onClick={() => onEdit(sprint)}
            className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl
              bg-muted hover:bg-muted/80 text-xs font-medium text-foreground transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit Sprint
          </button>
          <button
            onClick={() => onDelete(sprint.id)}
            className="flex items-center justify-center w-8 h-8 rounded-xl
              hover:bg-red-50 dark:hover:bg-red-950/40 text-muted-foreground hover:text-red-500
              transition-colors border border-border"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sprint Dialog ────────────────────────────────────────────────────────────

function SprintDialog({
  open,
  onClose,
  form,
  setForm,
  onSave,
  saving,
  isEdit,
  projects,
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            {isEdit ? "Edit Sprint" : "New Sprint"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <ProjectSelect
            projects={projects}
            value={form.project_id}
            displayName={form.project_name}
            onValueChange={({ project_id, project_name }) =>
              setForm({ ...form, project_id, project_name })
            }
            required
          />

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sprint Name *
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Sprint 3 — Authentication"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Sprint Goal
            </Label>
            <Textarea
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              placeholder="What does this sprint aim to achieve?"
              rows={2}
              className="rounded-xl resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Start Date
              </Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm({ ...form, start_date: e.target.value })
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                End Date
              </Label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Status
            </Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm({ ...form, status: v })}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPRINT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full h-10 rounded-xl font-semibold"
            onClick={onSave}
            disabled={saving || !form.name || !form.project_id}
          >
            {saving ? "Saving…" : isEdit ? "Update Sprint" : "Create Sprint"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Task Dialog ──────────────────────────────────────────────────────────────

function TaskDialog({
  open,
  onClose,
  form,
  setForm,
  onSave,
  saving,
  isEdit,
  projects,
  sprints,
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <ListTodo className="w-4 h-4 text-primary" />
            </div>
            {isEdit ? "Edit Task" : "New Task"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <ProjectSelect
            projects={projects}
            value={form.project_id}
            displayName={form.project_name}
            onValueChange={({ project_id, project_name }) =>
              setForm({
                ...form,
                project_id,
                project_name,
                sprint_id: "",
                sprint_name: "",
              })
            }
            required
          />

          <SprintSelect
            sprints={sprints}
            projectId={form.project_id}
            value={form.sprint_id}
            displayName={form.sprint_name}
            onValueChange={({ sprint_id, sprint_name }) =>
              setForm({ ...form, sprint_id, sprint_name })
            }
          />

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Task Title *
            </Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Describe the task…"
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Status
              </Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    status: v,
                    completion_percent:
                      v === "Done" ? 100 : form.completion_percent,
                  })
                }
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Priority
              </Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Story Pts
              </Label>
              <Input
                type="number"
                min="0"
                value={form.story_points}
                onChange={(e) =>
                  setForm({ ...form, story_points: e.target.value })
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Est. Hrs
              </Label>
              <Input
                type="number"
                min="0"
                value={form.estimated_hours}
                onChange={(e) =>
                  setForm({ ...form, estimated_hours: e.target.value })
                }
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Due Date
              </Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assignee
            </Label>
            <Input
              value={form.assigned_to_name}
              onChange={(e) =>
                setForm({ ...form, assigned_to_name: e.target.value })
              }
              placeholder="Full name…"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Description
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Additional details…"
              rows={3}
              className="rounded-xl resize-none"
            />
          </div>

          <Button
            className="w-full h-10 rounded-xl font-semibold"
            onClick={onSave}
            disabled={saving || !form.title || !form.project_id}
          >
            {saving ? "Saving…" : isEdit ? "Update Task" : "Create Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Default form values ──────────────────────────────────────────────────────

const DEFAULT_SPRINT = {
  project_id: "",
  project_name: "",
  name: "",
  goal: "",
  start_date: "",
  end_date: "",
  status: "Planning",
};

const DEFAULT_TASK = {
  project_id: "",
  project_name: "",
  sprint_id: "",
  sprint_name: "",
  title: "",
  description: "",
  status: "Backlog",
  priority: "Medium",
  assigned_to_name: "",
  story_points: 0,
  completion_percent: 0,
  estimated_hours: "",
  due_date: "",
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Sprints() {
  const [sprints, setSprints] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("board");
  const [sprintFilter, setSprintFilter] = useState("all");
  const [sprintDialog, setSprintDialog] = useState(false);
  const [taskDialog, setTaskDialog] = useState(false);
  const [sprintForm, setSprintForm] = useState(DEFAULT_SPRINT);
  const [taskForm, setTaskForm] = useState(DEFAULT_TASK);
  const [editingSprintId, setEditingSprintId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sprintSnap, taskSnap, projectSnap] = await Promise.all([
        getDocs(collection(db, "sprints")),
        getDocs(collection(db, "tasks")),
        getDocs(collection(db, "projects")),
      ]);
      const projectData = projectSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      const sprintData = sprintSnap.docs.map((d) =>
        enrichRecordRelations(
          { id: d.id, ...d.data() },
          { projects: projectData },
        ),
      );
      const taskData = taskSnap.docs.map((d) =>
        enrichRecordRelations(
          { id: d.id, ...d.data() },
          { projects: projectData, sprints: sprintData },
        ),
      );
      setSprints(sprintData);
      setTasks(taskData);
      setProjects(projectData);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSprint = async () => {
    try {
      setSaving(true);
      const payload = { ...sprintForm, updatedAt: new Date() };
      if (editingSprintId) {
        await updateDoc(doc(db, "sprints", editingSprintId), payload);
        toast({ title: "Sprint updated" });
      } else {
        await addDoc(collection(db, "sprints"), {
          ...payload,
          createdAt: new Date(),
        });
        toast({ title: "Sprint created" });
      }
      setSprintDialog(false);
      setEditingSprintId(null);
      setSprintForm(DEFAULT_SPRINT);
      await loadData();
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to save sprint", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTask = async () => {
    try {
      setSaving(true);
      const payload = {
        ...taskForm,
        story_points: Number(taskForm.story_points) || 0,
        completion_percent: clampPercent(taskForm.completion_percent),
        estimated_hours: Number(taskForm.estimated_hours) || 0,
        updatedAt: new Date(),
      };
      if (editingTaskId) {
        await updateDoc(doc(db, "tasks", editingTaskId), payload);
        toast({ title: "Task updated" });
      } else {
        await addDoc(collection(db, "tasks"), {
          ...payload,
          createdAt: new Date(),
        });
        toast({ title: "Task created" });
      }
      setTaskDialog(false);
      setEditingTaskId(null);
      setTaskForm(DEFAULT_TASK);
      await loadData();
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to save task", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSprint = async (id) => {
    try {
      await deleteDoc(doc(db, "sprints", id));
      toast({ title: "Sprint deleted" });
      await loadData();
    } catch (err) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await deleteDoc(doc(db, "tasks", id));
      toast({ title: "Task deleted" });
      await loadData();
    } catch (err) {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const handleMoveTask = async (taskId, newStatus) => {
    try {
      await updateDoc(doc(db, "tasks", taskId), {
        status: newStatus,
        ...(newStatus === "Done" ? { completion_percent: 100 } : {}),
        updatedAt: new Date(),
      });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
              ...t,
              status: newStatus,
              ...(newStatus === "Done" ? { completion_percent: 100 } : {}),
            }
            : t,
        ),
      );
      toast({ title: `Moved to "${newStatus}"` });
    } catch (err) {
      toast({ title: "Failed to move task", variant: "destructive" });
    }
  };

  const openSprintEdit = (sprint) => {
    const { project_id, project_name } = toProjectFields(sprint, projects);
    setSprintForm({
      project_id,
      project_name,
      name: sprint.name || "",
      goal: sprint.goal || "",
      start_date: sprint.start_date || "",
      end_date: sprint.end_date || "",
      status: sprint.status || "Planning",
    });
    setEditingSprintId(sprint.id);
    setSprintDialog(true);
  };

  const openTaskEdit = (task) => {
    const fields = toSprintFields(task, sprints, projects);
    setTaskForm({
      ...fields,
      title: task.title || "",
      description: task.description || "",
      status: task.status || "Backlog",
      priority: task.priority || "Medium",
      assigned_to_name: task.assigned_to_name || "",
      story_points: task.story_points || 0,
      completion_percent: getTaskCompletion(task),
      estimated_hours: task.estimated_hours || "",
      due_date: task.due_date || "",
    });
    setEditingTaskId(task.id);
    setTaskDialog(true);
  };

  const filteredTasks = tasks.filter(
    (t) => sprintFilter === "all" || t.sprint_id === sprintFilter,
  );
  const filteredSprints =
    sprintFilter === "all"
      ? sprints
      : sprints.filter((s) => s.id === sprintFilter);

  // ── Stats ───
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "Done").length;
  const inProgress = tasks.filter((t) => t.status === "In Progress").length;
  const activeSprints = sprints.filter((s) => s.status === "Active").length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading sprints…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Sprints &amp; Tasks
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Plan sprints, manage tasks, and track progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-9 gap-1.5"
            onClick={() => {
              setSprintForm(DEFAULT_SPRINT);
              setEditingSprintId(null);
              setSprintDialog(true);
            }}
          >
            <Plus className="w-4 h-4" /> New Sprint
          </Button>
          <Button
            size="sm"
            className="rounded-xl h-9 gap-1.5"
            onClick={() => {
              setTaskForm(DEFAULT_TASK);
              setEditingTaskId(null);
              setTaskDialog(true);
            }}
          >
            <Plus className="w-4 h-4" /> New Task
          </Button>
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Tasks",
            value: totalTasks,
            icon: ListTodo,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
          },
          {
            label: "Completed",
            value: doneTasks,
            icon: CheckCircle2,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
          },
          {
            label: "In Progress",
            value: inProgress,
            icon: Timer,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
          },
          {
            label: "Active Sprints",
            value: activeSprints,
            icon: Zap,
            color: "text-violet-500",
            bg: "bg-violet-500/10",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3"
          >
            <div
              className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}
            >
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Tab buttons */}
        <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-xl">
          <TabButton
            active={tab === "board"}
            onClick={() => setTab("board")}
            icon={Kanban}
          >
            Board
          </TabButton>
          <TabButton
            active={tab === "list"}
            onClick={() => setTab("list")}
            icon={List}
          >
            List
          </TabButton>
          <TabButton
            active={tab === "sprints"}
            onClick={() => setTab("sprints")}
            icon={Zap}
          >
            Sprints
          </TabButton>
        </div>

        {/* Sprint filter */}
        <Select value={sprintFilter} onValueChange={setSprintFilter}>
          <SelectTrigger className="w-full sm:w-52 rounded-xl h-9">
            <SelectValue placeholder="All Sprints" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sprints</SelectItem>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {getNumberedSprintLabel(s, sprints)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Board View ─────────────────────────────────────────────────── */}
      {tab === "board" &&
        (filteredTasks.length === 0 && tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Kanban className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              Board is empty
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Create your first task to start tracking work
            </p>
            <Button
              size="sm"
              className="rounded-xl gap-1.5"
              onClick={() => {
                setTaskForm(DEFAULT_TASK);
                setEditingTaskId(null);
                setTaskDialog(true);
              }}
            >
              <Plus className="w-4 h-4" /> New Task
            </Button>
          </div>
        ) : (
          <KanbanBoard
            tasks={filteredTasks}
            onEditTask={openTaskEdit}
            onDeleteTask={handleDeleteTask}
            onMoveTask={handleMoveTask}
          />
        ))}

      {/* ── List View ──────────────────────────────────────────────────── */}
      {tab === "list" && (
        <ListView tasks={filteredTasks} onEditTask={openTaskEdit} />
      )}

      {/* ── Sprints View ───────────────────────────────────────────────── */}
      {tab === "sprints" &&
        (filteredSprints.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              No sprints yet
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Create your first sprint to start planning
            </p>
            <Button
              size="sm"
              className="rounded-xl gap-1.5"
              onClick={() => {
                setSprintForm(DEFAULT_SPRINT);
                setEditingSprintId(null);
                setSprintDialog(true);
              }}
            >
              <Plus className="w-4 h-4" /> New Sprint
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredSprints.map((sprint) => (
              <SprintCard
                key={sprint.id}
                sprint={sprint}
                tasks={tasks}
                sprints={sprints}
                onEdit={openSprintEdit}
                onDelete={handleDeleteSprint}
              />
            ))}
          </div>
        ))}

      {/* ── Dialogs ────────────────────────────────────────────────────── */}
      <SprintDialog
        open={sprintDialog}
        onClose={setSprintDialog}
        form={sprintForm}
        setForm={setSprintForm}
        onSave={handleSaveSprint}
        saving={saving}
        isEdit={!!editingSprintId}
        projects={projects}
      />

      <TaskDialog
        open={taskDialog}
        onClose={setTaskDialog}
        form={taskForm}
        setForm={setTaskForm}
        onSave={handleSaveTask}
        saving={saving}
        isEdit={!!editingTaskId}
        projects={projects}
        sprints={sprints}
      />
    </div>
  );
}
