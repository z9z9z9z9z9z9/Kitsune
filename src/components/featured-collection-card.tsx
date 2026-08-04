import React from "react";
import AnimeCard from "./anime-card";
import { MediaList } from "@/types/miruro-api";
import { ROUTES } from "@/constants/routes";

type Props = {
  title: string;
  anime: MediaList[];
};

const FeaturedCollectionCard = (props: Props) => {
  if (!props.anime || props.anime.length < 3) return null;

  return (
    <div className="h-[18.5rem] flex flex-col gap-2 items-center rounded-lg overflow-hidden bg-[#212121] w-full">
      <h5 className="text-lg font-semibold pt-5 text-center">{props.title}</h5>
      <div className="w-full relative grow flex">
        {props.anime.slice(0, 3).map((item, index) => {
          const title = item.title?.english || item.title?.romaji || item.title?.native || "Untitled";
          const poster = item.coverImage?.extraLarge || item.coverImage?.large || "";
          const classNames = [
            "absolute md:bottom-[-5.25rem] bottom-[-4.25rem] left-[15%] rotate-[-20deg] w-[9.375rem] border-[.50rem] border-[#212121]",
            "absolute md:bottom-[-6.25rem] bottom-[-5rem] rotate-[-10deg] left-[30%] w-[9.375rem] border-[.50rem] border-[#212121]",
            "absolute md:bottom-[-6.25rem] bottom-[-6rem] left-[45%] rotate-[5deg] w-[9.375rem] border-[.50rem] border-[#212121]",
          ];

          return (
            <AnimeCard
              key={item.id || index}
              title={title}
              format={item.format}
              score={item.averageScore}
              className={classNames[index]}
              poster={poster}
              href={`${ROUTES.ANIME_DETAILS}/${item.id}`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default FeaturedCollectionCard;
