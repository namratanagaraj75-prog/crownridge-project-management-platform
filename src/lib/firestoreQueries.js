import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";

const mapDocs = (snap) =>
  snap.docs.map((d) => ({ id: d.id, ...d.data() }));

export async function fetchClients() {
  const snap = await getDocs(collection(db, "clients"));
  return mapDocs(snap);
}

export async function fetchProjects() {
  const snap = await getDocs(collection(db, "projects"));
  return mapDocs(snap);
}

export async function fetchProjectsForUser(role, userProfile = {}) {
  const uid = userProfile?.uid || userProfile?.id || "";
  const clientId = userProfile?.client_id || userProfile?.clientId || "";

  if (["admin", "project_manager"].includes(role)) {
    return fetchProjects();
  }

  if (role === "client" && clientId) {
    const snap = await getDocs(
      query(collection(db, "projects"), where("client_id", "==", clientId)),
    );
    return mapDocs(snap);
  }

  if (["developer", "qa"].includes(role) && uid) {
    const assignmentFields =
      role === "qa"
        ? ["assigned_user_ids", "assigned_users", "team_member_ids", "qa_ids", "tester_ids"]
        : ["assigned_user_ids", "assigned_users", "team_member_ids", "developer_ids"];
    const results = await Promise.allSettled(
      assignmentFields.map((field) =>
        getDocs(query(collection(db, "projects"), where(field, "array-contains", uid))),
      ),
    );
    const docs = results
      .filter((result) => result.status === "fulfilled")
      .flatMap((result) => mapDocs(result.value));
    return Array.from(new Map(docs.map((item) => [item.id, item])).values());
  }

  return [];
}

export async function fetchSprints() {
  const snap = await getDocs(collection(db, "sprints"));
  return mapDocs(snap);
}

export function getClientLabel(client) {
  return client?.name || client?.company || "Unnamed Client";
}

export function getProjectLabel(project) {
  return project?.name || "Unnamed Project";
}

export function getSprintLabel(sprint) {
  return sprint?.name || "Unnamed Sprint";
}

export function resolveProjectId(record, projects = []) {
  const direct = record?.project_id || record?.projectId;
  if (direct) return String(direct);

  const name = record?.project_name || record?.projectName;
  if (name && projects.length) {
    const match = projects.find(
      (p) => p.name === name || getProjectLabel(p) === name,
    );
    if (match) return match.id;
  }

  return "";
}

export function resolveProjectName(record, projects = []) {
  const projectId = resolveProjectId(record, projects);
  if (projectId) {
    const project = projects.find((p) => p.id === projectId);
    if (project) return getProjectLabel(project);
  }
  return record?.project_name || record?.projectName || "";
}

export function resolveClientId(record, clients = []) {
  const direct = record?.client_id || record?.clientId;
  if (direct) return String(direct);

  const name = record?.client_name || record?.clientName;
  if (name && clients.length) {
    const match = clients.find(
      (c) => c.name === name || getClientLabel(c) === name,
    );
    if (match) return match.id;
  }

  return "";
}

export function resolveClientName(record, clients = []) {
  const clientId = resolveClientId(record, clients);
  if (clientId) {
    const client = clients.find((c) => c.id === clientId);
    if (client) return getClientLabel(client);
  }
  return record?.client_name || record?.clientName || "";
}

export function resolveSprintId(record, sprints = []) {
  const direct = record?.sprint_id || record?.sprintId;
  if (direct) return String(direct);

  const name = record?.sprint_name || record?.sprintName;
  if (name && sprints.length) {
    const match = sprints.find(
      (s) => s.name === name || getSprintLabel(s) === name,
    );
    if (match) return match.id;
  }

  return "";
}

export function resolveSprintName(record, sprints = []) {
  const sprintId = resolveSprintId(record, sprints);
  if (sprintId) {
    const sprint = sprints.find((s) => s.id === sprintId);
    if (sprint) return getSprintLabel(sprint);
  }
  return record?.sprint_name || record?.sprintName || "";
}

export function toProjectFields(record, projects = []) {
  const project_id = resolveProjectId(record, projects);
  return {
    project_id,
    project_name: resolveProjectName({ ...record, project_id }, projects),
  };
}

export function toClientFields(record, clients = []) {
  const client_id = resolveClientId(record, clients);
  return {
    client_id,
    client_name: resolveClientName({ ...record, client_id }, clients),
  };
}

export function toSprintFields(record, sprints = [], projects = []) {
  const sprint_id = resolveSprintId(record, sprints);
  return {
    ...toProjectFields(record, projects),
    sprint_id,
    sprint_name: resolveSprintName({ ...record, sprint_id }, sprints),
  };
}

export function enrichRecordRelations(
  record,
  { projects = [], clients = [], sprints = [] } = {},
) {
  return {
    ...record,
    ...toProjectFields(record, projects),
    ...toClientFields(record, clients),
    ...(sprints.length
      ? {
          sprint_id: resolveSprintId(record, sprints),
          sprint_name: resolveSprintName(record, sprints),
        }
      : {}),
  };
}

export function filterSprintsByProject(sprints, projectId) {
  if (!projectId) return [];
  return sprints.filter(
    (s) => resolveProjectId(s, []) === String(projectId) || s.project_id === projectId,
  );
}

/** Raw completion percentage: completedTasks / totalTasks * 100 */
export function getSprintProgressPercent(completedCount, totalCount) {
  if (!totalCount) return 0;
  return Math.min(100, Math.round((completedCount / totalCount) * 100));
}

/** Snap sprint task completion to quarter increments for display (0, 25, 50, 75, 100). */
export function sprintCompletionPercent(completedCount, totalCount) {
  if (!totalCount) return 0;
  const raw = (completedCount / totalCount) * 100;
  return Math.min(100, Math.round(raw / 25) * 25);
}
