export const ROLES = {
  ADMIN: "admin",
  PROJECT_MANAGER: "project_manager",
  DEVELOPER: "developer",
  QA: "qa",
  SUPPORT: "support",
  CLIENT: "client",
};

export const ROLE_ACCESS = {
  dashboard: [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.DEVELOPER,
    ROLES.QA,
    ROLES.SUPPORT,
    ROLES.CLIENT,
  ],
  leads: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  clients: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.SUPPORT],
  projects: [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.DEVELOPER,
    ROLES.QA,
    ROLES.CLIENT,
  ],
  billing: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  invoices: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.CLIENT],
  sprints: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.DEVELOPER, ROLES.QA],
  timesheets: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.DEVELOPER],
  support: [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.QA,
    ROLES.SUPPORT,
    ROLES.CLIENT,
  ],
  amc: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.CLIENT],
  aiTools: [ROLES.ADMIN, ROLES.PROJECT_MANAGER, ROLES.DEVELOPER, ROLES.QA],
  analytics: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  users: [ROLES.ADMIN],
  notifications: [
    ROLES.ADMIN,
    ROLES.PROJECT_MANAGER,
    ROLES.DEVELOPER,
    ROLES.QA,
    ROLES.SUPPORT,
    ROLES.CLIENT,
  ],
  messaging: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
  reports: [ROLES.ADMIN, ROLES.PROJECT_MANAGER],
};

export const canAccess = (role, permission) =>
  Boolean(role && ROLE_ACCESS[permission]?.includes(role));

export const isAdmin = (role) => role === ROLES.ADMIN;
export const isProjectManager = (role) => role === ROLES.PROJECT_MANAGER;
export const isAdminOrProjectManager = (role) =>
  isAdmin(role) || isProjectManager(role);
