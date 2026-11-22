package com.sendsnippet.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.net.Uri;
import android.os.IBinder;

import com.google.android.gms.tasks.Tasks;
import com.google.firebase.FirebaseApp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.StorageMetadata;
import com.google.firebase.storage.StorageReference;
import com.google.firebase.storage.UploadTask;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class TransferService extends Service {
    static final String PAUSE = "com.sendsnippet.app.PAUSE_UPLOAD";
    static final String STOP = "com.sendsnippet.app.STOP_UPLOAD";
    private static final String CHANNEL = "uploads";
    private static final int NOTIFICATION = 20;

    static final class State {
        final String text;
        final boolean running;
        final int percent;
        final boolean paused;

        State(String text, boolean running, int percent) {
            this(text, running, percent, false);
        }

        State(String text, boolean running, int percent, boolean paused) {
            this.paused = paused;
            this.text = text;
            this.running = running;
            this.percent = percent;
        }
    }

    static volatile State status = new State("", false, 0);
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private volatile UploadTask active;
    private volatile boolean cancelled;
    private long lastNotification;

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override public void onCreate() {
        super.onCreate();
        getSystemService(NotificationManager.class).createNotificationChannel(
                new NotificationChannel(CHANNEL, "Transfer progress", NotificationManager.IMPORTANCE_LOW));
    }

    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && PAUSE.equals(intent.getAction())) {
            pauseOrResume();
            if (!status.running) stopSelf(startId);
            return START_NOT_STICKY;
        }
        if (intent != null && STOP.equals(intent.getAction())) {
            cancel();
            if (!status.running) stopSelf(startId);
            return START_NOT_STICKY;
        }
        if (status.running) return START_NOT_STICKY;
        cancelled = false;
        status = new State("Preparing transfer…", true, 0);
        startForeground(NOTIFICATION, notification(status.text, 0, true));
        worker.execute(this::upload);
        return START_NOT_STICKY;
    }

    private void upload() {
        FirebaseAuth auth = null;
        String message;
        try {
            JSONObject draft = new JSONObject(TransferData.prefs(this).getString("draft", "{}"));
            String id = draft.getString("id");
            String owner = draft.getString("owner");
            List<TransferData.FileItem> files = TransferData.files(draft.getJSONArray("localFiles"));
            JSONArray manifest = new JSONArray();
            long total = 0;
            for (TransferData.FileItem file : files) {
                total += file.bytes;
                manifest.put(TransferData.json("name", file.name, "size", file.bytes));
            }
            JSONObject created = TransferApi.request("create", TransferData.json(
                    "id", id, "owner", owner, "files", manifest,
                    "text", draft.getString("text"), "lifetime", draft.getInt("lifetime")));
            checkCancelled();
            JSONObject result = created.optJSONObject("transfer");
            if (result == null) {
                JSONArray pending = created.getJSONArray("missing");
                if (pending.length() > 0) {
                    Set<Integer> missing = new HashSet<>();
                    for (int i = 0; i < pending.length(); i++) missing.add(Integer.parseInt(pending.getString(i)));
                    long complete = 0;
                    for (int i = 0; i < files.size(); i++) if (!missing.contains(i)) complete += files.get(i).bytes;
                    FirebaseApp app = TransferApi.firebase(this);
                    auth = FirebaseAuth.getInstance(app);
                    Tasks.await(auth.signInWithCustomToken(created.getString("token")));
                    FirebaseStorage storage = FirebaseStorage.getInstance(app);
                    for (int i = 0; i < pending.length(); i++) {
                        checkCancelled();
                        String index = pending.getString(i);
                        TransferData.FileItem file = files.get(Integer.parseInt(index));
                        StorageReference target = storage.getReference().child("sendsnippet-v2/" + id + "/" + index);
                        sendFile(file, target, id + "." + index, complete, total);
                        complete += file.bytes;
                    }
                }
                checkCancelled();
                update("Creating your share link…", 100, true);
                result = TransferApi.request("complete", TransferData.json("id", id, "owner", owner));
            }
            TransferData.remember(this, result, owner);
            releaseUris(files);
            TransferData.prefs(this).edit().remove("draft").remove("session." + id)
                    .putString("lastReady", result.toString()).apply();
            message = "Transfer ready";
        } catch (CancellationException stopped) {
            message = "Upload stopped. Open SendSnippet to resume.";
        } catch (Exception error) {
            if (cancelled) message = "Upload stopped. Open SendSnippet to resume.";
            else if (error instanceof TransferApi.Failure) message = error.getMessage();
            else if (error instanceof SecurityException || error.getCause() instanceof SecurityException) {
                message = "File access was lost. Discard this draft and select the file again.";
            } else message = "The transfer was interrupted. Open SendSnippet to retry.";
        } finally {
            if (auth != null) auth.signOut();
            active = null;
        }
        status = new State(message, false, 0);
        stopForeground(STOP_FOREGROUND_REMOVE);
        getSystemService(NotificationManager.class).notify(NOTIFICATION, notification(message, 0, false));
        stopSelf();
    }

    private void sendFile(TransferData.FileItem file, StorageReference target, String key,
                          long before, long total) throws Exception {
        String transferId = key.substring(0, key.indexOf('.'));
        String prefKey = "session." + transferId;
        JSONObject sessions = new JSONObject(TransferData.prefs(this).getString(prefKey, "{}"));
        String saved = sessions.optString(key);
        StorageMetadata metadata = new StorageMetadata.Builder()
                .setContentType("application/octet-stream").build();
        UploadTask task;
        if (file.bytes == 0) {
            task = target.putBytes(new byte[0], metadata);
        } else if (saved.isEmpty()) {
            task = target.putFile(file.uri, metadata);
        } else {
            task = target.putFile(file.uri, metadata, Uri.parse(saved));
        }
        active = task;
        if (cancelled) task.cancel();
        task.addOnProgressListener(workerCallback(), info -> {
            Uri session = info.getUploadSessionUri();
            if (session != null && !session.toString().equals(sessions.optString(key))) {
                try {
                    sessions.put(key, session.toString());
                    TransferData.prefs(this).edit().putString(prefKey, sessions.toString()).apply();
                } catch (org.json.JSONException ignored) {}
            }
            if (active != task || cancelled || status.paused) return;
            long sent = before + info.getBytesTransferred();
            int percent = total == 0 ? 0 : (int) (100 * sent / total);
            update(info.getBytesTransferred() == 0 ? "Uploading " + file.name
                    : TransferData.size(sent) + " of " + TransferData.size(total), percent, false);
        });
        try {
            Tasks.await(task);
        } catch (Exception error) {
            // If the server discarded a saved session, the next retry can start a fresh one.
            if (!cancelled && !saved.isEmpty()) {
                sessions.remove(key);
                TransferData.prefs(this).edit().putString(prefKey, sessions.toString()).apply();
            }
            throw error;
        } finally {
            active = null;
        }
    }

    private java.util.concurrent.Executor workerCallback() {
        return Runnable::run;
    }

    private void checkCancelled() {
        if (cancelled) throw new CancellationException();
    }

    private void cancel() {
        cancelled = true;
        UploadTask task = active;
        if (task != null) task.cancel();
    }

    private void pauseOrResume() {
        UploadTask task = active;
        if (task == null) return;
        int percent = status.percent;
        if (status.paused) {
            if (task.resume()) update("Resuming upload…", percent, true);
        } else if (task.pause()) {
            status = new State("Upload paused", true, percent, true);
            getSystemService(NotificationManager.class).notify(NOTIFICATION, notification(status.text, percent, true));
        }
    }

    private void update(String message, int percent, boolean force) {
        status = new State(message, true, percent);
        long now = android.os.SystemClock.elapsedRealtime();
        if (force || now - lastNotification >= 700) {
            lastNotification = now;
            getSystemService(NotificationManager.class).notify(NOTIFICATION, notification(message, percent, true));
        }
    }

    @Override public void onTimeout(int startId, int serviceType) {
        cancel();
        stopSelf(startId);
    }

    private Notification notification(String message, int percent, boolean ongoing) {
        Intent open = new Intent(this, MainActivity.class).setAction(MainActivity.SEND)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPending = PendingIntent.getActivity(this, 10, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder build = new Notification.Builder(this, CHANNEL)
                .setSmallIcon(R.drawable.ic_tile).setContentTitle("SendSnippet")
                .setContentText(message).setStyle(new Notification.BigTextStyle().bigText(message))
                .setContentIntent(openPending).setOngoing(ongoing).setAutoCancel(!ongoing).setOnlyAlertOnce(true);
        if (ongoing) {
            PendingIntent pause = PendingIntent.getService(this, 11, new Intent(this, TransferService.class).setAction(PAUSE),
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            build.setProgress(100, percent, percent == 0).addAction(
                    new Notification.Action.Builder(null, status.paused ? "Resume" : "Pause", pause).build());
        }
        return build.build();
    }

    void releaseUris(List<TransferData.FileItem> files) {
        for (TransferData.FileItem file : files) {
            try {
                getContentResolver().releasePersistableUriPermission(file.uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } catch (SecurityException ignored) {}
        }
    }

    @Override public void onDestroy() {
        worker.shutdown();
        super.onDestroy();
    }
}
