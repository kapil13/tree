/// Role-based navigation helpers mirroring frontend/lib/nav-access.ts
library;

const professionalRoles = {'government', 'corporate', 'ngo', 'field_supervisor'};
const fieldWorkerRoles = {'field_worker'};

bool userHasProfessionalAccess(Map<String, dynamic>? user) {
  if (user == null) return false;
  if (user['has_professional_program'] == true) return true;
  final role = user['role'] as String?;
  return role != null && professionalRoles.contains(role);
}

bool isOrgViewer(Map<String, dynamic>? user) {
  return user?['org_role'] == 'viewer';
}

bool canWriteInApp(Map<String, dynamic>? user) {
  if (user == null) return false;
  if (user['role'] == 'admin') return true;
  return !isOrgViewer(user);
}

bool canSeeProjects(Map<String, dynamic>? user) {
  if (user == null) return false;
  final role = user['role'] as String?;
  if (role == 'field_worker') return true;
  if (user['org_role'] == 'supervisor' || role == 'field_supervisor') return true;
  return userHasProfessionalAccess(user);
}

bool canSeeFieldProjectsCard(Map<String, dynamic>? user) {
  return canSeeProjects(user);
}

bool canAddTrees(Map<String, dynamic>? user) {
  return canWriteInApp(user);
}
