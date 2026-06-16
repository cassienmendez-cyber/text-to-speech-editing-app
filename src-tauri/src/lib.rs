// StoryScribe Tauri shell. The entire application UI is the React frontend in
// ../src; this wrapper packages it as a local-first desktop app. Keeping the
// frontend identical to the web build means everything (playback, notes, Drive
// Mode, the AI assistant) runs unchanged inside the desktop window.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running StoryScribe");
}
