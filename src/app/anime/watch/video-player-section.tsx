"use client";

import React, { useEffect, useState } from "react";
import { useAnimeStore } from "@/store/anime-store";
import dynamic from "next/dynamic";

const KitsunePlayer = dynamic(() => import("@/components/kitsune-player"), {
  ssr: false,
});
import { useGetEpisodeData } from "@/query/get-episode-data";
import { Captions, Mic, AlertCircle, Tv } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useGetAllEpisodes } from "@/query/get-all-episodes";

import useBookMarks from "@/hooks/use-get-bookmark";
import { useGetSourceAvailable } from "@/query/get-source-available";

const VideoPlayerSection = () => {
  const searchParams = useSearchParams();
  const animeIdParam = searchParams.get("anime") || "";
  const epParam = searchParams.get("ep");
  const episodeIdParam = searchParams.get("episode") || "";
  const { selectedEpisode, setSelectedEpisode, anime } = useAnimeStore();

  const { data: isSourceAvailable } = useGetSourceAvailable();
  const { data: allEpisodesData } = useGetAllEpisodes(animeIdParam);

  // Match episode number from ?ep= parameter if present
  const targetEpByNumber = epParam && allEpisodesData?.episodes
    ? allEpisodesData.episodes.find((e) => e.number === Number(epParam))
    : null;

  // Resolve active episode ID prioritizing ?ep= parameter
  const activeEpisodeId =
    targetEpByNumber?.episodeId ||
    selectedEpisode ||
    episodeIdParam ||
    allEpisodesData?.episodes?.[0]?.episodeId ||
    "";

  // Sync selectedEpisode in store with ?ep= parameter if provided
  useEffect(() => {
    if (targetEpByNumber?.episodeId && selectedEpisode !== targetEpByNumber.episodeId) {
      setSelectedEpisode(targetEpByNumber.episodeId);
    }
  }, [targetEpByNumber?.episodeId, selectedEpisode, setSelectedEpisode]);

  const isPrimaryDisabled = isSourceAvailable === false;

  const [useFallback, setUseFallback] = useState<boolean>(false);

  const { data: episodeData, isLoading: isLoadingData } =
    useGetEpisodeData(activeEpisodeId, !isPrimaryDisabled && !useFallback);

  const [autoSkip, setAutoSkip] = useState<boolean>(true);
  const [preferredCategory, setPreferredCategory] = useState<"sub" | "dub">("sub");

  const { createOrUpdateBookMark, syncWatchProgress } = useBookMarks({
    animeID: animeIdParam,
    populate: false,
  });

  const fallbackBookmarkIdRef = React.useRef<string | null>(null);
  const fallbackWatchedRecordIdRef = React.useRef<string | null>(null);
  const lastSyncedTimeRef = React.useRef<number>(0);

  useEffect(() => {
    setUseFallback(false);
  }, [activeEpisodeId]);

  useEffect(() => {
    const storedSkip = localStorage.getItem("autoSkip");
    if (storedSkip !== null) setAutoSkip(storedSkip === "true");

    const storedCategory = localStorage.getItem("preferredCategory");
    if (storedCategory === "sub" || storedCategory === "dub") {
      setPreferredCategory(storedCategory);
    }
  }, []);

  function onHandleAutoSkipChange(value: boolean) {
    setAutoSkip(value);
    localStorage.setItem("autoSkip", JSON.stringify(value));
  }

  // Extract dynamic providers from EpisodeResponse
  const rawProviders = allEpisodesData?.rawResponse?.providers || {};
  const providerNames = Object.keys(rawProviders);

  // Extract current episode number from activeEpisodeId
  const currentEpNumber =
    allEpisodesData?.episodes?.find((e) => e.episodeId === activeEpisodeId)?.number || 1;

  // Check sub/dub availability for this episode
  const hasSub = providerNames.some(
    (p) => (rawProviders[p]?.episodes?.sub?.length || 0) > 0,
  );
  const hasDub = providerNames.some(
    (p) => (rawProviders[p]?.episodes?.dub?.length || 0) > 0,
  );

  const handleCategoryChange = (cat: "sub" | "dub") => {
    setPreferredCategory(cat);
    localStorage.setItem("preferredCategory", cat);

    // Switch active episode to the first available server of that category for current episode
    if (providerNames.length > 0) {
      for (const pName of providerNames) {
        const pData = rawProviders[pName]?.episodes?.[cat] || [];
        const targetEp = pData.find((ep: any) => ep.number === currentEpNumber) || pData[0];
        if (targetEp?.id) {
          setSelectedEpisode(targetEp.id);
          break;
        }
      }
    }
  };

  // Synchronize activeEpisodeId category with preferredCategory ("sub" or "dub")
  useEffect(() => {
    if (!providerNames.length || !allEpisodesData?.rawResponse?.providers) return;

    const cleanParts = activeEpisodeId.replace(/^\//, "").split("/");
    const activeCat = cleanParts[3] === "dub" ? "dub" : "sub";

    // If active episode category does not match preferredCategory, switch to preferredCategory if available
    if (activeCat !== preferredCategory) {
      for (const pName of providerNames) {
        const pData = rawProviders[pName]?.episodes?.[preferredCategory] || [];
        const targetEp = pData.find((ep: any) => ep.number === currentEpNumber);
        if (targetEp?.id) {
          setSelectedEpisode(targetEp.id);
          break;
        }
      }
    }
  }, [
    currentEpNumber,
    preferredCategory,
    providerNames,
    rawProviders,
    activeEpisodeId,
    setSelectedEpisode,
    allEpisodesData,
  ]);

  const isFallbackActive =
    isSourceAvailable === false ||
    useFallback ||
    (!isLoadingData && (!episodeData || !episodeData.sources?.length));

  // Listen to postMessage events from Fallback Player iframe (megaplay.buzz / megacloud)
  useEffect(() => {
    fallbackWatchedRecordIdRef.current = null;
    lastSyncedTimeRef.current = 0;

    if (!isFallbackActive || !animeIdParam || !activeEpisodeId) return;

    let isMounted = true;

    const initBookmark = async () => {
      const animeName = anime?.anime?.info?.name || "Anime";
      const poster = anime?.anime?.info?.poster || "";
      const bId = await createOrUpdateBookMark(
        animeIdParam,
        animeName,
        poster,
        "watching",
        false,
      );
      if (isMounted) {
        fallbackBookmarkIdRef.current = bId;
      }
    };

    initBookmark();

    const handleIframeMessage = async (event: MessageEvent) => {
      let data = event.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      if (!data || typeof data !== "object") return;

      // Extract currentTime and duration from time/watching-log events
      let currentTime: number | null = null;
      let duration: number | null = null;

      if (typeof data.currentTime === "number") {
        currentTime = data.currentTime;
      } else if (typeof data.time === "number") {
        currentTime = data.time;
      }

      if (typeof data.duration === "number") {
        duration = data.duration;
      }

      const isComplete = data.event === "complete";

      if (currentTime !== null && duration !== null && duration > 0) {
        const now = Math.floor(currentTime);
        // Throttle updates every 10 seconds or on complete
        if (isComplete || Math.abs(now - lastSyncedTimeRef.current) >= 10) {
          lastSyncedTimeRef.current = now;

          if (fallbackBookmarkIdRef.current) {
            const recordId = await syncWatchProgress(
              fallbackBookmarkIdRef.current,
              fallbackWatchedRecordIdRef.current,
              {
                episodeId: activeEpisodeId,
                episodeNumber: Number(currentEpNumber) || 1,
                current: currentTime,
                duration: duration,
              },
            );
            if (recordId && isMounted) {
              fallbackWatchedRecordIdRef.current = recordId;
            }
          }
        }
      }
    };

    window.addEventListener("message", handleIframeMessage);
    return () => {
      isMounted = false;
      window.removeEventListener("message", handleIframeMessage);
    };
  }, [
    useFallback,
    isLoadingData,
    episodeData,
    activeEpisodeId,
    animeIdParam,
    anime,
    currentEpNumber,
    createOrUpdateBookMark,
    syncWatchProgress,
  ]);

  const handleProviderSelect = (pName: string, category: "sub" | "dub") => {
    setPreferredCategory(category);
    localStorage.setItem("preferredCategory", category);

    const pData = rawProviders[pName]?.episodes?.[category] || [];
    const targetEp = pData.find((ep: any) => ep.number === currentEpNumber) || pData[0];
    if (targetEp?.id) {
      setSelectedEpisode(targetEp.id);
    }
  };

  // Cleanly extract active provider and category regardless of leading slash e.g. "watch/kiwi/178005/sub/slug"
  const cleanParts = activeEpisodeId.replace(/^\//, "").split("/");
  const currentProviderName = cleanParts[1] || providerNames[0] || "kiwi";
  const activeCategory = cleanParts[3] === "dub" ? "dub" : preferredCategory;

  if (!activeEpisodeId || isLoadingData) {
    return (
      <div className="h-auto aspect-video lg:max-h-[calc(100vh-150px)] min-h-[20vh] sm:min-h-[30vh] md:min-h-[40vh] lg:min-h-[60vh] w-full animate-pulse bg-slate-800 rounded-xl"></div>
    );
  }

  // Fallback player if API stream fails, throws error, returns no sources, or sys_source_available is false
  if (isFallbackActive) {
    const fallbackAnimeId = animeIdParam || anime?.anime?.info?.id || "1";
    const fallbackEpId = currentEpNumber || "1";
    const fallbackSrc = `https://megaplay.buzz/stream/ani/${fallbackAnimeId}/${fallbackEpId}/${activeCategory}`;

    return (
      <div className="flex flex-col gap-4 w-full">
        <div className="relative w-full h-auto aspect-video min-h-[20vh] sm:min-h-[30vh] md:min-h-[40vh] lg:min-h-[60vh] max-h-[500px] lg:max-h-[calc(100vh-150px)] bg-black overflow-hidden rounded-xl border border-slate-800">
          <iframe
            key={`${fallbackAnimeId}-${fallbackEpId}-${activeCategory}`}
            src={fallbackSrc}
            width="100%"
            height="100%"
            allowFullScreen
            className="w-full h-full border-0"
          ></iframe>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#0f172a] rounded-xl border border-slate-800">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-gray-400 tracking-wider">CATEGORY:</span>
            <Button
              size="sm"
              variant="ghost"
              disabled={!hasSub}
              onClick={() => handleCategoryChange("sub")}
              className={`h-8 px-4 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                activeCategory === "sub"
                  ? "bg-[#e9376b] text-white hover:bg-[#e9376b]"
                  : "bg-slate-800 text-gray-400 hover:bg-slate-700"
              }`}
            >
              <Captions className="h-3.5 w-3.5" /> SUB
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={!hasDub}
              onClick={() => handleCategoryChange("dub")}
              className={`h-8 px-4 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition ${
                activeCategory === "dub"
                  ? "bg-green-600 text-white hover:bg-green-600"
                  : "bg-slate-800 text-gray-400 hover:bg-slate-700"
              }`}
            >
              <Mic className="h-3.5 w-3.5" /> DUB
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUseFallback(false)}
            className="h-8 px-3 text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-gray-200 flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Tv className="h-3.5 w-3.5 text-blue-400" /> Try Primary Player
          </Button>
        </div>
        <Alert variant="destructive" className="border-red-800/80 bg-red-950/40 text-red-300 rounded-xl">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertTitle className="font-bold">Fallback Video Player Activated</AlertTitle>
          <AlertDescription className="text-xs text-red-300/80 mt-1">
            The primary video stream is currently unavailable or encountered an error. A fallback player has been automatically loaded for your viewing convenience.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <KitsunePlayer
        key={episodeData.sources?.[0]?.url}
        episodeInfo={episodeData}
        serversData={{
          episodeId: activeEpisodeId,
          episodeNo: String(currentEpNumber),
          sub: providerNames.map((p, idx) => ({ serverId: idx + 1, serverName: p })),
          dub: [],
          raw: [],
        }}
        animeInfo={{
          id: anime?.anime?.info?.id || "0",
          title: anime?.anime?.info?.name || "Anime",
          image: anime?.anime?.info?.poster || "",
        }}
        subOrDub={activeCategory}
        autoSkip={autoSkip}
        onError={() => setUseFallback(true)}
      />
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full p-5 bg-[#0f172a] border-t border-slate-800">
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <div className="flex flex-wrap items-center gap-3">
            <Captions className="text-red-400 h-4 w-4 shrink-0" />
            <p className="font-bold text-xs text-gray-300 tracking-wider">SERVERS (SUB):</p>
            {providerNames.map((pName) => {
              const hasSub = (rawProviders[pName]?.episodes?.sub || []).length > 0;
              if (!hasSub) return null;
              const isActive =
                currentProviderName.toLowerCase() === pName.toLowerCase() &&
                activeCategory === "sub";

              return (
                <Button
                  size="sm"
                  key={`sub-${pName}`}
                  className={`uppercase font-bold text-xs px-3 transition-all ${
                    isActive
                      ? "bg-[#e9376b] text-white shadow-md ring-2 ring-[#e9376b]/40 scale-105"
                      : "bg-slate-800/80 text-gray-300 hover:bg-slate-700 hover:text-white"
                  }`}
                  onClick={() => handleProviderSelect(pName, "sub")}
                >
                  {pName}
                </Button>
              );
            })}
          </div>

          {providerNames.some((p) => (rawProviders[p]?.episodes?.dub || []).length > 0) && (
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <Mic className="text-green-400 h-4 w-4 shrink-0" />
              <p className="font-bold text-xs text-gray-300 tracking-wider">SERVERS (DUB):</p>
              {providerNames.map((pName) => {
                const hasDub = (rawProviders[pName]?.episodes?.dub || []).length > 0;
                if (!hasDub) return null;
                const isActive =
                  currentProviderName.toLowerCase() === pName.toLowerCase() &&
                  activeCategory === "dub";

                return (
                  <Button
                    size="sm"
                    key={`dub-${pName}`}
                    className={`uppercase font-bold text-xs px-3 transition-all ${
                      isActive
                        ? "bg-green-600 text-white shadow-md ring-2 ring-green-500/40 scale-105"
                        : "bg-slate-800/80 text-gray-300 hover:bg-slate-700 hover:text-white"
                    }`}
                    onClick={() => handleProviderSelect(pName, "dub")}
                  >
                    {pName}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm shrink-0 self-start md:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUseFallback(true)}
            className="h-8 px-3 text-xs border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-gray-200 flex items-center gap-1.5"
          >
            <Tv className="h-3.5 w-3.5 text-yellow-400" /> Switch to Fallback Player
          </Button>
          <div className="flex flex-row items-center space-x-2">
            <Switch
              checked={autoSkip}
              onCheckedChange={(e) => onHandleAutoSkipChange(e)}
              id="auto-skip"
            />
            <p>Auto Skip</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerSection;
