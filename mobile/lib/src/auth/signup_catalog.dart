import 'package:flutter/material.dart';

/// Signup program categories — short labels for mobile UX.
class SignupCategory {
  const SignupCategory({
    required this.code,
    required this.title,
    required this.hint,
    required this.icon,
  });

  final String code;
  final String title;
  final String hint;
  final IconData icon;
}

const signupCategories = [
  SignupCategory(
    code: 'byot',
    title: 'Citizen',
    hint: 'Trees & land',
    icon: Icons.park_outlined,
  ),
  SignupCategory(
    code: 'government_nhai',
    title: 'Government',
    hint: 'NHAI & public',
    icon: Icons.account_balance_outlined,
  ),
  SignupCategory(
    code: 'corporate_esg',
    title: 'Corporate',
    hint: 'ESG & CSR',
    icon: Icons.apartment_outlined,
  ),
  SignupCategory(
    code: 'ngo_community',
    title: 'NGO',
    hint: 'Community',
    icon: Icons.groups_outlined,
  ),
];

SignupCategory categoryByCode(String code) {
  return signupCategories.firstWhere(
    (c) => c.code == code,
    orElse: () => signupCategories.first,
  );
}
