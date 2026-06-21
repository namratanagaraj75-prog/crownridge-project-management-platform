import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { getClientLabel } from "@/lib/firestoreQueries";

export default function ClientSelect({
  clients = [],
  value = "",
  displayName = "",
  onValueChange,
  label = "Client",
  required = false,
  placeholder = "Select",
  className,
}) {
  const selectedId = value ? String(value) : "";
  const matched = clients.find((c) => c.id === selectedId);
  const resolvedLabel =
    (matched ? getClientLabel(matched) : "") || displayName || "";

  const handleChange = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    onValueChange({
      client_id: clientId,
      client_name: client ? getClientLabel(client) : "",
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
      <Select value={selectedId || undefined} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {selectedId && !matched && resolvedLabel && (
            <SelectItem value={selectedId}>{resolvedLabel}</SelectItem>
          )}
          {clients.length === 0 ? (
            <SelectItem value="__empty" disabled>
              No clients available
            </SelectItem>
          ) : (
            clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {getClientLabel(c)}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
