export interface IAnimeSchedule {
  scheduledAnimes: IAnimeScheduleItem[];
}

export interface IAnimeScheduleItem {
  id: string;
  name: string;
  jname: string;
  poster?: string;
  time: string;
  airingTimestamp: number;
  secondsUntilAiring: number;
  episode: number;
}
