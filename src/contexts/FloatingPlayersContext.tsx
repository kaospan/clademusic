// import { createContext, useContext, useState, ReactNode } from 'react';
// import { FloatingPlayer } from '@/components/FloatingPlayer';

// interface FloatingPlayerState {
//   type: 'spotify' | 'youtube';
//   trackId: string;
//   title: string;
//   artist?: string;
// }

// interface FloatingPlayersContextType {
//   spotifyPlayer: FloatingPlayerState | null;
//   youtubePlayer: FloatingPlayerState | null;
//   activePlayer: 'spotify' | 'youtube' | null;
//   playSpotify: (trackId: string, title: string, artist?: string) => void;
//   playYouTube: (videoId: string, title: string, artist?: string) => void;
//   seekYouTube: (seconds: number) => void;
//   closeSpotify: () => void;
//   closeYouTube: () => void;
//   setActivePlayer: (player: 'spotify' | 'youtube') => void;
// }

// const FloatingPlayersContext = createContext<FloatingPlayersContextType | undefined>(undefined);

// export function FloatingPlayersProvider({ children }: { children: ReactNode }) {
//   const [spotifyPlayer, setSpotifyPlayer] = useState<FloatingPlayerState | null>(null);
//   const [youtubePlayer, setYoutubePlayer] = useState<FloatingPlayerState | null>(null);
//   const [activePlayer, setActivePlayer] = useState<'spotify' | 'youtube' | null>(null);
//   const [youtubeSeekTime, setYoutubeSeekTime] = useState<number | null>(null);

//   const playSpotify = (trackId: string, title: string, artist?: string) => {
//     setSpotifyPlayer({ type: 'spotify', trackId, title, artist });
//     setActivePlayer('spotify');
//   };

//   const playYouTube = (videoId: string, title: string, artist?: string) => {
//     setYoutubePlayer({ type: 'youtube', trackId: videoId, title, artist });
//     setActivePlayer('youtube');
//   };
  
//   const seekYouTube = (seconds: number) => {
//     setYoutubeSeekTime(seconds);
//     setActivePlayer('youtube');
//     // Reset seek time after a brief delay
//     setTimeout(() => setYoutubeSeekTime(null), 100);
//   };

//   const closeSpotify = () => {
//     setSpotifyPlayer(null);
//     if (activePlayer === 'spotify') setActivePlayer(null);
//   };
  
//   const closeYouTube = () => {
//     setYoutubePlayer(null);
//     if (activePlayer === 'youtube') setActivePlayer(null);
//   };

//   return (
//     <FloatingPlayersContext.Provider
//       value={{
//         spotifyPlayer,
//         youtubePlayer,
//         activePlayer,
//         playSpotify,
//         playYouTube,
//         seekYouTube,
//         closeSpotify,
//         closeYouTube,
//         setActivePlayer,
//       }}
//     >
//       {children}
      
//       {/* Render floating players - stacked vertically in bottom-right */}
//       <div className="fixed bottom-20 right-4 flex flex-col gap-4 pointer-events-none">
//         <div 
//           className="pointer-events-auto transition-all"
//           style={{ zIndex: activePlayer === 'youtube' ? 100 : 50 }}
//           onClick={() => youtubePlayer && setActivePlayer('youtube')}
//         >
//           {youtubePlayer && (
//             <FloatingPlayer
//               key="youtube-player"
//               type="youtube"
//               trackId={youtubePlayer.trackId}
//               title={youtubePlayer.title}
//               artist={youtubePlayer.artist}
//               onClose={closeYouTube}
//               seekTime={youtubeSeekTime}
//               isActive={activePlayer === 'youtube'}
//             />
//           )}
//         </div>
//         <div 
//           className="pointer-events-auto transition-all"
//           style={{ zIndex: activePlayer === 'spotify' ? 100 : 50 }}
//           onClick={() => spotifyPlayer && setActivePlayer('spotify')}
//         >
//           {spotifyPlayer && (
//             <FloatingPlayer
//               key="spotify-player"
//               type="spotify"
//               trackId={spotifyPlayer.trackId}
//               title={spotifyPlayer.title}
//               artist={spotifyPlayer.artist}
//               onClose={closeSpotify}
//               isActive={activePlayer === 'spotify'}
//             />
//           )}
//         </div>
//       </div>
//     </FloatingPlayersContext.Provider>
//   );
// }

// export function useFloatingPlayers() {
//   const context = useContext(FloatingPlayersContext);
//   if (!context) {
//     throw new Error('useFloatingPlayers must be used within FloatingPlayersProvider');
//   }
//   return context;
// }
