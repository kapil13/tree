/// Role-based navigation helpers mirroring frontend/lib/nav-access.ts
library;

typedef UserMap = Map<String, dynamic>;

const professionalRoles = {'government', 'corporate', 'ngo', 'field_supervisor'};
const fieldWorkerRoles = {'field_worker'};

bool userHasProfessionalAccess(UserMap? user) {
  if (user == null) return false;
  if (user['has_professional_program'] == true) return true;
  final role = user['role'] as String?;
  return role != null && professionalRoles.contains(role);
}

bool isOrgAdmin(UserMap? user) {
  return user?['is_org_admin'] == true && user?['organization_id'] != null;
}

bool isOrgViewer(UserMap? user) {
  return user?['org_role'] == 'viewer';
}

bool canWriteInApp(UserMap? user) {
  if (user == null) return false;
  if (user['role'] == 'admin') return true;
  return !isOrgViewer(user);
}

bool canGenerateReports(UserMap? user) {
  return canWriteInApp(user) &&
      (userHasProfessionalAccess(user) || user?['role'] == 'field_supervisor');
}

bool isFieldWorkerHome(UserMap? user) {
  if (user == null) return false;
  if (user['role'] == 'field_worker') return true;
  if (user['org_role'] == 'worker') return true;
  return false;
}

bool isSupervisor(UserMap? user) {
  if (user == null) return false;
  return user['role'] == 'field_supervisor' || user['org_role'] == 'supervisor';
}

bool canSeeNavItem(
  UserMap? user,
  Object audience, {
  bool excludeViewers = false,
}) {
  if (user == null) return false;
  final audiences = audience is List ? audience : [audience];
  if (audiences.contains('all')) return true;
  if (excludeViewers && isOrgViewer(user)) return false;

  final professional = userHasProfessionalAccess(user);
  final fieldWorker = fieldWorkerRoles.contains(user['role']);
  final supervisor = isSupervisor(user);
  final orgAdmin = isOrgAdmin(user);

  for (final a in audiences) {
    switch (a) {
      case 'byot':
        if (!professional) return true;
      case 'professional':
        if (professional) return true;
      case 'field_worker':
        if (fieldWorker || supervisor || professional) return true;
      case 'field_supervisor':
        if (supervisor || professional) return true;
      case 'org_admin':
        if (orgAdmin || user['role'] == 'admin') return true;
      case 'can_write':
        if (canWriteInApp(user)) return true;
      default:
        return true;
    }
  }
  return false;
}

bool canSeeProjects(UserMap? user) {
  return canSeeNavItem(user, ['professional', 'field_supervisor', 'field_worker']);
}

bool canSeeFieldProjectsCard(UserMap? user) => canSeeProjects(user);

bool canAddTrees(UserMap? user) => canWriteInApp(user);

bool canSeeBioacoustic(UserMap? user) => canSeeNavItem(user, 'professional');

bool canSeeExecutiveHome(UserMap? user) {
  if (user == null) return false;
  if (isFieldWorkerHome(user)) return false;
  return userHasProfessionalAccess(user) || user['role'] == 'admin';
}
