import React from "react";
import Link from "next/link";
import Image from "next/image";

import { cn, formatSecondsToMMSS } from "@/lib/utils";
import { Badge } from "./ui/badge";
import { WatchHistory } from "@/hooks/use-get-bookmark";
import { Progress } from "./ui/progress";

type Props = {
  className?: string;
  poster: string;
  title: string;
  episodeCard?: boolean;
  episodes?: number | null;
  score?: number | null;
  format?: string | null;
  subTitle?: string;
  displayDetails?: boolean;
  variant?: "sm" | "lg";
  href?: string;
  showGenre?: boolean;
  watchDetail?: WatchHistory | null;
};

const AnimeCard = ({
  displayDetails = true,
  variant = "sm",
  ...props
}: Props) => {
  const safeCurrent =
    typeof props.watchDetail?.current === "number"
      ? props.watchDetail.current
      : 0;
  const safeTotal =
    typeof props.watchDetail?.timestamp === "number" &&
    props.watchDetail.timestamp > 0
      ? props.watchDetail.timestamp
      : 0;

  const clampedCurrent = Math.min(safeCurrent, safeTotal);
  const percentage = safeTotal > 0 ? (clampedCurrent / safeTotal) * 100 : 0;

  return (
    <Link href={props.href as string}>
      <div
        className={cn([
          "rounded-xl overflow-hidden relative cursor-pointer hover:scale-105 duration-300",
          variant === "sm" &&
            "h-[12rem] min-[320px]:h-[16.625rem] sm:h-[18rem] max-w-[12.625rem] md:min-w-[12rem]",
          variant === "lg" &&
            "max-w-[12.625rem] md:max-w-[18.75rem] h-auto md:h-[25rem] shrink-0 lg:w-[18.75rem]",
          props.className,
        ])}
      >
        <Image
          src={props.poster}
          alt={props.title}
          height={100}
          width={100}
          className="w-full h-full object-cover"
          unoptimized
        />
        {displayDetails && (
          <>
            <div className="absolute inset-0 m-auto h-full w-full bg-gradient-to-t from-accent to-transparent"></div>
            <div className="absolute bottom-0 flex flex-col gap-1 px-4 pb-3 w-full">
              <h5 className="line-clamp-1 font-bold text-sm text-white">{props.title}</h5>
              {props.watchDetail && (
                <>
                  <p className="text-xs text-gray-400">
                    Episode {props.watchDetail.episodeNumber} -{" "}
                    {formatSecondsToMMSS(props.watchDetail.current)} /{" "}
                    {formatSecondsToMMSS(props.watchDetail.timestamp)}
                  </p>
                  <Progress value={percentage} />
                </>
              )}
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                {props.episodeCard && !!props.episodes && (
                  <Badge className="bg-[#e9376b] text-white text-[10px] px-1.5 py-0.5">
                    Ep {props.episodes}
                  </Badge>
                )}
                {props.format && (
                  <Badge variant="outline" className="text-gray-300 border-gray-600 text-[10px] px-1.5 py-0.5">
                    {props.format}
                  </Badge>
                )}
                {!!props.score && (
                  <span className="text-[11px] font-semibold text-yellow-400 ml-auto">
                    ⭐ {props.score}%
                  </span>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </Link>
  );
};

export default AnimeCard;

