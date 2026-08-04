export interface IComment {
  id: string;
  content: string;
  user: string;
  animeId: string;
  animeTitle: string;
  episodeNumber: number;
  spoil: boolean;
  created: string;
  updated: string;
  expand?: {
    user?: {
      id: string;
      username: string;
      avatar: string;
      collectionId: string;
    };
  };
}
