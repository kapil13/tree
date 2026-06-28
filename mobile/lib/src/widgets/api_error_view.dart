import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../api/api_client.dart';

class ApiErrorView extends StatelessWidget {
  const ApiErrorView({
    super.key,
    required this.error,
    this.onRetry,
  });

  final Object error;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final unauthorized = ApiClient.isUnauthorized(error);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(ApiClient.errorMessage(error), textAlign: TextAlign.center),
            const SizedBox(height: 16),
            if (unauthorized)
              FilledButton(
                onPressed: () => context.go('/login'),
                child: const Text('Sign in'),
              )
            else if (onRetry != null)
              FilledButton(
                onPressed: onRetry,
                child: const Text('Retry'),
              ),
          ],
        ),
      ),
    );
  }
}
