"use client";

import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "./ui/carousel";

import Container from "./container";
import { Button } from "./ui/button";

import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { ROUTES } from "@/constants/routes";
import { ButtonLink } from "./common/button-link";
import { MediaList } from "@/types/miruro-api";
import { Badge } from "./ui/badge";

type IHeroSectionProps = {
  spotlightAnime: MediaList[];
  isDataLoading: boolean;
};

const HeroSection = (props: IHeroSectionProps) => {
  const [api, setApi] = React.useState<CarouselApi>();

  if (props.isDataLoading || !props.spotlightAnime?.length)
    return <LoadingSkeleton />;

  return (
    <div className="h-[80vh] w-full relative">
      <Carousel className="w-full" setApi={setApi} opts={{ loop: true }}>
        <CarouselContent>
          {props.spotlightAnime.map((anime, index) => (
            <CarouselItem key={anime.id || index}>
              <HeroCarouselItem anime={anime} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <div className="absolute hidden md:flex items-center gap-5 right-10 3xl:bottom-10 bottom-24 z-50 isolate">
        <Button
          onClick={() => {
            api?.scrollPrev();
          }}
          className="rounded-full bg-transparent border border-white h-10 w-10 hover:bg-slate-500"
        >
          <ArrowLeft className="text-white shrink-0" />
        </Button>
        <Button
          onClick={() => api?.scrollNext()}
          className="rounded-full bg-transparent border border-white h-10 w-10 hover:bg-slate-500"
        >
          <ArrowRight className="text-white shrink-0" />
        </Button>
      </div>
    </div>
  );
};

const HeroCarouselItem = ({ anime }: { anime: MediaList }) => {
  const bgImage =
    anime.bannerImage ||
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    "";
  const title =
    anime.title?.english || anime.title?.romaji || anime.title?.native || "Untitled";

  return (
    <div
      className="w-full bg-cover bg-no-repeat bg-center h-[80vh] relative"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Gradient Overlay */}
      <div className="absolute h-full w-full inset-0 m-auto bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent z-10"></div>
      <div className="absolute h-full w-full inset-0 m-auto bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-10"></div>

      {/* Content Section */}
      <div className="w-full h-[calc(100%-5.25rem)] relative z-20">
        <Container className="w-full h-full flex flex-col justify-end md:justify-center pb-10">
          <div className="space-y-3 lg:w-[45vw]">
            <h1 className="text-3xl md:text-5xl font-black text-white line-clamp-2">
              {title}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {anime.format && (
                <Badge className="bg-[#e9376b] text-white font-bold">
                  {anime.format}
                </Badge>
              )}
              {anime.seasonYear && (
                <Badge variant="outline" className="text-gray-300 border-gray-600">
                  {anime.season ? `${anime.season} ` : ""}{anime.seasonYear}
                </Badge>
              )}
              {!!anime.averageScore && (
                <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                  ⭐ {anime.averageScore}% Score
                </Badge>
              )}
              {anime.genres?.slice(0, 3).map((g) => (
                <span key={g} className="text-gray-400 text-xs">
                  • {g}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-5 !mt-6">
              <ButtonLink
                href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                className="h-10 text-md bg-[#e9376b] text-white hover:bg-[#e9376b]"
              >
                Learn More
              </ButtonLink>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
};

const LoadingSkeleton = () => {
  return (
    <div className="h-[80vh] w-full relative">
      <div className="w-full h-[calc(100%-5.25rem)] mt-[5.25rem] relative z-20">
        <Container className="w-full h-full flex flex-col justify-end md:justify-center pb-10">
          <div className="space-y-2 lg:w-[40vw]">
            <div className="h-16 animate-pulse bg-slate-700 w-[75%]"></div>
            <div className="h-40 animate-pulse w-full bg-slate-700"></div>
            <div className="flex items-center gap-5">
              <span className="h-10 w-[7.5rem] animate-pulse bg-slate-700"></span>
              <span className="h-10 w-[7.5rem] animate-pulse bg-slate-700"></span>
            </div>
          </div>
        </Container>
      </div>
      <div className="absolute hidden md:flex items-center gap-5 right-10 bottom-32 z-50 isolate">
        <span className="h-10 w-10 rounded-full animate-pulse bg-slate-700"></span>
        <span className="h-10 w-10 rounded-full animate-pulse bg-slate-700"></span>
      </div>
    </div>
  );
};
export default HeroSection;
