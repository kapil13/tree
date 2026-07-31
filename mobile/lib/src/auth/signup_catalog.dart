/// Signup program categories — aligned with web program catalog.

class SignupCategory {
  const SignupCategory({
    required this.code,
    required this.title,
    required this.subtitle,
    required this.emoji,
    required this.audience,
  });

  final String code;
  final String title;
  final String subtitle;
  final String emoji;
  final String audience;
}

const signupCategories = [
  SignupCategory(
    code: 'byot',
    title: 'Citizen & landowner',
    subtitle: 'Register trees, track carbon, and monitor your plantation.',
    emoji: '🌳',
    audience: 'Individuals, farmers, societies',
  ),
  SignupCategory(
    code: 'government_nhai',
    title: 'Government & NHAI',
    subtitle: 'Compliance-ready packages for highways and public greening.',
    emoji: '🏛️',
    audience: 'NHAI, forest departments, ULBs',
  ),
  SignupCategory(
    code: 'corporate_esg',
    title: 'Corporate ESG',
    subtitle: 'Portfolio dashboards, credits, and audit evidence.',
    emoji: '🏢',
    audience: 'CSR, sustainability, ESG teams',
  ),
  SignupCategory(
    code: 'ngo_community',
    title: 'NGO & community',
    subtitle: 'Coordinate volunteers, field workers, and community blocks.',
    emoji: '🤝',
    audience: 'NGOs, SHGs, community forests',
  ),
];

SignupCategory categoryByCode(String code) {
  return signupCategories.firstWhere(
    (c) => c.code == code,
    orElse: () => signupCategories.first,
  );
}
