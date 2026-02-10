import{o,w as u,x as l,q as i}from"./index-BzSc1h44.js";function d(t){return o({queryKey:["playlists",t],queryFn:async()=>{let a=i.from("playlists").select(`
          *,
          playlist_tracks(count)
        `).order("updated_at",{ascending:!1});t&&(a=a.eq("user_id",t));const{data:e,error:r}=await a;if(r)throw r;return(e||[]).map(s=>{var n,c;return{...s,track_count:((c=(n=s.playlist_tracks)==null?void 0:n[0])==null?void 0:c.count)||0}})},staleTime:2*60*1e3})}function p(t){return o({queryKey:["playlist",t],queryFn:async()=>{if(!t)return null;const{data:a,error:e}=await i.from("playlists").select(`
          *,
          playlist_tracks(
            *,
            track:track_id(*)
          ),
          playlist_collaborators(
            *,
            user:user_id(username, avatar_url)
          ),
          owner:user_id(username, avatar_url)
        `).eq("id",t).order("position",{foreignTable:"playlist_tracks"}).single();if(e)throw e;return a},enabled:!!t})}function f(t=20){return o({queryKey:["publicPlaylists",t],queryFn:async()=>{const{data:a,error:e}=await i.from("playlists").select(`
          *,
          playlist_tracks(count),
          owner:user_id(username, avatar_url)
        `).eq("is_public",!0).order("updated_at",{ascending:!1}).limit(t);if(e)throw e;return(a||[]).map(r=>{var s,n;return{...r,track_count:((n=(s=r.playlist_tracks)==null?void 0:s[0])==null?void 0:n.count)||0}})},staleTime:5*60*1e3})}function _(){const t=u();return l({mutationFn:async a=>{const{data:{user:e}}=await i.auth.getUser();if(!e)throw new Error("Not authenticated");const{data:r,error:s}=await i.from("playlists").insert({user_id:e.id,name:a.name,description:a.description||null,is_public:a.is_public??!0}).select().single();if(s)throw s;return r},onSuccess:()=>{t.invalidateQueries({queryKey:["playlists"]})}})}function m(){const t=u();return l({mutationFn:async({playlistId:a,updates:e})=>{const{data:r,error:s}=await i.from("playlists").update(e).eq("id",a).select().single();if(s)throw s;return r},onSuccess:(a,e)=>{t.invalidateQueries({queryKey:["playlist",e.playlistId]}),t.invalidateQueries({queryKey:["playlists"]})}})}function q(){const t=u();return l({mutationFn:async a=>{const{error:e}=await i.from("playlists").delete().eq("id",a);if(e)throw e},onSuccess:()=>{t.invalidateQueries({queryKey:["playlists"]})}})}function w(){const t=u();return l({mutationFn:async({playlistId:a,trackId:e})=>{const{error:r}=await i.from("playlist_tracks").delete().eq("playlist_id",a).eq("track_id",e);if(r)throw r},onSuccess:(a,e)=>{t.invalidateQueries({queryKey:["playlist",e.playlistId]})}})}export{f as a,_ as b,q as c,p as d,m as e,w as f,d as u};
