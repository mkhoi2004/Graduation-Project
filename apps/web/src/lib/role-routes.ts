const roleRoutes: Record<string, string> = {
  ADMIN: '/admin',
  RECEPTION_STAFF: '/reception',
  DOCTOR: '/doctor',
  WAREHOUSE_MANAGEMENT: '/warehouse',
  ACCOUNTING_STAFF: '/accounting',
  HR: '/hr',
  HR_STAFF: '/hr',
  MANAGER: '/hr',
}

export function getRoleRoute(role: string): string {
  return roleRoutes[role] ?? '/login'
}
