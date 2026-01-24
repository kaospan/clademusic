import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PlayerProvider } from "@/player/PlayerContext";
import { YouTubePlayerProvider } from "@/contexts/YouTubePlayerContext";
import { QueueProvider } from "@/contexts/QueueContext";
import { EmbeddedPlayerDrawer } from "@/player/EmbeddedPlayerDrawer";
import { LoadingSpinner } from "@/components/shared";
import { AdminRoute } from "@/components/AdminRoute";

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index")); // Landing Page
const FeedPage = lazy(() => import("./pages/FeedPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ConnectionsPage = lazy(() => import("./pages/ConnectionsPage"));
const FollowingPage = lazy(() => import("./pages/FollowingPage"));
const SpotifyCallbackPage = lazy(() => import("./pages/SpotifyCallbackPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const AlbumPage = lazy(() => import("./pages/AlbumPage"));
const ArtistPage = lazy(() => import("./pages/ArtistPage"));
const TrackDetailPage = lazy(() => import("./pages/TrackDetailPage"));
const PlaylistsPage = lazy(() => import("./pages/PlaylistsPage"));
const PlaylistDetailPage = lazy(() => import("./pages/PlaylistDetailPage"));
const ForumHomePage = lazy(() => import("./pages/ForumHomePage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminPerformanceDashboard = lazy(() => import("./components/AdminPerformanceDashboard"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const MusicTasteSurvey = lazy(() => import("./components/MusicTasteSurvey"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Page loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <LoadingSpinner size="lg" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <YouTubePlayerProvider>
          <QueueProvider>
            <PlayerProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter basename="/cladeai">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/pricing" element={<PricingPage />} />
                    <Route path="/feed" element={<FeedPage />} />
                    <Route path="/auth" element={<AuthPage />} />
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
                <EmbeddedPlayerDrawer />
              </BrowserRouter>
            </PlayerProvider>
          </QueueProvider>
      </YouTubePlayerProvider>
    </AuthProvider>
  </TooltipProvider>
</QueryClientProvider>
);

export default App;
