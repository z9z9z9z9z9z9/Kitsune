"use client";

import React, { useState } from "react";
import Container from "./container";
import AnimeCard from "./anime-card";
import { ROUTES } from "@/constants/routes";
import BlurFade from "./ui/blur-fade";
import { useGetRecentAnime } from "@/query/get-recent-anime";
import Button from "./common/custom-button";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Props = {
  loading?: boolean;
};

const LatestEpisodesAnime = ({ loading: initialLoading }: Props) => {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useGetRecentAnime(page, 14);

  const episodesList = data?.results || [];
  const hasNextPage = data?.hasNextPage ?? false;

  if (isLoading || isFetching || initialLoading || !episodesList.length) {
    return <LoadingSkeleton />;
  }

  return (
    <Container className="flex flex-col gap-5 py-10 items-center lg:items-start lg:mt-[-10.125rem] z-20">
      <h5 className="text-2xl font-bold text-white">Recent Releases</h5>
      <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-5 content-center">
        {episodesList.map((anime, idx) => {
          const title =
            anime.title?.english || anime.title?.romaji || anime.title?.native || "Untitled";
          const poster =
            anime.coverImage?.extraLarge || anime.coverImage?.large || "";
          const epNum = anime.episodes || 1;

          return (
            <BlurFade key={`${anime.id}-${idx}`} delay={idx * 0.03} inView>
              <AnimeCard
                title={title}
                format={anime.format}
                score={anime.averageScore}
                episodes={epNum}
                poster={poster}
                className="self-center justify-self-center"
                href={`${ROUTES.WATCH}?anime=${anime.id}&ep=${epNum}`}
                episodeCard
              />
            </BlurFade>
          );
        })}
      </div>
      {/* Bottom Right Pagination */}
      <div className="flex items-center justify-end w-full gap-3 mt-4">
        <Button
          onClick={() => setPage((p) => Math.max(p - 1, 1))}
          disabled={page <= 1}
          className="rounded-full bg-slate-800 border border-slate-700 h-9 w-9 p-0 hover:bg-slate-700 disabled:opacity-40"
        >
          <ArrowLeft className="text-white h-4 w-4" />
        </Button>
        <Button
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasNextPage}
          className="rounded-full bg-slate-800 border border-slate-700 h-9 w-9 p-0 hover:bg-slate-700 disabled:opacity-40"
        >
          <ArrowRight className="text-white h-4 w-4" />
        </Button>
      </div>
    </Container>
  );
};

const LoadingSkeleton = () => {
  return (
    <Container className="flex flex-col gap-5 py-10 items-center lg:items-start lg:mt-[-10.125rem] z-20 ">
      <div className="h-10 w-[15.625rem] animate-pulse bg-slate-700"></div>
      <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-5 content-center">
        {[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1].map((_, idx) => {
          return (
            <div
              key={idx}
              className="rounded-xl h-[15.625rem] min-w-[10.625rem] max-w-[12.625rem] md:h-[18.75rem] md:max-w-[12.5rem] animate-pulse bg-slate-700"
            ></div>
          );
        })}
      </div>
    </Container>
  );
};

export default LatestEpisodesAnime;
