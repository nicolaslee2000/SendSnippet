package com.sendsnippet.app;

import android.content.Context;

import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.storage.FirebaseStorage;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

final class TransferApi {
    static final class Failure extends IOException {
        final int status;
        Failure(int status, String message) { super(message); this.status = status; }
    }

    static JSONObject request(String operation, JSONObject params) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(BuildConfig.BASE_URL + "/api/" + operation).openConnection();
        try {
            connection.setConnectTimeout(15_000);
            connection.setReadTimeout(45_000);
            connection.setInstanceFollowRedirects(false);
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setDoOutput(true);
            byte[] body = params.toString().getBytes(StandardCharsets.UTF_8);
            connection.setFixedLengthStreamingMode(body.length);
            try (java.io.OutputStream output = connection.getOutputStream()) { output.write(body); }
            int status = connection.getResponseCode();
            try (InputStream input = status < 400 ? connection.getInputStream() : connection.getErrorStream()) {
                JSONObject result = new JSONObject(input == null ? "{}" : read(input));
                if (status < 200 || status >= 300) {
                    throw new Failure(status, result.optString("error", "SendSnippet couldn’t complete this request."));
                }
                return result;
            }
        } finally { connection.disconnect(); }
    }

    private static String read(InputStream input) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        for (int count; (count = input.read(buffer)) != -1; ) {
            if (output.size() + count > 512 * 1024) throw new IOException("The transfer response was too large.");
            output.write(buffer, 0, count);
        }
        return new String(output.toByteArray(), StandardCharsets.UTF_8);
    }

    static synchronized FirebaseApp firebase(Context context) {
        try { return FirebaseApp.getInstance(); }
        catch (IllegalStateException noApp) {
            boolean local = BuildConfig.LOCAL_EMULATOR;
            FirebaseApp app = FirebaseApp.initializeApp(context.getApplicationContext(), new FirebaseOptions.Builder()
                    .setProjectId(local ? "demo-sendsnippet" : "sendsnippet")
                    .setApiKey(local ? "local-development" : "AIzaSyCpCHEMoYUD3R99m1hit_KqDHnwnlCXqR8")
                    .setApplicationId("1:465404866710:android:044d725ecb81786d9dd2b7")
                    .setStorageBucket("sendsnippet-transfer-eu").build());
            FirebaseAuth auth = FirebaseAuth.getInstance(app);
            FirebaseStorage storage = FirebaseStorage.getInstance(app);
            if (local) {
                auth.useEmulator("10.0.2.2", 9189);
                storage.useEmulator("10.0.2.2", 9198);
            }
            storage.setMaxUploadRetryTimeMillis(120_000);
            return app;
        }
    }

    private TransferApi() {}
}
