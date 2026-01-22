import { useState } from 'react';
import { PageLayout, LoadingSpinner } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { usePlaylists, useCreatePlaylist, useDeletePlaylist, usePublicPlaylists } from '@/hooks/api/usePlaylists';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Music, Lock, Globe, Trash2, Play, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function PlaylistsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [showPublic, setShowPublic] = useState(false);

  const { data: myPlaylists, isLoading: myPlaylistsLoading } = usePlaylists(user?.id);
  const { data: publicPlaylists, isLoading: publicPlaylistsLoading } = usePublicPlaylists(20);
  const createPlaylist = useCreatePlaylist();
  const deletePlaylist = useDeletePlaylist();

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      toast.error('Please enter a playlist name');
      return;
    }

    try {
      await createPlaylist.mutateAsync({
        name: newPlaylistName,
        description: newPlaylistDescription || undefined,
        is_public: isPublic,
      });

      toast.success('Playlist created successfully');
      setCreateDialogOpen(false);
      setNewPlaylistName('');
      setNewPlaylistDescription('');
      setIsPublic(true);
    } catch (error) {
      toast.error('Failed to create playlist');
      console.error(error);
    }
  };

  const handleDeletePlaylist = async (playlistId: string, name: string) => {
    if (!confirm(`Delete playlist "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deletePlaylist.mutateAsync(playlistId);
      toast.success('Playlist deleted');
    } catch (error) {
      toast.error('Failed to delete playlist');
      console.error(error);
    }
  };

  const playlists = showPublic ? publicPlaylists : myPlaylists;
  const isLoading = showPublic ? publicPlaylistsLoading : myPlaylistsLoading;

  return (
    <PageLayout
      title="Playlists"
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            variant={showPublic ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => setShowPublic(false)}
          >
            My Playlists
          </Button>
          <Button
            variant={showPublic ? 'ghost' : 'outline'}
            size="sm"
            onClick={() => setShowPublic(true)}
          >
            <Globe className="w-4 h-4 mr-1" />
            Discover
          </Button>
          {!showPublic && (
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New Playlist
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : playlists && playlists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {playlists.map((playlist) => (
              <Card
                key={playlist.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/playlist/${playlist.id}`)}
              >
                <CardHeader className="pb-3">
                  {/* Playlist Cover */}
                  <div
                    className="w-full aspect-square rounded-lg mb-3 flex items-center justify-center"
                    style={{
                      background: playlist.cover_url
                        ? `url(${playlist.cover_url}) center/cover`
                        : playlist.cover_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  >
                    {!playlist.cover_url && (
                      <Music className="w-12 h-12 text-white/60" />
                    )}
                  </div>

                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{playlist.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <span>{playlist.track_count || 0} tracks</span>
                        {playlist.is_collaborative && (
                          <Users className="w-3 h-3" />
                        )}
                        {playlist.is_public ? (
                          <Globe className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {playlist.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {playlist.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(playlist.updated_at), { addSuffix: true })}
                    </span>

                    {!showPublic && playlist.user_id === user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePlaylist(playlist.id, playlist.name);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Music className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {showPublic ? 'No public playlists yet' : 'No playlists yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {showPublic
                  ? 'Check back later for community playlists'
                  : 'Create your first playlist to organize your favorite tracks'}
              </p>
              {!showPublic && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Playlist
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Playlist Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
            <DialogDescription>
              Organize your favorite tracks into a playlist
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playlist-name">Playlist Name</Label>
              <Input
                id="playlist-name"
                placeholder="My Awesome Playlist"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="playlist-description">Description (optional)</Label>
              <Textarea
                id="playlist-description"
                placeholder="Tell others what this playlist is about..."
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is-public">Public Playlist</Label>
                <p className="text-sm text-muted-foreground">
                  Allow others to view and discover this playlist
                </p>
              </div>
              <Switch
                id="is-public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlaylist} disabled={createPlaylist.isPending}>
              {createPlaylist.isPending ? 'Creating...' : 'Create Playlist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
