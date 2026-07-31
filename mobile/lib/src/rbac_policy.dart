/// Role sets from shared/rbac-policy.json — keep in sync via backend/tests/test_rbac_policy_sync.py
library;

const professionalRoles = <String>{
  'government',
  'corporate',
  'ngo',
  'field_supervisor',
};

const fieldWorkerRoles = <String>{'field_worker'};

const platformAdminRole = 'admin';
