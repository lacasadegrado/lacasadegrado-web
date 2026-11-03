export const NOTIFICATIONS = {
  /** How many the bell lists; older ones stay in the table. */
  listLimit: 30,
  /** The bell asks for new ones this often while the admin has the page open. */
  pollMs: 60_000,
  api: "/api/admin/notifications",
} as const;
