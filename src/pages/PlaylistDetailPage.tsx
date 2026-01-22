import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageLayout, LoadingSpinner } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { TrackCard } from '@/components/TrackCard';
import { usePlaylist, useUpdatePlaylist, useRemoveTrackFromPlaylist } from '@/hooks/api/usePlaylists';
import { useAuth } from '@/hooks/useAuth';
import { Edit2, Globe, Lock, Users, Trash2, Play, Share2, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function PlaylistDetailPage() {
  const { playlistId } = useParams<{ playlistId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editIsCollaborative, setEditIsCollaborative] = useState(false);

  const { data: playlist, isLoading } = usePlaylist(playlistId);
  const updatePlaylist = useUpdatePlaylist();
  const removeTrack = useRemoveTrackFromPlaylist();

  const isOwner = playlist?.user_id === user?.id;

  const handleEditClick = () => {
    if (!playlist) return;
    setEditName(playlist.name);
    setEditDescription(playlist.description || '');
    setEditIsPublic(playlist.is_public);
    setEditIsCollaborative(playlist.is_collaborative);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!playlistId) return;

    try {
      await updatePlaylist.mutateAsync({
        playlistId,
        updates: {
          name: editName,
          description: editDescription || null,
          is_public: editIsPublic,
          is_collaborative: editIsCollaborative,
        },
      });

      toast.success('Playlist updated');
      setEditDialogOpen(false);
    } catch (error) {
      toast.error('Failed to update playlist');
      console.error(error);
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!playlistId) return;

    try {
      await removeTrack.mutateAsync({ playlistId, trackId });
      toast.success('Track removed from playlist');
    } catch (error) {
      toast.error('Failed to remove track');
      console.error(error);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Playlist link copied to clipboard');
  };

  if (isLoading) {
    return (
      <PageLayout title="Loading...">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      </PageLayout>
    );
  }

  if (!playlist) {
    return (
      <PageLayout title="Not Found">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Playlist not found</p>
            <Button onClick={() => navigate('/playlists')}>Back to Playlists</Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const tracks = playlist.playlist_tracks?.map((pt: any) => pt.track) || [];

  return (
    <PageLayout
      title={playlist.name}
      headerActions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4" />
          </Button>
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEditClick}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Playlist
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (confirm('Delete this playlist? This cannot be undone.')) {
                      // Handle delete
                      navigate('/playlists');
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Playlist
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Playlist Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-6">
              {/* Cover */}
              <div
                className="w-48 h-48 rounded-lg flex-shrink-0 flex items-center justify-center"
                style={{
                  background: playlist.cover_url
                    ? `url(${playlist.cover_url}) center/cover`
                    : playlist.cover_color || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
              >
                {!playlist.cover_url && <Play className="w-16 h-16 text-white/60" />}
              </div>

              {/* Info */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    {playlist.is_public ? (
                      <>
                        <Globe className="w-4 h-4" />
                        <span>Public Playlist</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Private Playlist</span>
                      </>
                    )}
                    {playlist.is_collaborative && (
                      <>
                        <span>•</span>
                        <Users className="w-4 h-4" />
                        <span>Collaborative</span>
                      </>
                    )}
                  </div>

                  <h1 className="text-4xl font-bold mb-3">{playlist.name}</h1>

                  {playlist.description && (
                    <p className="text-muted-foreground mb-4">{playlist.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <span>
                      Created by{' '}
                      <span className="font-medium">{playlist.owner?.username || 'Unknown'}</span>
                    </span>
                    <span>•</span>
                    <span>{tracks.length} tracks</span>
                    {playlist.play_count > 0 && (
                      <>
                        <span>•</span>
                        <span>{playlist.play_count} plays</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="lg" className="gap-2">
                    <Play className="w-5 h-5" />
                    Play All
                  </Button>
                  {playlist.is_collaborative && (
                    <p className="text-sm text-muted-foreground">
                      {playlist.playlist_collaborators?.length || 0} collaborators
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Track List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Tracks</h2>

          {tracks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">No tracks in this playlist yet</p>
                {isOwner && (
                  <Button onClick={() => navigate('/search')}>Browse Tracks</Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {tracks.map((track: any) => (
                <div key={track.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <TrackCard track={track} />
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveTrack(track.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
            <DialogDescription>Update your playlist details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Playlist Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-public">Public</Label>
              <Switch
                id="edit-public"
                checked={editIsPublic}
                onCheckedChange={setEditIsPublic}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-collaborative">Collaborative</Label>
                <p className="text-sm text-muted-foreground">
                  Allow others to add tracks
                </p>
              </div>
              <Switch
                id="edit-collaborative"
                checked={editIsCollaborative}
                onCheckedChange={setEditIsCollaborative}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updatePlaylist.isPending}>
              {updatePlaylist.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
