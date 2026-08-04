"use client";

import React from "react";
import Container from "./container";
import AnimeCard from "./anime-card";

import BlurFade from "./ui/blur-fade";
import { MediaList } from "@/types/miruro-api";
import { ROUTES } from "@/constants/routes";

import Button from "./common/custom-button";
import { ArrowLeft, ArrowRight } from "lucide-react";

type Props = {
  animeList: MediaList[];
  loading: boolean;
  title: string;
  page?: number;
  hasNextPage?: boolean;
  onPageChange?: (newPage: number) => void;
};

const AnimeSections = ({
  animeList,
  loading,
  title: sectionTitle,
  page = 1,
  hasNextPage = false,
  onPageChange,
}: Props) => {
  if (loading || !animeList?.length) return <LoadingSkeleton />;
  return (
    <Container className="flex flex-col gap-5 py-10 items-center lg:items-start ">
      <h5 className="text-2xl font-bold text-white">{sectionTitle}</h5>
      <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-5 content-center">
        {animeList.map((anime, idx) => {
          const title =
            anime.title?.english || anime.title?.romaji || anime.title?.native || "Untitled";
          const poster =
            anime.coverImage?.extraLarge || anime.coverImage?.large || "";

          return (
            <BlurFade key={`${anime.id}-${idx}`} delay={idx * 0.03} inView>
              <AnimeCard
                title={title}
                format={anime.format}
                score={anime.averageScore}
                poster={poster}
                className="self-center justify-self-center"
                href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
              />
            </BlurFade>
          );
        })}
      </div>
      {onPageChange && (
        <div className="flex items-center justify-end w-full gap-3 mt-4">
          <Button
            onClick={() => onPageChange(Math.max(page - 1, 1))}
            disabled={page <= 1}
            className="rounded-full bg-slate-800 border border-slate-700 h-9 w-9 p-0 hover:bg-slate-700 disabled:opacity-40"
          >
            <ArrowLeft className="text-white h-4 w-4" />
          </Button>
          <Button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasNextPage}
            className="rounded-full bg-slate-800 border border-slate-700 h-9 w-9 p-0 hover:bg-slate-700 disabled:opacity-40"
          >
            <ArrowRight className="text-white h-4 w-4" />
          </Button>
        </div>
      )}
    </Container>
  );
};

const LoadingSkeleton = () => {
  return (
    <Container className="flex flex-col gap-5 py-10 items-center lg:items-start ">
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

export default AnimeSections;
