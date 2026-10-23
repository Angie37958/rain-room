package app.rainroom.android;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.*;
import android.widget.Toast;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

/** Offline application; only bundled assets may reach the JavaScript bridge. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView web;
    private byte[] pendingCsv;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(239,233,216));
        getWindow().setNavigationBarColor(Color.rgb(239,233,216));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(239,233,216));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        web.addJavascriptInterface(new ExportBridge(), "RainRoomAndroid");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!isLocal(uri) || !"GET".equals(request.getMethod())) return missing();
                String path = uri.getPath().substring("/assets/".length());
                if (path.contains("..") || path.contains("\\") || path.indexOf('\0') >= 0) return missing();
                try {
                    String mime = path.endsWith(".js") ? "text/javascript" : path.endsWith(".css") ? "text/css"
                        : path.endsWith(".html") ? "text/html" : path.endsWith(".mp3") ? "audio/mpeg"
                        : path.endsWith(".svg") ? "image/svg+xml" : path.endsWith(".png") ? "image/png" : path.endsWith(".webp") ? "image/webp"
                        : "application/json";
                    return new WebResourceResponse(mime, "UTF-8", 200, "OK",
                        Collections.singletonMap("Cache-Control", "no-store"), getAssets().open("web/" + path));
                } catch (IOException error) { return missing(); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (isLocal(uri)) return false;
                if ("https".equals(uri.getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (Exception ignored) { }
                }
                return true;
            }
        });
        setContentView(web);
        web.loadUrl("https://" + HOST + "/assets/index.html");
    }

    private static boolean isLocal(Uri uri) {
        return "https".equals(uri.getScheme()) && HOST.equals(uri.getHost())
            && uri.getPath() != null && uri.getPath().startsWith("/assets/");
    }
    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private final class ExportBridge {
        @JavascriptInterface public void exportCsv(String csv) {
            if (csv == null || csv.length() > 2000000 || !csv.startsWith("\ufeffdate,minutes,completed_at")) return;
            runOnUiThread(() -> {
                if (pendingCsv != null) return;
                pendingCsv = csv.getBytes(StandardCharsets.UTF_8);
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("text/csv"); intent.putExtra(Intent.EXTRA_TITLE, "rain-room-focus.csv");
                try { startActivityForResult(intent, 1); }
                catch (Exception error) { pendingCsv = null; toast("无法打开保存窗口，请稍后重试。"); }
            });
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request != 1) return;
        byte[] csv = pendingCsv; pendingCsv = null;
        if (result != RESULT_OK || data == null || data.getData() == null || csv == null) return;
        Uri destination = data.getData();
        new Thread(() -> {
            try (OutputStream stream = getContentResolver().openOutputStream(destination)) {
                if (stream == null) throw new IOException("Missing destination");
                stream.write(csv); runOnUiThread(() -> toast("专注记录已保存。"));
            } catch (IOException error) { runOnUiThread(() -> toast("保存失败，请重试。")); }
        }).start();
    }
    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_SHORT).show(); }
    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override public void onBackPressed() {
        web.evaluateJavascript("(() => { const d=document.querySelector('dialog[open]'); if(d){d.close();return true;} if(matchMedia('(max-width:720px), (max-width:1000px) and (max-height:520px)').matches && document.body.dataset.mobilePanel && document.body.dataset.mobilePanel!=='scene'){document.querySelector('[data-mobile-tab=scene]').click();return true;} if(document.body.classList.contains('immersed')){document.getElementById('immerse').click();return true;} return false; })()",
            handled -> { if (!"true".equals(handled)) super.onBackPressed(); });
    }
    @Override protected void onDestroy() { web.removeJavascriptInterface("RainRoomAndroid"); web.destroy(); super.onDestroy(); }
}
