import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sileo";

import App from "./App";
import { Dialogo } from "./components/ui/Dialogo";
import "./styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 1000 },
  },
});

const raiz = document.getElementById("root");
if (!raiz) throw new Error("No encuentro el div #root en index.html");

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Dialogo />
      <Toaster position="top-center" theme="dark" offset={14} />
    </QueryClientProvider>
  </StrictMode>
);