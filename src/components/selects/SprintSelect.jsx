import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  filterSprintsByProject,
  getSprintLabel,
} from "@/lib/firestoreQueries";

export default function SprintSelect({
  sprints = [],
  projectId = "",
  value = "",
  displayName = "",
  onValueChange,
  label = "Sprint",
  required = false,
  placeholder = "Select a sprint",
  className,
}) {
  const filtered = filterSprintsByProject(sprints, projectId);
  const options = projectId ? filtered : sprints;
  const selectedId = value ? String(value) : "";
  const matched = options.find((s) => s.id === selectedId);
  const sprintLabel = (sprint) => {
    const index = options.findIndex((s) => s.id === sprint.id);
    const name = getSprintLabel(sprint);
    return name.startsWith("Sprint ") ? name : `Sprint ${index + 1} - ${name}`;
  };
  const resolvedLabel =
    (matched ? sprintLabel(matched) : "") || displayName || "";

  const handleChange = (sprintId) => {
    if (sprintId === "__none") {
      onValueChange({ sprint_id: "", sprint_name: "" });
      return;
    }
    const sprint = options.find((s) => s.id === sprintId);
    onValueChange({
      sprint_id: sprintId,
      sprint_name: sprint ? sprintLabel(sprint) : "",
    });
  };

  const selectValue = selectedId || "__none";

  return (
    <div className={className}>
      {label && (
        <Label>
          {label}
          {required ? " *" : ""}
        </Label>
      )}
      <Select value={selectValue} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">None</SelectItem>
          {selectedId && !matched && resolvedLabel && (
            <SelectItem value={selectedId}>{resolvedLabel}</SelectItem>
          )}
          {options.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {sprintLabel(s)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
