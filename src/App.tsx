import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AudioProvider } from "@/hooks/useAudioPlayer";
import { KeyboardShortcutsProvider } from "@/hooks/useKeyboardShortcuts";
import AudioPlayerBar from "@/components/AudioPlayerBar";
import GlobalKeyboardShortcuts from "@/components/GlobalKeyboardShortcuts";
import AppChrome from "@/components/layout/AppChrome";
import { THEME_STORAGE_KEY } from "@/lib/preferences";
import Index from "./pages/Index";
import Search from "./pages/Search";
import SermonDetail from "./pages/SermonDetail";
import Books from "./pages/Books";
import Settings from "./pages/Settings";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <>
    <GlobalKeyboardShortcuts />
    <Routes>
      <Route element={<AppChrome />}>
        <Route path="/" element={<Index />} />
        <Route path="/search" element={<Search />} />
        <Route path="/sermons/:id" element={<SermonDetail />} />
        <Route path="/books" element={<Books />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<About />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey={THEME_STORAGE_KEY}>
      <TooltipProvider>
        <AudioProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <KeyboardShortcutsProvider>
              <AppRoutes />
            </KeyboardShortcutsProvider>
          </BrowserRouter>
          <AudioPlayerBar />
        </AudioProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
