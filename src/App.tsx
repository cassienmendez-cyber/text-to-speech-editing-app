import { useStore } from "./store";
import Library from "./components/Library";
import Workspace from "./components/Workspace";

export default function App() {
  const currentId = useStore((s) => s.currentId);
  const exists = useStore((s) => (currentId ? !!s.projects[currentId] : false));

  if (currentId && exists) {
    return <Workspace projectId={currentId} />;
  }
  return <Library />;
}
