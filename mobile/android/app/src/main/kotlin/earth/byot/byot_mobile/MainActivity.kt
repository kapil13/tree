package earth.byot.byot_mobile

import android.view.WindowManager
import io.flutter.embedding.android.FlutterFragmentActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

/// FragmentActivity is required for local_auth biometric prompts on Android.
class MainActivity : FlutterFragmentActivity() {
    private val channelName = "earth.byot.byot_mobile/security"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "setScreenshotBlocked" -> {
                        val blocked = call.arguments as? Boolean ?: false
                        if (blocked) {
                            window.setFlags(
                                WindowManager.LayoutParams.FLAG_SECURE,
                                WindowManager.LayoutParams.FLAG_SECURE,
                            )
                        } else {
                            window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                        }
                        result.success(true)
                    }
                    "isScreenshotBlocked" -> {
                        val flags = window.attributes.flags
                        val blocked =
                            (flags and WindowManager.LayoutParams.FLAG_SECURE) != 0
                        result.success(blocked)
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
