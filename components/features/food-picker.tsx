"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock3, Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  api,
  type Food,
  type FoodsResponse,
  type RecentFoodsResponse,
} from "@/lib/api";

interface FoodPickerProps {
  open: boolean;
  onSelect: (food: Food) => void;
  emptyLabel?: string;
}

type FoodPickerTab = "recent" | "favorites" | "search";

export function FoodPicker({
  open,
  onSelect,
  emptyLabel = "Search for foods above",
}: FoodPickerProps) {
  const [tab, setTab] = useState<FoodPickerTab>("recent");
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

  const { data: recentFoods, isLoading: recentLoading } = useQuery({
    queryKey: ["foods", "recent", 14],
    queryFn: async () => {
      const result = await api.api.foods.recent.get({
        query: { days: 14, limit: 8 },
      });
      if (result.error) throw new Error("Failed to load recent foods");
      return result.data as RecentFoodsResponse;
    },
    enabled: open,
  });

  const { data: favoriteFoods, isLoading: favoritesLoading } = useQuery({
    queryKey: ["foods", "favorites"],
    queryFn: async () => {
      const result = await api.api.foods.get({
        query: {
          favoritesOnly: true,
          sort: "recent",
          limit: 12,
        },
      });
      if (result.error) throw new Error("Failed to load favorites");
      return result.data as FoodsResponse;
    },
    enabled: open,
  });

  const { data: searchFoods, isLoading: searchLoading } = useQuery({
    queryKey: ["foods", "picker-search", submittedSearch],
    queryFn: async () => {
      const result = await api.api.foods.get({
        query: {
          search: submittedSearch || undefined,
          sort: submittedSearch ? "name" : "recent",
          limit: 12,
        },
      });
      if (result.error) throw new Error("Failed to search foods");
      return result.data as FoodsResponse;
    },
    enabled: open && (tab === "search" || submittedSearch.length > 0),
  });

  const activeFoods = useMemo(() => {
    if (tab === "favorites") {
      return favoriteFoods?.foods ?? [];
    }

    if (tab === "search") {
      return searchFoods?.foods ?? [];
    }

    return recentFoods?.foods ?? [];
  }, [favoriteFoods?.foods, recentFoods?.foods, searchFoods?.foods, tab]);

  const isLoading =
    (tab === "favorites" && favoritesLoading) ||
    (tab === "search" && searchLoading) ||
    (tab === "recent" && recentLoading);

  return (
    <div className="space-y-4">
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as FoodPickerTab)}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recent">
            <Clock3 className="mr-2 h-4 w-4" />
            Recent
          </TabsTrigger>
          <TabsTrigger value="favorites">
            <Star className="mr-2 h-4 w-4" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="mr-2 h-4 w-4" />
            Search
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setTab("search");
          setSubmittedSearch(search.trim());
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search foods..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="max-h-72 space-y-2 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : activeFoods.length ? (
          activeFoods.map((food) => (
            <button
              key={food.id}
              type="button"
              className="w-full rounded-xl border p-3 text-left transition-colors hover:bg-accent"
              onClick={() => onSelect(food)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{food.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {food.brand ? `${food.brand} · ` : ""}
                    {food.servingSize}
                    {food.servingUnit} · {food.calories} kcal · P:{" "}
                    {food.protein}g
                  </p>
                </div>
                {food.isFavorite ? (
                  <Star className="mt-0.5 h-4 w-4 fill-current text-amber-500" />
                ) : null}
              </div>
              {food.lastUsedAt || food.usageCount ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {food.lastUsedAt
                    ? `Last used ${new Date(food.lastUsedAt).toLocaleDateString()}`
                    : "Not logged yet"}
                  {food.usageCount ? ` · ${food.usageCount} uses` : ""}
                </p>
              ) : null}
            </button>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {tab === "favorites"
              ? "No favorite foods yet"
              : tab === "recent"
                ? "No recent foods yet"
                : submittedSearch
                  ? `No results for "${submittedSearch}"`
                  : emptyLabel}
          </p>
        )}
      </div>
    </div>
  );
}
