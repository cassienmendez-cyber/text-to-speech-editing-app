import { useEffect } from "react";
import { useStore } from "./store";
import Library from "./components/Library";
import Workspace from "./components/Workspace";

export default function App() {
  const currentId = useStore((s) => s.currentId);
  const exists = useStore((s) => (currentId ? !!s.projects[currentId] : false));
  const highContrast = useStore((s) => s.settings.highContrast);

  // Accessibility: toggle the high-contrast theme on the document root.
  useEffect(() => {
    document.documentElement.classList.toggle("hc", highContrast);
  }, [highContrast]);

  if (currentId && exists) {
    return <Workspace projectId={currentId} />;
  }
  return <Library />;
}
