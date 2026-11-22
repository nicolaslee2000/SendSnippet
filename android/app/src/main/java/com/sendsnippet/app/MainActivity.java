package com.sendsnippet.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.app.StatusBarManager;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.Icon;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.InputFilter;
import android.text.InputType;
import android.text.TextWatcher;
import android.text.method.DigitsKeyListener;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.qrcode.QRCodeWriter;
import com.journeyapps.barcodescanner.ScanContract;
import com.journeyapps.barcodescanner.ScanOptions;

import androidx.activity.ComponentActivity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.function.Consumer;

public final class MainActivity extends ComponentActivity {
    static final String SEND = "com.sendsnippet.app.SEND";
    static final String RECEIVE = "com.sendsnippet.app.RECEIVE";
    private static final int[] DURATIONS = {15, 60, 1440};
    private static final String[] DURATION_LABELS = {"15 minutes", "1 hour", "24 hours"};

    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService io = Executors.newFixedThreadPool(3);
    private final List<TransferData.FileItem> files = new ArrayList<>();
    private LinearLayout root, header, tabs, body;
    private ScrollView scroll;
    private TextView statusLine, expiryLine, codeExpiryLine;
    private ProgressBar progress;
    private Button pauseButton;
    private EditText codeInput;
    private JSONObject received, ready;
    private int tab, lifetime = 1, lookupVersion;
    private boolean loading, adding, busy, dark;
    private String note = "", codeEntry = "", message = "", textToSave = "";
    private String queueingTransfer = "";
    private int paper, page, ink, tint, muted, edge, accent, accentInk;
    private TransferService.State lastState;

