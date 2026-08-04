import React from "react";
import Container from "./container";
import FeaturedCollectionCard from "./featured-collection-card";
import { MediaList } from "@/types/miruro-api";

type CategoryItem = {
  title: string;
  anime: MediaList[];
};

type Props = {
  featuredAnime: CategoryItem[];
  loading: boolean;
};

const FeaturedCollection = ({ featuredAnime, loading }: Props) => {
  if (loading || !featuredAnime?.length) return <LoadingSkeleton />;
  return (
    <Container className="flex flex-col gap-5 items-center lg:items-start py-5">
      <h5 className="text-2xl font-bold">Featured Collection</h5>
      <div className="grid w-full gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {featuredAnime.map((category, idx) => (
          <FeaturedCollectionCard
            title={category.title}
            key={idx}
            anime={category.anime}
          />
        ))}
      </div>
    </Container>
  );
};

const LoadingSkeleton = () => {
  return (
    <Container className="flex flex-col gap-5 py-10 items-center lg:items-start ">
      <div className="h-10 w-[15.625rem] animate-pulse bg-slate-700"></div>
      <div className="grid w-full gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 1, 1].map((_, idx) => {
          return (
            <div
              key={idx}
              className="rounded-xl h-[15.625rem] w-[100%] md:h-[18.75rem] animate-pulse bg-slate-700"
            ></div>
          );
        })}
      </div>
    </Container>
  );
};

export default FeaturedCollection;

