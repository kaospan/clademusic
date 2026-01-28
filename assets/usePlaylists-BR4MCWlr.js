import{g as o,i as u,h as i}from"./index-Rp8TUdgU.js";import{u as l}from"./useMutation-CIPb0wv9.js";function p(t){return o({queryKey:["playlists",t],queryFn:async()=>{let r=i.from("playlists").select(`
          *,
          playlist_tracks(count)
        `).order("updated_at",{ascending:!1});t&&(r=r.eq("user_id",t));const{data:e,error:a}=await r;if(a)throw a;return(e||[]).map(s=>{var n,c;return{...s,track_count:((c=(n=s.playlist_tracks)==null?void 0:n[0])==null?void 0:c.count)||0}})},staleTime:2*60*1e3})}function f(t){return o({queryKey:["playlist",t],queryFn:async()=>{if(!t)return null;const{data:r,error:e}=await i.from("playlists").select(`
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
        `).eq("id",t).order("position",{foreignTable:"playlist_tracks"}).single();if(e)throw e;return r},enabled:!!t})}function _(t=20){return o({queryKey:["publicPlaylists",t],queryFn:async()=>{const{data:r,error:e}=await i.from("playlists").select(`
          *,
          playlist_tracks(count),
          owner:user_id(username, avatar_url)
        `).eq("is_public",!0).order("updated_at",{ascending:!1}).limit(t);if(e)throw e;return(r||[]).map(a=>{var s,n;return{...a,track_count:((n=(s=a.playlist_tracks)==null?void 0:s[0])==null?void 0:n.count)||0}})},staleTime:5*60*1e3})}function m(){const t=u();return l({mutationFn:async r=>{const{data:{user:e}}=await i.auth.getUser();if(!e)throw new Error("Not authenticated");const{data:a,error:s}=await i.from("playlists").insert({user_id:e.id,name:r.name,description:r.description||null,is_public:r.is_public??!0}).select().single();if(s)throw s;return a},onSuccess:()=>{t.invalidateQueries({queryKey:["playlists"]})}})}function q(){const t=u();return l({mutationFn:async({playlistId:r,updates:e})=>{const{data:a,error:s}=await i.from("playlists").update(e).eq("id",r).select().single();if(s)throw s;return a},onSuccess:(r,e)=>{t.invalidateQueries({queryKey:["playlist",e.playlistId]}),t.invalidateQueries({queryKey:["playlists"]})}})}function w(){const t=u();return l({mutationFn:async r=>{const{error:e}=await i.from("playlists").delete().eq("id",r);if(e)throw e},onSuccess:()=>{t.invalidateQueries({queryKey:["playlists"]})}})}function k(){const t=u();return l({mutationFn:async({playlistId:r,trackId:e})=>{const{error:a}=await i.from("playlist_tracks").delete().eq("playlist_id",r).eq("track_id",e);if(a)throw a},onSuccess:(r,e)=>{t.invalidateQueries({queryKey:["playlist",e.playlistId]})}})}export{_ as a,m as b,w as c,f as d,q as e,k as f,p as u};
