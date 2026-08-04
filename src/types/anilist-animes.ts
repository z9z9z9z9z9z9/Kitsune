export interface AnilistAnimes {
  data: Data;
}

export interface Data {
  MediaListCollection: MediaListCollection;
}

export interface MediaListCollection {
  lists: AnilistMediaList[];
}

export interface AnilistMediaList {
  name: string;
  entries: Entry[];
  status: string;
}

export interface Entry {
  media: Media;
}

export interface Media {
  id: number;
  bannerImage?: string;
  coverImage?: {
    extraLarge?: string;
    large?: string;
  };
  idMal?: number;
  title: {
    english?: string | null;
    romaji?: string | null;
    native?: string | null;
  };
}
