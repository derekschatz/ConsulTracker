import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set page title
document.title = "ConsultTrack - Consultant Dashboard";

createRoot(document.getElementById("root")!).render(<App />);
