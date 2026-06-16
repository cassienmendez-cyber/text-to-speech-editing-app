import { useEffect } from "react";
import { useStore } from "./store";
import { CollabProvider } from "./collab-context";
import Library from "./components/Library";
import Workspace from "./components/Workspace";
import ThemeDecor from "./components/ThemeDecor";

export default function App() {
  const currentId = useStore((s) => s.currentId);
  const exists = useStore((s) => (currentId ? !!s.projects[currentId] : false));
  const highContrast = useStore((s) => s.settings.highContrast);
  const theme = useStore((s) => s.settings.theme);

  // Accessibility: toggle the high-contrast theme on the document root.
  useEffect(() => {
    document.documentElement.classList.toggle("hc", highContrast);
  }, [highContrast]);

  // Color theme.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <CollabProvider>
      <ThemeDecor />
      {currentId && exists ? <Workspace projectId={currentId} /> : <Library />}
    </CollabProvider>
  );
}
