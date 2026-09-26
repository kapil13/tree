# Flutter / Dart
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }
-dontwarn io.flutter.embedding.**

# Gson / JSON (used by some plugins)
-keepattributes Signature
-keepattributes *Annotation*

# Firebase Messaging
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
