"use client";

import React, { useEffect, useState, useMemo } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import { pb } from "@/lib/pocketbase";
import { useAuthStore } from "@/store/auth-store";
import styles from "../heatmap.module.css";
import { Tooltip } from "react-tooltip";
import { Bookmark, WatchHistory } from "@/hooks/use-get-bookmark";
import { Tv, Sparkles, Calendar, Clock, X, ChevronRight } from "lucide-react";
import Link from "next/link";

type HeatmapValue = {
  date: string;
  count: number;
};

type ActivityItem = {
  id: string;
  animeId: string;
  animeTitle: string;
  thumbnail: string;
  episodeNumber: number;
  current: number;
  duration?: number;
  created: string;
};

type TargetUser = {
  id: string;
  username: string;
  avatar: string;
  collectionId: string;
  created?: string;
};

type Props = {
  targetUser?: TargetUser | null;
};

const ActivityProgression = ({ targetUser }: Props) => {
  const { auth, setAuth } = useAuthStore();
  const effectiveUser = targetUser || auth;

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [heatmapData, setHeatmapData] = useState<HeatmapValue[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [totalEpisodesCount, setTotalEpisodesCount] = useState<number>(0);

  const [userCreatedDate, setUserCreatedDate] = useState<Date>(() => {
    if (effectiveUser?.created) return new Date(effectiveUser.created);
    return new Date();
  });

  // Fetch true user account creation timestamp directly from PocketBase
  useEffect(() => {
    if (!effectiveUser?.id) return;
    pb.collection("users")
      .getOne(effectiveUser.id, { requestKey: null })
      .then((userRecord) => {
        if (userRecord?.created) {
          const cDate = new Date(userRecord.created);
          setUserCreatedDate(cDate);
          if (auth && effectiveUser.id === auth.id && auth.created !== userRecord.created) {
            setAuth({ ...auth, created: userRecord.created });
          }
        }
      })
      .catch(console.error);
  }, [effectiveUser?.id]);

  const joinedYear = userCreatedDate.getFullYear();
  const currentYear = new Date().getFullYear();

  // Generate available years list from currentYear down to joinedYear
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= Math.min(joinedYear, currentYear); y--) {
      years.push(y);
    }
    return years;
  }, [currentYear, joinedYear]);

  // Date range for heatmap
  const startDate = new Date(selectedYear, 0, 1);
  const endDate = new Date(selectedYear, 11, 31);

  // Fetch bookmarks & watchHistory from PocketBase
  useEffect(() => {
    if (!effectiveUser?.id) return;

    const fetchActivityData = async () => {
      try {
        setIsLoading(true);
        const bookmarks = await pb.collection<Bookmark>("bookmarks").getFullList({
          filter: `user = "${effectiveUser.id}"`,
          expand: "watchHistory",
          requestKey: null,
        });

        const allActivities: ActivityItem[] = [];
        const dailyCounts: Record<string, number> = {};
        let count = 0;

        bookmarks.forEach((b) => {
          const watchList = b.expand?.watchHistory || [];
          watchList.forEach((w: WatchHistory) => {
            if (!w.created) return;
            const dateStr = w.created.substring(0, 10);
            const wYear = new Date(w.created).getFullYear();

            // Count for selected year heatmap
            if (wYear === selectedYear) {
              dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
              count += 1;
            }

            allActivities.push({
              id: w.id,
              animeId: b.animeId,
              animeTitle: b.animeTitle || "Anime",
              thumbnail: b.thumbnail,
              episodeNumber: w.episodeNumber,
              current: w.current || 0,
              created: w.created,
            });
          });
        });

        // Format heatmap items
        const heatmapList: HeatmapValue[] = Object.entries(dailyCounts).map(([date, cnt]) => ({
          date,
          count: cnt,
        }));

        // Sort activities newest first
        allActivities.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

        setHeatmapData(heatmapList);
        setActivities(allActivities);
        setTotalEpisodesCount(count);
      } catch (err) {
        console.error("Failed to fetch activity progression:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivityData();
  }, [effectiveUser?.id, selectedYear]);

  // Filter activities based on selected year or specific clicked date
  const filteredActivities = useMemo(() => {
    if (selectedDate) {
      return activities.filter((act) => act.created.startsWith(selectedDate));
    }
    return activities.filter((act) => new Date(act.created).getFullYear() === selectedYear);
  }, [activities, selectedDate, selectedYear]);

  const getClassForValue = (value: HeatmapValue | null): string => {
    if (!value || value.count === 0) return styles.colorEmpty;
    if (value.count >= 10) return styles.colorScale4;
    if (value.count >= 5) return styles.colorScale3;
    if (value.count >= 2) return styles.colorScale2;
    return styles.colorScale1;
  };

  const getTooltipContent = (
    value: HeatmapValue | null,
  ): Record<string, string> => {
    const val = value as HeatmapValue;
    if (!val?.date) {
      return {
        "data-tooltip-id": "activity-heatmap-tooltip",
        "data-tooltip-content": "No watch activity",
      };
    }
    const fDate = new Date(val.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return {
      "data-tooltip-id": "activity-heatmap-tooltip",
      "data-tooltip-content": `Watched ${val.count} episodes on ${fDate}`,
    } as Record<string, string>;
  };

  const formattedJoinedDate = userCreatedDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-6 w-full my-10">
      <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
        {/* Left / Main Section: Heatmap & Activity List */}
        <div className="flex-1 w-full bg-[#0f172a]/60 p-6 rounded-2xl border border-slate-800 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Tv className="h-5 w-5 text-[#e9376b]" />
                Watched {totalEpisodesCount} episodes in {selectedYear}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Click any cell on the contribution graph to filter activity for that specific day.
              </p>
            </div>

            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-xs font-semibold text-gray-300 rounded-lg hover:bg-slate-700 transition"
              >
                Showing {new Date(selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                <X className="h-3.5 w-3.5 text-red-400" />
              </button>
            )}
          </div>

          {/* Calendar Heatmap */}
          {isLoading ? (
            <div className="h-28 w-full animate-pulse bg-slate-800/80 rounded-xl mb-8"></div>
          ) : (
            <div className="mb-8 overflow-x-auto pb-2">
              <CalendarHeatmap
                weekdayLabels={["", "M", "", "W", "", "F", ""]}
                showWeekdayLabels={true}
                showOutOfRangeDays={true}
                startDate={startDate}
                endDate={endDate}
                values={heatmapData}
                classForValue={(value) => getClassForValue(value as unknown as HeatmapValue)}
                gutterSize={2}
                onClick={(val) => {
                  const value = val as unknown as HeatmapValue;
                  if (value?.date) {
                    setSelectedDate((prev) => (prev === value.date ? null : value.date));
                  }
                }}
                tooltipDataAttrs={(val) => getTooltipContent(val as unknown as HeatmapValue)}
              />
              <Tooltip id="activity-heatmap-tooltip" />
            </div>
          )}

          {/* Activity Progression Feed Header */}
          <div className="border-t border-slate-800 pt-6">
            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#e9376b]" />
              {selectedDate
                ? `Activity on ${new Date(selectedDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                : `${selectedYear} Activity Activity Timeline`}
            </h4>

            {/* Activity List */}
            {isLoading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-800/60 animate-pulse rounded-xl"></div>
                ))}
              </div>
            ) : filteredActivities.length > 0 ? (
              <div className="flex flex-col gap-3">
                {filteredActivities.slice(0, 15).map((act) => {
                  const dateObj = new Date(act.created);
                  const timeFormatted = dateObj.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });
                  const dateFormatted = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <div
                      key={act.id}
                      className="flex items-center justify-between bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 hover:border-slate-700 transition group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {act.thumbnail ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={act.thumbnail}
                            alt={act.animeTitle}
                            className="h-11 w-11 object-cover rounded-lg shrink-0 border border-slate-800"
                          />
                        ) : (
                          <div className="h-11 w-11 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                            <Tv className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-white truncate group-hover:text-[#e9376b] transition">
                            Watched Episode {act.episodeNumber} of {act.animeTitle}
                          </span>
                          <span className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 text-slate-500" />
                            {dateFormatted} at {timeFormatted}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/anime/watch?anime=${act.animeId}&ep=${act.episodeNumber}`}
                        className="flex items-center gap-1 text-xs font-bold text-gray-400 group-hover:text-[#e9376b] transition shrink-0 pl-3"
                      >
                        Watch <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-gray-500 bg-slate-900/40 rounded-xl border border-slate-800">
                No activity recorded for this period.
              </div>
            )}
          </div>
        </div>

        {/* Right Section: GitHub-style Vertical Year Tabs & Joined Milestone */}
        <div className="flex flex-col gap-4 w-full lg:w-64 shrink-0">
          <div className="flex flex-col bg-[#0f172a]/60 p-3 rounded-2xl border border-slate-800 shadow-md">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 py-2">
              Select Year
            </span>
            <div className="flex flex-col gap-1 mt-1">
              {availableYears.map((year) => {
                const isSelected = selectedYear === year;
                return (
                  <button
                    key={year}
                    onClick={() => {
                      setSelectedYear(year);
                      setSelectedDate(null);
                    }}
                    className={`flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      isSelected
                        ? "bg-[#e9376b] text-white shadow-md"
                        : "text-gray-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <span>{year}</span>
                    {isSelected && <Sparkles className="h-3.5 w-3.5 fill-current" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* First Joined Milestone Card */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-purple-950/40 to-slate-900/60 p-4 rounded-2xl border border-purple-900/40 shadow-sm">
            <div className="h-10 w-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                Joined Kitsune
              </span>
              <span className="text-xs text-gray-300 font-semibold mt-0.5">
                First joined in {formattedJoinedDate}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityProgression;
