import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getProjectLabel } from "@/lib/firestoreQueries";

export default function ProjectSelect({
  projects = [],
  value = "",
  displayName = "",
  onValueChange,
  label = "Project",
  required = false,
  placeholder = "Select",
  className,
}) {
  const selectedId = value ? String(value) : "";
  const matched = projects.find((p) => p.id === selectedId);
  const resolvedLabel =
    (matched ? getProjectLabel(matched) : "") || displayName || "";

  const handleChange = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    onValueChange({
      project_id: projectId,
      project_name: project ? getProjectLabel(project) : "",
    });
  };

  return (
    <div className={className}>
      {label && (
        <Label>
          {label}
          {required ? " *" : ""}
        </Label>
      )}
      <Select
        value={selectedId || undefined}
        onValueChange={handleChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {selectedId && !matched && resolvedLabel && (
            <SelectItem value={selectedId}>{resolvedLabel}</SelectItem>
          )}
          {projects.length === 0 ? (
            <SelectItem value="__empty" disabled>
              No projects available
            </SelectItem>
          ) : (
            projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {getProjectLabel(p)}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
