export interface SocialLinks {
  spotify?: string;
  appleMusic?: string;
  youtube?: string;
  soundcloud?: string;
  instagram?: string;
  twitter?: string;
  tidal?: string;
  deezer?: string;
  amazon?: string;
  lastfm?: string;
}

export interface SiteConfig {
  siteName: string;
  tagline: string;
  description: string;
  email: {
    general: string;
    booking: string;
  };
  socials: SocialLinks;
  formspreeId: string;
  copyright: string;
}

export interface Track {
  title: string;
  duration: string;
}

export interface Release {
  id: string;
  title: string;
  artist: string;
  type: "Single" | "EP" | "Album";
  releaseDate: string;
  artwork: string;
  description: string;
  genres: string[];
  tracks: Track[];
  links: Partial<SocialLinks>;
  embedUrl?: string;
  featured?: boolean;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time?: string;
  venue: string;
  city: string;
  country: string;
  description?: string;
  ticketUrl?: string;
  price?: string;
}

export interface EventsData {
  upcoming: Event[];
  past: Omit<Event, "time" | "description" | "ticketUrl" | "price">[];
}

export interface MerchItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  url: string;
  category: string;
  inStock: boolean;
}
