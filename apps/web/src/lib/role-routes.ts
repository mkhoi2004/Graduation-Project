const roleRoutes: Record<string, string> = {
  ADMIN: '/admin',
  RECEPTION_STAFF: '/reception',
  DOCTOR: '/doctor',
  WAREHOUSE_MANAGEMENT: '/warehouse',
  ACCOUNTING_STAFF: '/accounting',
}

export function getRoleRoute(role: string): string {
  return roleRoutes[role] ?? '/login'
}
