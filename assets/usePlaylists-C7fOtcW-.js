import{n as o,o as u,p as l,s as i}from"./index-DUhRx8mA.js";const y=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;function d(t,a){const e=a==null?void 0:a.code;return typeof e=="string"&&e.length>0?!1:t<2}function p(t){return o({queryKey:["playlists",t],queryFn:async()=>{let a=i.from("playlists").select(`
          *,
          playlist_tracks(count)
        `).order("updated_at",{ascending:!1});t&&(a=a.eq("user_id",t));const{data:e,error:s}=await a;if(s)throw s;return(e||[]).map(r=>{var n,c;return{...r,track_count:((c=(n=r.playlist_tracks)==null?void 0:n[0])==null?void 0:c.count)||0}})},staleTime:2*60*1e3})}function _(t){return o({queryKey:["playlist",t],queryFn:async()=>{if(!t||!y.test(t))return null;const{data:a,error:e}=await i.from("playlists").select(`
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
        `).eq("id",t).order("position",{foreignTable:"playlist_tracks"}).maybeSingle();if(e)throw e;return a},enabled:!!t,retry:d})}function m(t=20){return o({queryKey:["publicPlaylists",t],queryFn:async()=>{const{data:a,error:e}=await i.from("playlists").select(`
          *,
          playlist_tracks(count),
          owner:user_id(username, avatar_url)
        `).eq("is_public",!0).order("updated_at",{ascending:!1}).limit(t);if(e)throw e;return(a||[]).map(s=>{var r,n;return{...s,track_count:((n=(r=s.playlist_tracks)==null?void 0:r[0])==null?void 0:n.count)||0}})},staleTime:5*60*1e3})}function q(){const t=u();return l({mutationFn:async a=>{const{data:{user:e}}=await i.auth.getUser();if(!e)throw new Error("Not authenticated");const{data:s,error:r}=await i.from("playlists").insert({user_id:e.id,name:a.name,description:a.description||null,is_public:a.is_public??!0}).select().single();if(r)throw r;return s},onSuccess:()=>{t.invalidateQueries({queryKey:["playlists"]})}})}function w(){const t=u();return l({mutationFn:async({playlistId:a,updates:e})=>{const{data:s,error:r}=await i.from("playlists").update(e).eq("id",a).select().single();if(r)throw r;return s},onSuccess:(a,e)=>{t.invalidateQueries({queryKey:["playlist",e.playlistId]}),t.invalidateQueries({queryKey:["playlists"]})}})}function k(){const t=u();return l({mutationFn:async a=>{const{error:e}=await i.from("playlists").delete().eq("id",a);if(e)throw e},onSuccess:()=>{t.invalidateQueries({queryKey:["playlists"]})}})}function h(){const t=u();return l({mutationFn:async({playlistId:a,trackId:e})=>{const{error:s}=await i.from("playlist_tracks").delete().eq("playlist_id",a).eq("track_id",e);if(s)throw s},onSuccess:(a,e)=>{t.invalidateQueries({queryKey:["playlist",e.playlistId]})}})}export{m as a,q as b,k as c,_ as d,w as e,h as f,d as s,p as u};
