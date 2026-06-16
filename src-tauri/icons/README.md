# App icons

Tauri needs platform icons here (`32x32.png`, `128x128.png`, `128x128@2x.png`,
`icon.icns`, `icon.ico`). Generate them from a single source PNG (1024×1024
recommended) with:

```bash
npm run tauri icon path/to/source.png
```

This populates this directory automatically. They are intentionally not
committed as binaries; run the command above before a desktop build.
