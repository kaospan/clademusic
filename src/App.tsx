import { lazy, Suspense, type ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
simport { AuthProvider } from "@/hooks/useAuth";
import { PlayerProvider } from "@/player/PlayerContext";
import { YouTubePlayerProvider } from "@/contexts/YouTubePlayerContext";
import { QueueProvider } from "@/contextss/QueueContext";
import { EmbeddedPlayerDrawer } from "@/player/EmbeddedPlayerDrawer";
import { ErrorBoundary, GlobalErrorHandlers, LoadingSpinner } from "@/components/shared";
import { AdminRoute } from "@/components/AdminRoute";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index")); // Landing Page
const FeedPage = lazy(() => import("./pages/FeedPage"));
const AuthGatePage = lazy(() => import("./pages/AuthGatePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ConnectionsPage = lazy(() => import("./pages/ConnectionsPage"));
const FollowingPage = lazy(() => import("./pages/FollowingPage"));
const SpotifyCallbackPage = lazy(() => import("./pages/SpotifyCallbackPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const AlbumPage = lazy(() => import("./pages/AlbumPage"));
const ArtistPage = lazy(() => import("./pages/ArtistPage"));
const TrackDetailPage = lazy(() => import("./pages/TrackDetailPage"));
const PlaylistsPage = lazy(() => import("./pages/PlaylistsPage"));
const PlaylistDetailPage = lazy(() => import("./pages/PlaylistDetailPage"));
const ForumHomePage = lazy(() =>
  import("./pages/ForumHomePage").then((module) => ({ default: module.ForumHomePage }))
);
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminPerformanceDashboard = lazy(() => import("./components/AdminPerformanceDashboard"));
const TermsOfServicePage = lazy(() =>
  import("./pages/TermsOfServicePage").then((module) => ({ default: module.TermsOfServicePage }))
);
const PrivacyPolicyPage = lazy(() =>
  import("./pages/PrivacyPolicyPage").then((module) => ({ default: module.PrivacyPolicyPage }))
);
const MusicTasteSurvey = lazy(() =>
  import("./components/MusicTasteSurvey").then((module) => ({ default: module.MusicTasteSurvey }))
);
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Page loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <LoadingSpinner size="lg" />
  </div>
);

const RouteErrorBoundary = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  return <ErrorBoundary resetKeys={[location.pathname]}>{children}</ErrorBoundary>;
};

const PlayerVisibilityGate = () => {
  const location = useLocation();
  const { user } = useAuth();
  const onLanding = location.pathname === '/' || location.pathname === '';
  if (!user && onLanding) return null;
  return (
    <ErrorBoundary
      resetKeys={[location.pathname]}
      fallback={null}
      onError={(error) => {
        if (import.meta.env.MODE !== "production") {
          console.error("[PlayerVisibilityGate] Player crashed:", error);
        }
        toast({
          title: "Player temporarily unavailable",
          description:
            import.meta.env.MODE !== "production"
              ? error.message || "Please reload the page to try again."
              : "Please reload the page to try again.",
        });
      }}
    >
      <EmbeddedPlayerDrawer />
    </ErrorBoundary>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <YouTubePlayerProvider>
          <PlayerProvider>
            <QueueProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter basename={import.meta.env.BASE_URL}>
                <GlobalErrorHandlers />
                <RouteErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/pricing" element={<PricingPage />} />
                      <Route path="/billing" element={<BillingPage />} />
                      <Route path="/feed" element={<FeedPage />} />
                      <Route path="/auth" element={<AuthGatePage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/signup" element={<SignUpPage />} />
                      <Route path="/search" element={<SearchPage />} />
                      <Route path="/compare" element={<ComparePage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/following" element={<FollowingPage />} />
                      <Route path="/connections/:trackId" element={<ConnectionsPage />} />
                      <Route path="/spotify-callback" element={<SpotifyCallbackPage />} />
                      <Route path="/album/:albumId" element={<AlbumPage />} />
                      <Route path="/artist/:artistId" element={<ArtistPage />} />
                      <Route path="/track/:trackId" element={<TrackDetailPage />} />
                      <Route path="/playlists" element={<PlaylistsPage />} />
                      <Route path="/playlist/:playlistId" element={<PlaylistDetailPage />} />
                      <Route path="/forum" element={<ForumHomePage />} />
                      <Route path="/forum/:forumName" element={<ForumHomePage />} />
                      <Route path="/forum/post/:postId" element={<ForumHomePage />} />
                      {/* Legal Pages */}
                      <Route path="/terms" element={<TermsOfServicePage />} />
                      <Route path="/privacy" element={<PrivacyPolicyPage />} />
                      {/* Onboarding */}
                      <Route path="/survey" element={<MusicTasteSurvey />} />
                      {/* Admin Routes - Protected */}
                      <Route element={<AdminRoute />}>
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/admin/performance" element={<AdminPerformanceDashboard />} />
                      </Route>
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </RouteErrorBoundary>
                <PlayerVisibilityGate />
              </BrowserRouter>
            </QueueProvider>
        </PlayerProvider>
      </YouTubePlayerProvider>
    </AuthProvider>
  </TooltipProvider>
</QueryClientProvider>
);

export default App;
