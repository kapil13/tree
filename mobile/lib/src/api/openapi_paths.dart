/// OpenAPI-derived endpoint catalog for the mobile client.
/// Regenerate from `GET /openapi.json` when the API changes materially.
library;

class OpenApiPaths {
  OpenApiPaths._();

  static const authLogin = '/auth/login';
  static const authOtpRequest = '/auth/otp/request';
  static const authOtpVerify = '/auth/otp/verify';
  static const authRefresh = '/auth/refresh';
  static const authLogout = '/auth/logout';
  static const authSignup = '/auth/signup';
  static const authGoogle = '/auth/google';
  static const authForgotPassword = '/auth/forgot-password';
  static const authResetPassword = '/auth/reset-password';

  static const trees = '/trees';
  static const treeByCode = '/trees/by-code';
  static const treeAnalysis = '/tree-analysis';
  static const satelliteHealthLatest = '/satellite-health/trees';
  static const alerts = '/alerts';
  static const dashboard = '/dashboard';
  static const fieldOpsSummary = '/planting-projects/field-ops-summary';
  static const monitoringSummary = '/planting-projects/monitoring-summary';
  static const complianceViolations = '/compliance/violations';
  static const devicesRegister = '/devices/register';
  static const analyticsEvents = '/devices/analytics/events';
  static const bioacousticRecordings = '/bioacoustic/recordings';
  static const plantingProgramsMemberships = '/planting-programs/me/memberships';
}
