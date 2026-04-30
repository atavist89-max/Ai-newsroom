package com.ainewsroom.app;

import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        registerPlugin(PipelineStatusPlugin.class);
        Log.d(TAG, "MainActivity created — keep screen on enabled, PipelineStatusPlugin registered");
    }

    @Override
    public void onPause() {
        super.onPause();
        // BridgeActivity.onPause() pauses WebView timers, stopping all JS execution
        // (setTimeout, fetch, SSE parsing). The foreground service keeps the process
        // alive but the WebView itself is frozen. Resume timers immediately so the
        // pipeline continues running when the app is backgrounded.
        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().resumeTimers();
            Log.d(TAG, "onPause — resumed WebView timers for background execution");
        }
    }
}
