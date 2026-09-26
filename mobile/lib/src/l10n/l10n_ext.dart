import 'package:byot_mobile/l10n/app_localizations.dart';
import 'package:flutter/widgets.dart';

extension L10nBuildContext on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this)!;
}