    private final ActivityResultLauncher<Intent> picker = registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(), result -> {
                if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                    pickUris(result.getData(), true);
                }
            });
    private final ActivityResultLauncher<String> saveText = registerForActivityResult(
            new ActivityResultContracts.CreateDocument("text/plain"), uri -> {
                if (uri == null) return;
                byte[] bytes = textToSave.getBytes(StandardCharsets.UTF_8);
                work(() -> {
                    try (OutputStream output = getContentResolver().openOutputStream(uri, "w")) {
                        if (output == null) throw new IllegalStateException("Could not save the snippet.");
                        output.write(bytes);
                    }
                    return true;
                }, ignored -> toast("Snippet saved"), this::showError);
            });
    private final ActivityResultLauncher<ScanOptions> scanner = registerForActivityResult(
            new ScanContract(), result -> {
                if (result.getContents() != null) lookup(result.getContents());
            });
    // A short text transfer can be ready before the progress timer sees it running.
    private final SharedPreferences.OnSharedPreferenceChangeListener readyListener = (preferences, key) -> {
        if (TransferData.READY_PREF.equals(key) && tab == 0 && preferences.contains(key)) render();
    };

    private final Runnable ticker = new Runnable() {
        @Override public void run() {
            TransferService.State state = TransferService.status;
            if (state != lastState) {
                boolean changedMode = lastState == null || state.running != lastState.running;
                lastState = state;
                if (changedMode && tab == 0) render();
                else updateProgress();
            }
            JSONObject timed = tab == 0 ? ready : tab == 1 ? received : null;
            if (expiryLine != null && timed != null) {
                String text = TransferData.expires(timed.optLong("expiresAt"));
                if ("Expired".equals(text) && !"Expired".contentEquals(expiryLine.getText())) render();
                else if (!text.contentEquals(expiryLine.getText())) expiryLine.setText(text);
            }
            if (codeExpiryLine != null && ready != null) {
                String text = TransferData.expires(TransferData.codeExpiry(ready));
                if ("Expired".equals(text)) render();
                else if (!text.contentEquals(codeExpiryLine.getText())) codeExpiryLine.setText(text);
            }
            main.postDelayed(this, 500);
        }
    };

    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        if (state != null) {
            tab = state.getInt("tab");
            note = state.getString("note", "");
            String savedCode = state.getString("code", "");
            if (savedCode.matches("[0-9]{0,4}")) codeEntry = savedCode;
            lifetime = state.getInt("lifetime", 1);
            textToSave = state.getString("textToSave", "");
            received = parse(state.getString("received"));
            try { files.addAll(TransferData.files(new JSONArray(state.getString("files", "[]")))); }
            catch (Exception ignored) {}
        }
        setup();
        if (state == null) handle(getIntent());
        render();
    }

    @Override protected void onStart() {
        super.onStart();
        SharedPreferences prefs = TransferData.prefs(this);
        prefs.registerOnSharedPreferenceChangeListener(readyListener);
        if (tab == 0 && ready == null && prefs.contains(TransferData.READY_PREF)) render();
        main.removeCallbacks(ticker);
        main.post(ticker);
    }

    @Override protected void onStop() {
        TransferData.prefs(this).unregisterOnSharedPreferenceChangeListener(readyListener);
        main.removeCallbacks(ticker);
        super.onStop();
    }

    @Override protected void onDestroy() {
        io.shutdownNow();
        super.onDestroy();
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handle(intent);
        render();
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        state.putInt("tab", tab);
        state.putInt("lifetime", lifetime);
        state.putString("note", note);
        state.putString("code", codeEntry);
        state.putString("textToSave", textToSave);
        state.putString("files", TransferData.storeFiles(files).toString());
        if (received != null) state.putString("received", received.toString());
    }

    private void setup() {
        dark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES;
        page = color(dark ? "#151322" : "#F7F6FB");
        paper = color(dark ? "#201C31" : "#FFFFFF");
        ink = color(dark ? "#F4EFFF" : "#221D36");
        tint = color(dark ? "#342956" : "#F0ECFF");
        muted = color(dark ? "#B7AEC8" : "#666177");
        edge = color(dark ? "#39324D" : "#E9E6F0");
        accent = color(dark ? "#7053EB" : "#5943DC");
        accentInk = color(dark ? "#C4B5FF" : "#5037CA");
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat bars = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        bars.setAppearanceLightStatusBars(!dark);
        bars.setAppearanceLightNavigationBars(!dark);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);

        root = column();
        root.setBackgroundColor(page);
        root.setFocusableInTouchMode(true);
        setContentView(root);
        ViewCompat.setOnApplyWindowInsetsListener(root, (view, windowInsets) -> {
            Insets safe = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets keyboard = windowInsets.getInsets(WindowInsetsCompat.Type.ime());
            view.setPadding(safe.left, safe.top, safe.right, Math.max(safe.bottom, keyboard.bottom));
            return windowInsets;
        });
        header = row();
        header.setGravity(Gravity.CENTER_VERTICAL);
        header.setPadding(dp(18), dp(10), dp(18), dp(10));
        ImageView icon = new ImageView(this);
        icon.setImageResource(R.drawable.ic_transfer);
        header.addView(icon, new LinearLayout.LayoutParams(dp(38), dp(38)));
        TextView brand = text("SendSnippet", 20, ink, true);
        brand.setPadding(dp(9), 0, 0, 0);
        header.addView(brand, new LinearLayout.LayoutParams(0, -2, 1));
        header.addView(button("Quick access", false, v -> quickAccess()));
        root.addView(header);

        tabs = row();
        tabs.setPadding(dp(4), dp(4), dp(4), dp(4));
        tabs.setBackground(shape(18, tint, 0));
        LinearLayout.LayoutParams navigation = new LinearLayout.LayoutParams(-1, -2);
        navigation.setMargins(dp(16), dp(4), dp(16), dp(10));
        root.addView(tabs, navigation);

        scroll = new ScrollView(this);
        scroll.setFillViewport(false);
        scroll.setClipToPadding(false);
        scroll.setPadding(dp(16), dp(3), dp(16), dp(16));
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        ViewCompat.requestApplyInsets(root);
    }

    private void handle(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (SEND.equals(action)) { tab = 0; return; }
        if (RECEIVE.equals(action)) { tab = 1; return; }
        if (Intent.ACTION_VIEW.equals(action) && intent.getData() != null) {
            tab = 1;
            lookup(intent.getData().toString());
            return;
        }
        boolean process = Intent.ACTION_PROCESS_TEXT.equals(action);
        if (process || Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            if (TransferService.status.running || hasDraft()) {
                showError("Resume or discard the current upload, then share the new item again.");
                return;
            }
            if (ready != null || savedReady() != null) clearReady();
            tab = 0;
            CharSequence shared = intent.getCharSequenceExtra(process ? Intent.EXTRA_PROCESS_TEXT : Intent.EXTRA_TEXT);
            if (shared != null) appendText(shared.toString());
            if (!process) pickUris(intent, false);
        }
    }

    private void render() {
        tabs.removeAllViews();
        String[] names = {"Send", "Receive", "Activity"};
        for (int i = 0; i < names.length; i++) {
            int destination = i;
            Button choice = button(names[i], false, v -> {
                tab = destination;
                message = "";
                scroll.scrollTo(0, 0);
                root.requestFocus();
                render();
            });
            choice.setSelected(tab == i);
            choice.setTextColor(tab == i ? accentInk : muted);
            choice.setBackground(shape(13, tab == i ? paper : tint, 0));
            LinearLayout.LayoutParams slot = new LinearLayout.LayoutParams(0, dp(46), 1);
            slot.setMargins(dp(2), 0, dp(2), 0);
            tabs.addView(choice, slot);
        }

        int offset = scroll.getScrollY();
        scroll.removeAllViews();
        statusLine = expiryLine = codeExpiryLine = null;
        progress = null;
        pauseButton = null;
        body = column();
        body.setPadding(dp(17), dp(17), dp(17), dp(17));
        body.setBackground(shape(21, paper, edge));
        scroll.addView(body, new ScrollView.LayoutParams(-1, -2));
        switch (tab) {
            case 0 -> renderSend();
            case 1 -> renderReceive();
            default -> renderActivity();
        }
        if (!message.isEmpty()) add(body, text(message, 14, accentInk, true), 12);
        scroll.post(() -> scroll.scrollTo(0, offset));
    }

    private void renderSend() {
        ready = savedReady();
        if (ready != null) {
            renderShare();
            return;
        }
        if (hasDraft() || TransferService.status.running) {
            title("Sending a transfer", "You can switch apps while files upload.");
            statusLine = text("", 14, ink, true);
            progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
            progress.setMax(100);
            progress.setProgressTintList(ColorStateList.valueOf(accent));
            add(body, statusLine, 2);
            add(body, progress, 8);
            LinearLayout actions = row();
            pauseButton = button("Pause", false, v -> transferAction(TransferService.PAUSE));
            rowButton(actions, pauseButton);
            rowButton(actions, button("Stop upload", false, v -> transferAction(TransferService.STOP)));
            add(body, actions, 11);
            if (!TransferService.status.running) {
                LinearLayout retry = row();
                rowButton(retry, button("Discard draft", false, v -> discard()));
                rowButton(retry, button("Resume upload", true, v -> launchUpload()));
                add(body, retry, 4);
                actions.setVisibility(View.GONE);
            }
            updateProgress();
            return;
        }

        title("Send a transfer", "Send files, a text snippet, or both.");
        LinearLayout attach = column();
        attach.setPadding(dp(13), dp(10), dp(13), dp(10));
        attach.setBackground(shape(14, tint, 0));
        add(attach, text("Files", 16, ink, true), 0);
        add(attach, text("Up to 10 GiB per file · 20 GiB total", 13, muted, false), 2);
        Button pick = button(adding ? "Reading files…" : "+ Choose files", false, v -> {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                    .setType("*/*").putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            picker.launch(intent);
        });
        pick.setEnabled(!adding);
        add(attach, pick, 8);
        add(body, attach, 0);
        for (TransferData.FileItem file : files) {
            item(body, file.name, TransferData.size(file.bytes), "Remove", () -> {
                release(file.uri);
                files.remove(file);
                render();
            }, true);
        }
        LinearLayout label = row();
        TextView labelText = text("Text snippet", 15, ink, true);
        labelText.setGravity(Gravity.CENTER_VERTICAL);
        label.addView(labelText, new LinearLayout.LayoutParams(0, -1, 1));
        label.addView(button("Paste", false, v -> {
            String clip = clipboard();
            if (clip != null) { appendText(clip); render(); }
        }));
        add(body, label, 11);
        EditText textInput = edit("Type or paste text…", note, true);
        watch(textInput, value -> note = value);
        add(body, textInput, 3);

        LinearLayout expires = row();
        expires.setGravity(Gravity.CENTER_VERTICAL);
        expires.addView(text("Expires in", 14, muted, false), new LinearLayout.LayoutParams(0, -2, 1));
        Spinner spinner = new Spinner(this);
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, DURATION_LABELS);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adapter);
        spinner.setSelection(lifetime);
        spinner.setContentDescription("Transfer expiry");
        spinner.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener() {
            @Override public void onItemSelected(android.widget.AdapterView<?> parent, View view, int position, long id) {
                lifetime = position;
                if (view instanceof TextView text) text.setTextColor(ink);
            }
            @Override public void onNothingSelected(android.widget.AdapterView<?> parent) {}
        });
        expires.addView(spinner, new LinearLayout.LayoutParams(-2, dp(48)));
        add(body, expires, 5);
        Button send = button("Create transfer", true, v -> submit());
        send.setEnabled(!adding);
        add(body, send, 6);
    }

    private void renderShare() {
        long expires = ready.optLong("expiresAt");
        boolean active = expires > System.currentTimeMillis();
        title(active ? "Your transfer is ready" : "Transfer expired", TransferData.label(ready));
        expiryLine = text(TransferData.expires(expires), 14, muted, false);
        add(body, expiryLine, 0);
        String id = ready.optString("id");
        if (active) {
            String code = TransferData.formatCode(ready.optString("code"));
            long codeExpiry = TransferData.codeExpiry(ready);
            boolean codeActive = codeExpiry > System.currentTimeMillis();
            String link = TransferData.link(id);
            LinearLayout card = column();
            card.setGravity(Gravity.CENTER_HORIZONTAL);
            card.setBackground(shape(16, tint, 0));
            card.setPadding(dp(10), dp(10), dp(10), dp(12));
            String codeLabel = codeActive ? "Receive code" : "Receive code expired";
            add(card, text(codeLabel, 13, accentInk, true), 0);
            if (codeActive) {
                TextView codeText = text(code, 34, accentInk, true);
                codeText.setGravity(Gravity.CENTER);
                codeText.setTextIsSelectable(true);
                add(card, codeText, 1);
                if (code.length() == 4) {
                    codeExpiryLine = text(TransferData.expires(codeExpiry), 12, muted, false);
                    codeExpiryLine.setGravity(Gravity.CENTER);
                    add(card, codeExpiryLine, 0);
                }
            }
            ImageView qr = new ImageView(this);
            qr.setImageBitmap(qr(link));
            qr.setContentDescription("QR code for this transfer");
            LinearLayout.LayoutParams qrSpace = new LinearLayout.LayoutParams(dp(148), dp(148));
            qrSpace.topMargin = dp(7);
            card.addView(qr, qrSpace);
            add(body, card, 10);
            LinearLayout copy = row();
            if (codeActive) rowButton(copy, button("Copy code", false, v -> copy("Receive code", code)));
            rowButton(copy, button("Copy link", false, v -> copy("Transfer link", link)));
            add(body, copy, 8);
            add(body, button("Share transfer", true, v -> share(link)), 7);
        }
        LinearLayout actions = row();
        JSONObject owner = historyItem(id);
        if (owner != null && owner.has("owner")) {
            rowButton(actions, button("Revoke access", false, v -> revoke(owner)));
        }
        rowButton(actions, button("New transfer", false, v -> {
            clearReady();
            render();
        }));
        add(body, actions, 9);
    }

    private void renderReceive() {
        title("Receive a transfer", "Enter the 4-digit code.");
        EditText digits = edit("1234", codeEntry, false);
        digits.setContentDescription("4-digit code");
        digits.setKeyListener(DigitsKeyListener.getInstance("0123456789"));
        digits.setRawInputType(InputType.TYPE_CLASS_NUMBER);
        digits.setFilters(new InputFilter[]{new InputFilter.LengthFilter(4)});
        digits.setTypeface(Typeface.MONOSPACE, Typeface.BOLD);
        digits.setTextSize(27);
        digits.setLetterSpacing(.2f);
        digits.setGravity(Gravity.CENTER);
        digits.setSelectAllOnFocus(true);
        digits.setEnabled(!loading);
        codeInput = digits;
        watch(digits, value -> {
            codeEntry = value;
            if (value.length() == 4) main.post(() -> {
                if (tab == 1 && codeInput == digits && !loading && value.equals(codeEntry)) {
                    lookup(value, true);
                }
            });
        });
        add(body, digits, 0);
        if (loading) {
            TextView progressText = text("Looking up transfer…", 13, muted, false);
            progressText.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
            add(body, progressText, 6);
        }
        LinearLayout methods = row();
        rowButton(methods, button("Paste link", false, v -> {
            String clip = clipboard();
            if (clip != null) lookup(clip);
        }));
        rowButton(methods, button("Scan QR", false, v ->
                scanner.launch(new ScanOptions().setDesiredBarcodeFormats(ScanOptions.QR_CODE)
                        .setPrompt("Scan a SendSnippet QR").setBeepEnabled(false).setOrientationLocked(false))));
        add(body, methods, 8);
        if (received == null) return;

        add(body, text(TransferData.label(received), 18, ink, true), 17);
        long expiry = received.optLong("expiresAt");
        expiryLine = text(TransferData.expires(expiry), 13, muted, false);
        add(body, expiryLine, 2);
        String snippet = received.optString("text");
        if (!snippet.isEmpty()) {
            TextView preview = text(snippet, 14, ink, false);
            preview.setTypeface(Typeface.MONOSPACE);
            preview.setTextIsSelectable(true);
            preview.setMaxLines(16);
            preview.setEllipsize(android.text.TextUtils.TruncateAt.END);
            preview.setBackground(shape(11, tint, 0));
            preview.setPadding(dp(12), dp(12), dp(12), dp(12));
            add(body, preview, 10);
            LinearLayout actions = row();
            rowButton(actions, button("Copy text", false, v -> copy("Text snippet", snippet)));
            rowButton(actions, button("Save .txt", false, v -> {
                textToSave = snippet;
                saveText.launch("snippet.txt");
            }));
            add(body, actions, 7);
        }
        JSONArray manifest = received.optJSONArray("files");
        if (manifest == null) return;
        String id = received.optString("id");
        for (int i = 0; i < manifest.length(); i++) {
            JSONObject file = manifest.optJSONObject(i);
            if (file == null) continue;
            item(body, file.optString("name"), TransferData.size(file.optLong("size")), "Download",
                    () -> download(id, file), expiry > System.currentTimeMillis() && !id.equals(queueingTransfer));
        }
    }

    private void renderActivity() {
        title("Recent transfers", "Activity is saved on this phone.");
        JSONArray rows = TransferData.history(this);
        if (rows.length() == 0) {
            add(body, text("Transfers you send or receive will appear here.", 14, muted, false), 1);
            return;
        }
        for (int i = 0; i < rows.length(); i++) {
            JSONObject item = rows.optJSONObject(i);
            if (item == null) continue;
            long expires = item.optLong("expiresAt");
            item(body, item.optString("label"),
                    item.optString("direction") + " · " + TransferData.expires(expires),
                    "Options", () -> activityOptions(item), expires > System.currentTimeMillis() || item.has("owner"));
        }
        add(body, button("Clear activity", false, v -> new AlertDialog.Builder(this).setTitle("Clear local activity?")
                .setMessage("This removes the history and saved sender controls from this phone.")
                .setNegativeButton("Cancel", null).setPositiveButton("Clear", (dialog, which) -> {
                    TransferData.prefs(this).edit().remove("history").apply();
                    render();
                }).show()), 12);
    }

    private void activityOptions(JSONObject item) {
        boolean active = item.optLong("expiresAt") > System.currentTimeMillis();
        String link = TransferData.link(item.optString("id"));
        ArrayList<String> labels = new ArrayList<>();
        ArrayList<Runnable> actions = new ArrayList<>();
        if (active) {
            labels.add("Open transfer"); actions.add(() -> lookup(link));
            labels.add("Copy link"); actions.add(() -> copy("Transfer link", link));
            if (item.has("code") && TransferData.codeExpiry(item) > System.currentTimeMillis()) {
                labels.add("Copy code");
                actions.add(() -> copy("Receive code", TransferData.formatCode(item.optString("code"))));
            }
        }
        if (item.has("owner")) { labels.add("Revoke access"); actions.add(() -> revoke(item)); }
        new AlertDialog.Builder(this).setTitle(item.optString("label"))
                .setItems(labels.toArray(new String[0]), (dialog, position) -> actions.get(position).run()).show();
    }

    private void submit() {
        if (hasDraft() || TransferService.status.running) return;
        if (note.getBytes(StandardCharsets.UTF_8).length > TransferData.MAX_TEXT) {
            showError("Text can be up to 64 KiB.");
            return;
        }
        if (note.trim().isEmpty() && files.isEmpty()) {
            showError("Add text or a file to send.");
            return;
        }
        String owner = TransferData.randomKey(32);
        JSONObject draft = TransferData.json("id", TransferData.idFor(owner), "owner", owner,
                "text", note, "lifetime", DURATIONS[lifetime], "localFiles", TransferData.storeFiles(files));
        TransferData.prefs(this).edit().putString("draft", draft.toString()).apply();
        note = "";
        files.clear();
        launchUpload();
    }

    private void launchUpload() {
        if (TransferService.status.running || busy) return;
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                && !TransferData.prefs(this).getBoolean("askedNotifications", false)) {
            TransferData.prefs(this).edit().putBoolean("askedNotifications", true).apply();
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 41);
            return;
        }
        Intent service = new Intent(this, TransferService.class);
        JSONObject draft = parse(TransferData.prefs(this).getString("draft", null));
        if (draft == null) return;
        try {
            ClipData clip = null;
            for (TransferData.FileItem file : TransferData.files(draft.getJSONArray("localFiles"))) {
                if (clip == null) clip = ClipData.newRawUri("Files", file.uri);
                else clip.addItem(new ClipData.Item(file.uri));
            }
            if (clip != null) {
                service.setClipData(clip);
                service.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            }
            message = "";
            startForegroundService(service);
            render();
        } catch (Exception err) { showError("Couldn’t start the upload. Open SendSnippet and retry."); }
    }

    @Override public void onRequestPermissionsResult(int request, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(request, permissions, results);
        if (request == 41) launchUpload();
    }

    private void transferAction(String action) {
        startService(new Intent(this, TransferService.class).setAction(action));
    }

    private void updateProgress() {
        if (statusLine == null || progress == null) return;
        TransferService.State state = TransferService.status;
        statusLine.setText(state.text.isEmpty() ? "This draft is ready to resume." : state.text);
        progress.setIndeterminate(state.running && state.percent == 0);
        if (!progress.isIndeterminate()) progress.setProgress(state.percent);
        if (pauseButton != null) pauseButton.setText(state.paused ? "Resume" : "Pause");
    }

    private void discard() {
        if (busy || TransferService.status.running) return;
        JSONObject draft = parse(TransferData.prefs(this).getString("draft", null));
        if (draft == null) return;
        new AlertDialog.Builder(this).setTitle("Discard this upload?").setNegativeButton("Keep", null)
                .setPositiveButton("Discard", (dialog, which) -> {
                    busy = true;
                    work(() -> {
                        try { TransferApi.request("revoke", ownerArgs(draft)); }
                        catch (TransferApi.Failure error) { if (error.status != 404) throw error; }
                        for (TransferData.FileItem file : TransferData.files(draft.getJSONArray("localFiles"))) release(file.uri);
                        TransferData.prefs(this).edit().remove("draft").remove("session." + draft.optString("id")).apply();
                        return true;
                    }, ignored -> {
                        busy = false;
                        message = "";
                        render();
                    }, error -> { busy = false; showError(error); });
                }).show();
    }

    private void lookup(String input) { lookup(input, false); }

    private void lookup(String input, boolean autoDownload) {
        tab = 1;
        codeEntry = autoDownload ? input : "";
        received = null;
        message = "";
        int version = ++lookupVersion;
        JSONObject credential;
        try { credential = TransferData.credential(input); }
        catch (IllegalArgumentException error) { loading = false; showError(error.getMessage()); return; }
        loading = true;
        root.requestFocus();
        ((android.view.inputmethod.InputMethodManager) getSystemService(INPUT_METHOD_SERVICE))
                .hideSoftInputFromWindow(root.getWindowToken(), 0);
        render();
        work(() -> TransferApi.request("receive", credential), result -> {
            if (lookupVersion != version) return;
            loading = false;
            received = result;
            TransferData.remember(this, result, null);
            if (autoDownload) downloadFiles(result);
            render();
        }, error -> {
            if (lookupVersion != version) return;
            loading = false;
            if (autoDownload) codeEntry = "";
            showError(error);
        });
    }

    private void downloadFiles(JSONObject transfer) {
        JSONArray manifest = transfer.optJSONArray("files");
        if (manifest == null || manifest.length() == 0) return;
        String id = transfer.optString("id");
        queueingTransfer = id;
        work(() -> {
            int started = 0;
            for (int i = 0; i < manifest.length(); i++) {
                try {
                    queueDownload(id, manifest.getJSONObject(i));
                    started++;
                } catch (Exception error) {
                    // Continue starting the remaining files if one request fails.
                }
            }
            return started;
        }, started -> {
            if (id.equals(queueingTransfer)) queueingTransfer = "";
            if (started == manifest.length()) {
                toast("Downloading to Downloads");
            } else {
                toast("Some files couldn’t start. Tap Download to try again.");
            }
            if (tab == 1 && received == transfer) render();
        }, error -> {
            if (id.equals(queueingTransfer)) queueingTransfer = "";
            showError(error);
        });
    }

    private void download(String id, JSONObject file) {
        work(() -> queueDownload(id, file), ignored -> toast("Downloading to Downloads"), this::showError);
    }

    private long queueDownload(String id, JSONObject file) throws Exception {
        String name = file.optString("name");
        JSONObject ticket = TransferApi.request("ticket", TransferData.json("id", id, "file", file.optString("id")));
        String url = ticket.getString("url");
        if (BuildConfig.LOCAL_EMULATOR && url.startsWith("/api/local-file/")) url = BuildConfig.BASE_URL + url;
        Uri destination = Uri.parse(url);
        if (!"https".equals(destination.getScheme()) && !BuildConfig.LOCAL_EMULATOR) {
            throw new IllegalArgumentException("Couldn’t verify the download URL.");
        }
        DownloadManager.Request request = new DownloadManager.Request(destination)
                .setTitle(name).setDescription("SendSnippet transfer")
                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, downloadName(name))
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
        return getSystemService(DownloadManager.class).enqueue(request);
    }

    private synchronized String downloadName(String name) {
        String safe = name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "_");
        String key = "download." + TransferData.idFor(safe);
        int prior = TransferData.prefs(this).getInt(key, 0);
        TransferData.prefs(this).edit().putInt(key, prior + 1).apply();
        if (prior == 0) return safe;
        int dot = safe.lastIndexOf('.');
        return dot > 0 ? safe.substring(0, dot) + " (" + prior + ")" + safe.substring(dot) : safe + " (" + prior + ")";
    }

    private void revoke(JSONObject item) {
        new AlertDialog.Builder(this).setTitle("Revoke access to this transfer?")
                .setNegativeButton("Keep", null).setPositiveButton("Revoke", (dialog, which) ->
                    work(() -> {
                        try { return TransferApi.request("revoke", ownerArgs(item)); }
                        catch (TransferApi.Failure error) { if (error.status != 404) throw error; return null; }
                    }, result -> {
                        String id = item.optString("id");
                        TransferData.forget(this, id);
                        if (ready != null && id.equals(ready.optString("id"))) clearReady();
                        if (received != null && id.equals(received.optString("id"))) received = null;
                        toast("Transfer revoked");
                        render();
                    }, this::showError)).show();
    }

    private void pickUris(Intent data, boolean persist) {
        ArrayList<Uri> selected = new ArrayList<>();
        if (data.getData() != null) selected.add(data.getData());
        ClipData clip = data.getClipData();
        if (clip != null) for (int i = 0; i < clip.getItemCount(); i++) {
            Uri uri = clip.getItemAt(i).getUri();
            if (uri != null && !selected.contains(uri)) selected.add(uri);
        }
        if (Intent.ACTION_SEND_MULTIPLE.equals(data.getAction())) {
            ArrayList<Uri> extra = androidx.core.content.IntentCompat.getParcelableArrayListExtra(data, Intent.EXTRA_STREAM, Uri.class);
            if (extra != null) for (Uri uri : extra) if (uri != null && !selected.contains(uri)) selected.add(uri);
        } else if (Intent.ACTION_SEND.equals(data.getAction())) {
            Uri uri = androidx.core.content.IntentCompat.getParcelableExtra(data, Intent.EXTRA_STREAM, Uri.class);
            if (uri != null && !selected.contains(uri)) selected.add(uri);
        }
        if (selected.isEmpty()) return;
        int remaining = 20 - files.size();
        if (remaining <= 0) { showError("Add up to 20 files."); return; }
        adding = true;
        message = "";
        work(() -> {
            List<TransferData.FileItem> described = new ArrayList<>();
            for (Uri uri : selected.subList(0, Math.min(remaining, selected.size()))) {
                TransferData.FileItem item = TransferData.describe(this, uri);
                if (persist) try {
                    getContentResolver().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } catch (SecurityException ignored) {}
                described.add(item);
            }
            return described;
        }, result -> {
            long total = 0;
            for (TransferData.FileItem file : files) total += file.bytes;
            if (selected.size() > remaining) message = "Add up to 20 files.";
            for (TransferData.FileItem file : result) {
                if (files.stream().anyMatch(prior -> prior.uri.equals(file.uri))) continue;
                if (file.bytes > 10 * TransferData.GIB || total + file.bytes > 20 * TransferData.GIB) {
                    message = "Limit is 10 GiB per file and 20 GiB per transfer.";
                    release(file.uri);
                } else if (files.size() >= 20) {
                    message = "Add up to 20 files.";
                    release(file.uri);
                } else {
                    files.add(file);
                    total += file.bytes;
                }
            }
            adding = false;
            render();
        }, error -> { adding = false; showError(error); });
    }

    private void quickAccess() {
        String[] options = {"Share sheet and selected text", "Add Receive tile", "Receive a transfer"};
        new AlertDialog.Builder(this).setTitle("Quick access").setItems(options, (dialog, index) -> {
            if (index == 0) {
                new AlertDialog.Builder(this).setTitle(options[0])
                        .setMessage("In another app, tap Share and choose SendSnippet. For selected text, look for SendSnippet in the text actions. Long-press the SendSnippet icon for Send and Receive shortcuts.")
                        .setPositiveButton("Done", null).show();
            } else if (index == 1 && Build.VERSION.SDK_INT >= 33 && !BuildConfig.LOCAL_EMULATOR) {
                getSystemService(StatusBarManager.class).requestAddTileService(
                        new ComponentName(this, ReceiveTile.class), getString(R.string.receive_shortcut),
                        Icon.createWithResource(this, R.drawable.ic_tile), getMainExecutor(),
                        result -> { if (result == StatusBarManager.TILE_ADD_REQUEST_RESULT_TILE_ADDED) toast("Receive tile added"); });
            } else if (index == 1) {
                new AlertDialog.Builder(this).setTitle("Add Receive tile")
                        .setMessage("Open Quick Settings, tap Edit, then drag Receive a transfer into your active tiles.")
                        .setPositiveButton("Done", null).show();
            } else { tab = 1; render(); }
        }).show();
    }

    private void title(String title, String description) {
        add(body, text(title, 25, ink, true), 0);
        add(body, text(description, 14, muted, false), 5);
        add(body, new View(this), 12);
    }

    private void item(LinearLayout target, String name, String description, String action, Runnable run, boolean enabled) {
        LinearLayout line = row();
        line.setGravity(Gravity.CENTER_VERTICAL);
        line.setPadding(dp(9), dp(6), dp(6), dp(6));
        line.setBackground(shape(12, paper, edge));
        LinearLayout details = column();
        add(details, text(name, 14, ink, true), 0);
        add(details, text(description, 12, muted, false), 3);
        line.addView(details, new LinearLayout.LayoutParams(0, -2, 1));
        Button click = button(action, false, v -> run.run());
        click.setEnabled(enabled);
        line.addView(click);
        add(target, line, 8);
    }

    private Button button(String label, boolean primary, View.OnClickListener click) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextColor(primary ? Color.WHITE : accentInk);
        button.setTextSize(13);
        button.setAllCaps(false);
        button.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        button.setPadding(dp(9), dp(8), dp(9), dp(8));
        button.setMinHeight(dp(46));
        button.setMinWidth(0);
        button.setBackground(new android.graphics.drawable.RippleDrawable(
                ColorStateList.valueOf(primary ? 0x33FFFFFF : 0x225943DC),
                shape(11, primary ? accent : tint, 0), null));
        button.setOnClickListener(click);
        return button;
    }

    private EditText edit(String hint, String value, boolean multiline) {
        EditText edit = new EditText(this);
        edit.setTextColor(ink);
        edit.setHintTextColor(muted);
        edit.setTextSize(16);
        edit.setBackground(shape(12, page, edge));
        edit.setPadding(dp(11), dp(11), dp(11), dp(11));
        edit.setInputType(InputType.TYPE_CLASS_TEXT | (multiline
                ? InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
                : InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS));
        edit.setSingleLine(!multiline);
        if (multiline) {
            edit.setMinLines(4);
            edit.setMaxLines(9);
            edit.setGravity(Gravity.TOP);
        } else {
            edit.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(300)});
            edit.setMinHeight(dp(48));
        }
        edit.setHint(hint);
        edit.setText(value);
        return edit;
    }

    private void watch(EditText input, Consumer<String> callback) {
        input.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {
                callback.accept(s.toString());
            }
            @Override public void afterTextChanged(Editable s) {}
        });
    }

    private TextView text(String value, int size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }

    private void rowButton(LinearLayout parent, Button button) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, -2, 1);
        if (parent.getChildCount() > 0) params.leftMargin = dp(7);
        parent.addView(button, params);
    }

    private void add(LinearLayout parent, View child, int gap) {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.topMargin = dp(gap);
        parent.addView(child, params);
    }

    private LinearLayout column() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        return layout;
    }

    private LinearLayout row() { return new LinearLayout(this); }

    private GradientDrawable shape(int radius, int fill, int stroke) {
        GradientDrawable drawable = new GradientDrawable();
        drawable.setColor(fill);
        drawable.setCornerRadius(dp(radius));
        if (stroke != 0) drawable.setStroke(dp(1), stroke);
        return drawable;
    }

    private int dp(int size) { return Math.round(size * getResources().getDisplayMetrics().density); }
    private int color(String hex) { return Color.parseColor(hex); }

    private void appendText(String extra) {
        String combined = note.isEmpty() ? extra : note + "\n" + extra;
        if (combined.getBytes(StandardCharsets.UTF_8).length > TransferData.MAX_TEXT) {
            showError("Text can be up to 64 KiB.");
            return;
        }
        note = combined;
    }

    private String clipboard() {
        ClipboardManager clipboard = getSystemService(ClipboardManager.class);
        ClipData data = clipboard.getPrimaryClip();
        if (data != null && data.getItemCount() > 0 && data.getItemAt(0).getText() != null) {
            return data.getItemAt(0).getText().toString();
        }
        toast("Clipboard has no text");
        return null;
    }

    private void copy(String label, String value) {
        ClipData data = ClipData.newPlainText(label, value);
        android.os.PersistableBundle extras = new android.os.PersistableBundle();
        extras.putBoolean("android.content.extra.IS_SENSITIVE", true);
        data.getDescription().setExtras(extras);
        getSystemService(ClipboardManager.class).setPrimaryClip(data);
        if (Build.VERSION.SDK_INT < 33) toast(label + " copied");
    }

    private void share(String url) {
        Intent send = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, url);
        startActivity(Intent.createChooser(send, "Share transfer"));
    }

    private Bitmap qr(String url) {
        try {
            var matrix = new QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, 320, 320);
            int[] pixels = new int[320 * 320];
            for (int y = 0; y < 320; y++) for (int x = 0; x < 320; x++) {
                pixels[y * 320 + x] = matrix.get(x, y) ? 0xff211a3c : Color.WHITE;
            }
            return Bitmap.createBitmap(pixels, 320, 320, Bitmap.Config.ARGB_8888);
        } catch (Exception ignored) { return null; }
    }

    private <T> void work(Callable<T> action, Consumer<T> ok, Consumer<String> fail) {
        io.execute(() -> {
            try {
                T value = action.call();
                main.post(() -> { if (!isDestroyed()) ok.accept(value); });
            } catch (Exception error) {
                String explanation = error instanceof TransferApi.Failure || error instanceof IllegalArgumentException
                        ? error.getMessage() : "Couldn’t complete the request. Check your connection or file access and try again.";
                main.post(() -> { if (!isDestroyed()) fail.accept(explanation); });
            }
        });
    }

    private void showError(String error) {
        message = error;
        if (scroll != null) render();
        toast(error);
    }

    private void toast(String value) { Toast.makeText(this, value, Toast.LENGTH_SHORT).show(); }
    private boolean hasDraft() { return TransferData.prefs(this).contains("draft"); }
    private JSONObject savedReady() { return parse(TransferData.prefs(this).getString(TransferData.READY_PREF, null)); }

    private void clearReady() {
        TransferData.prefs(this).edit().remove(TransferData.READY_PREF).apply();
        ready = null;
    }

    private void release(Uri uri) {
        try { getContentResolver().releasePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION); }
        catch (SecurityException ignored) {}
    }

    private static JSONObject ownerArgs(JSONObject data) {
        return TransferData.json("id", data.optString("id"), "owner", data.optString("owner"));
    }

    private JSONObject historyItem(String id) {
        JSONArray rows = TransferData.history(this);
        for (int i = 0; i < rows.length(); i++) {
            JSONObject item = rows.optJSONObject(i);
            if (item != null && id.equals(item.optString("id"))) return item;
        }
        return null;
    }

    private static JSONObject parse(String json) {
        if (json == null) return null;
        try { return new JSONObject(json); }
        catch (Exception ignored) { return null; }
    }
}
