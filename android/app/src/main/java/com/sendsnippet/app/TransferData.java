package com.sendsnippet.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.AssetFileDescriptor;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

final class TransferData {
    static final long GIB = 1L << 30;
    static final int MAX_TEXT = 64 * 1024;
    private static final SecureRandom RANDOM = new SecureRandom();

    static JSONObject json(Object... fields) {
        JSONObject result = new JSONObject();
        try {
            for (int i = 0; i < fields.length; i += 2) result.put((String) fields[i], fields[i + 1]);
        } catch (JSONException invalid) {
            throw new IllegalArgumentException(invalid);
        }
        return result;
    }

    static String randomKey(int length) {
        byte[] bytes = new byte[length];
        RANDOM.nextBytes(bytes);
        return Base64.encodeToString(bytes, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
    }

    static String idFor(String value) {
        try {
            byte[] digest = java.security.MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return Base64.encodeToString(digest, 0, 24, Base64.URL_SAFE | Base64.NO_PADDING | Base64.NO_WRAP);
        } catch (java.security.NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    static String link(String id) {
        String origin = BuildConfig.LOCAL_EMULATOR ? BuildConfig.BASE_URL : "https://sendsnippet.firebaseapp.com";
        return origin + "/receive#" + id;
    }

    static JSONObject credential(String input) {
        String value = input.trim();
        Uri link = Uri.parse(value);
        String id = link.getFragment();
        if (id != null && id.matches("[\\w-]{32}") && "/receive".equals(link.getPath())) {
            boolean production = "https".equals(link.getScheme()) && ("sendsnippet.web.app".equals(link.getHost())
                    || "sendsnippet.firebaseapp.com".equals(link.getHost()));
            boolean emulator = BuildConfig.LOCAL_EMULATOR && "http".equals(link.getScheme())
                    && java.util.Arrays.asList("localhost", "127.0.0.1", "10.0.2.2").contains(link.getHost()) && link.getPort() == 5075;
            if (production || emulator) return json("id", id);
        }
        String code = value.toUpperCase(Locale.ROOT).replaceAll("[\\s-]", "")
                .replace('O', '0').replace('I', '1').replace('L', '1');
        if (code.matches("(?:[0-9]{4}|[0-9A-HJKMNP-TV-Z]{8})")) return json("code", code);
        throw new IllegalArgumentException("Enter a 4-digit code or a SendSnippet link.");
    }

    static long codeExpiry(JSONObject transfer) {
        return transfer.optLong("codeExpiresAt", transfer.optLong("expiresAt"));
    }

    static String formatCode(String value) {
        return value.length() == 8 ? value.substring(0, 4) + " " + value.substring(4) : value;
    }

    static String size(long bytes) {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024L) return String.format(Locale.getDefault(), "%.1f KiB", bytes / 1024.0);
        if (bytes < GIB) return String.format(Locale.getDefault(), "%.1f MiB", bytes / (1024.0 * 1024));
        return String.format(Locale.getDefault(), "%.1f GiB", bytes / (double) GIB);
    }

    static String expires(long timestamp) {
        long seconds = Math.max(0, (timestamp - System.currentTimeMillis() + 999) / 1000);
        if (seconds == 0) return "Expired";
        if (seconds >= 3600) return seconds / 3600 + "h " + (seconds % 3600 / 60) + "m left";
        if (seconds >= 60) return seconds / 60 + "m " + seconds % 60 + "s left";
        return seconds + "s left";
    }

    static String label(JSONObject transfer) {
        JSONArray files = transfer.optJSONArray("files");
        if (files == null || files.length() == 0) return "Text snippet";
        if (files.length() == 1) return files.optJSONObject(0).optString("name");
        return files.length() + " files" + (transfer.optString("text").isEmpty() ? "" : " + text");
    }

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences("sendsnippet", Context.MODE_PRIVATE);
    }

    static final class FileItem {
        final Uri uri;
        final String name;
        final long bytes;

        FileItem(Uri uri, String name, long bytes) {
            this.uri = uri;
            this.name = name;
            this.bytes = bytes;
        }

        JSONObject stored() { return json("uri", uri.toString(), "name", name, "size", bytes); }
    }

    static FileItem describe(Context context, Uri uri) throws Exception {
        if (!"content".equals(uri.getScheme())) throw new IllegalArgumentException("Choose a file from Android’s file picker.");
        String name = "File";
        long bytes = -1;
        try (Cursor cursor = context.getContentResolver().query(uri,
                new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameCol = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int sizeCol = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (nameCol >= 0 && !cursor.isNull(nameCol)) name = cursor.getString(nameCol);
                if (sizeCol >= 0 && !cursor.isNull(sizeCol)) bytes = cursor.getLong(sizeCol);
            }
        }
        if (bytes < 0) {
            try (AssetFileDescriptor descriptor = context.getContentResolver().openAssetFileDescriptor(uri, "r")) {
                if (descriptor != null) bytes = descriptor.getLength();
            }
        }
        if (bytes < 0) throw new IllegalArgumentException("Save " + name + " to your phone first, then select it again.");
        return new FileItem(uri, name, bytes);
    }

    static List<FileItem> files(JSONArray stored) throws JSONException {
        List<FileItem> items = new ArrayList<>();
        for (int index = 0; index < stored.length(); index++) {
            JSONObject file = stored.getJSONObject(index);
            items.add(new FileItem(Uri.parse(file.getString("uri")), file.getString("name"), file.getLong("size")));
        }
        return items;
    }

    static JSONArray storeFiles(List<FileItem> items) {
        JSONArray files = new JSONArray();
        for (FileItem file : items) files.put(file.stored());
        return files;
    }

    static JSONArray history(Context context) {
        try { return new JSONArray(prefs(context).getString("history", "[]")); }
        catch (JSONException ignored) { return new JSONArray(); }
    }

    static synchronized void remember(Context context, JSONObject transfer, String owner) {
        String id = transfer.optString("id");
        JSONArray previous = history(context);
        JSONObject row = json("id", id, "label", label(transfer), "expiresAt", transfer.optLong("expiresAt"),
                "direction", owner == null ? "Received" : "Sent");
        if (owner != null) {
            row = json("id", id, "label", label(transfer), "expiresAt", transfer.optLong("expiresAt"),
                    "direction", "Sent", "owner", owner, "code", transfer.optString("code"),
                    "codeExpiresAt", codeExpiry(transfer));
        }
        for (int i = 0; owner == null && i < previous.length(); i++) {
            JSONObject found = previous.optJSONObject(i);
            if (found != null && id.equals(found.optString("id")) && found.has("owner")) row = found;
        }
        JSONArray result = new JSONArray().put(row);
        for (int i = 0; i < previous.length() && result.length() < 30; i++) {
            JSONObject prior = previous.optJSONObject(i);
            if (prior != null && !id.equals(prior.optString("id"))) result.put(prior);
        }
        prefs(context).edit().putString("history", result.toString()).apply();
    }

    static synchronized void forget(Context context, String id) {
        JSONArray previous = history(context);
        JSONArray result = new JSONArray();
        for (int i = 0; i < previous.length(); i++) {
            JSONObject prior = previous.optJSONObject(i);
            if (prior != null && !id.equals(prior.optString("id"))) result.put(prior);
        }
        prefs(context).edit().putString("history", result.toString()).apply();
    }

    private TransferData() {}
}
