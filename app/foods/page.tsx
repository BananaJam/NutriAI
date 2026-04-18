"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Apple,
  ArrowUpDown,
  CalendarPlus2,
  Filter,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AddFoodToPlanDialog,
  type AddFoodToPlanValues,
} from "@/components/features/add-food-to-plan-dialog";
import { DeleteFoodDialog } from "@/components/features/delete-food-dialog";
import {
  FoodFormDialog,
  type FoodFormValues,
} from "@/components/features/food-form-dialog";
import {
  LogFoodEntryDialog,
  type LogFoodEntryValues,
} from "@/components/features/log-food-entry-dialog";
import { PageHeader } from "@/components/features/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  api,
  type Food,
  type FoodCatalogDirection,
  type FoodCatalogSort,
  type FoodsResponse,
} from "@/lib/api";

const sortOptions: Array<{
  value: FoodCatalogSort;
  label: string;
}> = [
  { value: "recent", label: "Most recent" },
  { value: "name", label: "Name" },
  { value: "protein", label: "Protein" },
  { value: "calories", label: "Calories" },
];

const directionLabels: Record<FoodCatalogDirection, string> = {
  asc: "Ascending",
  desc: "Descending",
};

const quickFilters = [
  { id: "protein", label: "High protein", minProtein: 20 },
  { id: "calories", label: "Lower calorie", maxCalories: 250 },
];

export default function FoodsPage() {
  const queryClient = useQueryClient();
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState<string | null>(null);
  const [minProtein, setMinProtein] = useState<number | null>(null);
  const [maxCalories, setMaxCalories] = useState<number | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState<FoodCatalogSort>("recent");
  const [direction, setDirection] = useState<FoodCatalogDirection>("desc");
  const [pageSize, setPageSize] = useState(12);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: [
      "foods",
      search,
      brand,
      minProtein,
      maxCalories,
      favoritesOnly,
      sort,
      direction,
      pageSize,
    ],
    queryFn: async () => {
      const result = await api.api.foods.get({
        query: {
          search: search || undefined,
          brand: brand ?? undefined,
          minProtein: minProtein ?? undefined,
          maxCalories: maxCalories ?? undefined,
          favoritesOnly,
          sort,
          direction,
          limit: pageSize,
          offset: 0,
        },
      });
      if (result.error) throw new Error("Failed to fetch foods");
      return result.data as FoodsResponse;
    },
  });

  const foods = data?.foods ?? [];

  const comparisonFoods = useMemo(
    () => foods.filter((food) => selectedCompareIds.includes(food.id)),
    [foods, selectedCompareIds],
  );

  const createMutation = useMutation({
    mutationFn: async (values: FoodFormValues) => {
      const result = await api.api.foods.post({
        name: values.name,
        brand: values.brand || undefined,
        servingSize: values.servingSize,
        servingUnit: values.servingUnit || "g",
        calories: values.calories,
        protein: values.protein,
        carbs: values.carbs,
        fat: values.fat,
        fiber: values.fiber ?? undefined,
        sugar: values.sugar ?? undefined,
        sodium: values.sodium ?? undefined,
        barcode: values.barcode || undefined,
      });
      if (result.error) throw new Error("Failed to create food");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      queryClient.invalidateQueries({ queryKey: ["foods", "recent"] });
      toast.success("Food added successfully");
      setIsFormOpen(false);
      setSelectedFood(null);
    },
    onError: () => {
      toast.error("Failed to add food");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: FoodFormValues;
    }) => {
      const result = await api.api.foods({ id }).put({
        name: values.name,
        brand: values.brand || undefined,
        servingSize: values.servingSize,
        servingUnit: values.servingUnit || "g",
        calories: values.calories,
        protein: values.protein,
        carbs: values.carbs,
        fat: values.fat,
        fiber: values.fiber ?? undefined,
        sugar: values.sugar ?? undefined,
        sodium: values.sodium ?? undefined,
        barcode: values.barcode || undefined,
      });
      if (result.error) throw new Error("Failed to update food");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      queryClient.invalidateQueries({ queryKey: ["foods", "recent"] });
      toast.success("Food updated successfully");
      setIsFormOpen(false);
      setSelectedFood(null);
    },
    onError: () => {
      toast.error("Failed to update food");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await api.api.foods({ id }).delete();
      if (result.error) throw new Error("Failed to delete food");
      return result.data;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      toast.success("Food deleted successfully");
      setIsDeleteOpen(false);
      setSelectedFood(null);
      setSelectedCompareIds((current) =>
        current.filter((itemId) => itemId !== id),
      );
    },
    onError: () => {
      toast.error("Failed to delete food");
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async ({
      foodId,
      isFavorite,
    }: {
      foodId: string;
      isFavorite: boolean;
    }) => {
      const result = isFavorite
        ? await api.api.foods({ id: foodId }).favorite.delete()
        : await api.api.foods({ id: foodId }).favorite.post({});
      if (result.error) throw new Error("Failed to update favorite");
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      queryClient.invalidateQueries({ queryKey: ["foods", "recent"] });
      toast.success(
        variables.isFavorite ? "Removed from favorites" : "Added to favorites",
      );
    },
    onError: () => {
      toast.error("Failed to update favorite");
    },
  });

  const logFoodMutation = useMutation({
    mutationFn: async ({
      foodId,
      values,
    }: {
      foodId: string;
      values: LogFoodEntryValues;
    }) => {
      const result = await api.api["food-logs"]({
        date: values.date,
      }).items.post({
        foodId,
        mealType: values.mealType,
        servings: values.servings,
        notes: values.notes || undefined,
      });
      if (result.error) throw new Error("Failed to log food");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foodLog"] });
      queryClient.invalidateQueries({ queryKey: ["foodLogs", "recent"] });
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      queryClient.invalidateQueries({ queryKey: ["foods", "recent"] });
      toast.success("Food added to log");
      setIsLogDialogOpen(false);
      setSelectedFood(null);
    },
    onError: () => {
      toast.error("Failed to add food to log");
    },
  });

  const addToPlanMutation = useMutation({
    mutationFn: async ({
      foodId,
      values,
    }: {
      foodId: string;
      values: AddFoodToPlanValues;
    }) => {
      const result = await api.api["meal-plans"]({
        id: values.mealPlanId,
      }).items.post({
        foodId,
        dayOfWeek: values.dayOfWeek,
        mealType: values.mealType,
        servings: values.servings,
        notes: values.notes || undefined,
      });
      if (result.error) throw new Error("Failed to add to meal plan");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlans"] });
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      toast.success("Food added to meal plan");
      setIsPlanDialogOpen(false);
      setSelectedFood(null);
    },
    onError: () => {
      toast.error("Failed to add food to meal plan");
    },
  });

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setSearch(searchDraft.trim());
    setPageSize(12);
    setSort(searchDraft.trim() ? "name" : "recent");
    setDirection(searchDraft.trim() ? "asc" : "desc");
  };

  const clearFilters = () => {
    setSearchDraft("");
    setSearch("");
    setBrand(null);
    setMinProtein(null);
    setMaxCalories(null);
    setFavoritesOnly(false);
    setSort("recent");
    setDirection("desc");
    setPageSize(12);
  };

  const toggleCompare = (foodId: string) => {
    setSelectedCompareIds((current) => {
      if (current.includes(foodId)) {
        return current.filter((id) => id !== foodId);
      }

      if (current.length >= 3) {
        toast.error("You can compare up to 3 foods");
        return current;
      }

      return [...current, foodId];
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catalog"
        title="Food database"
        description="Browse, compare, and reuse foods across your log, plans, and assistant workflows."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/assistant?prompt=Suggest+high-protein+foods+I+should+add+to+my+library">
              <Button variant="outline" className="rounded-xl">
                Ask for suggestions
              </Button>
            </Link>
            <Button
              onClick={() => {
                setSelectedFood(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add food
            </Button>
          </div>
        }
      />

      <Card className="app-surface">
        <CardHeader>
          <CardTitle>Browse saved foods</CardTitle>
          <CardDescription>
            Search your catalog, pin favorites, and use quick filters to narrow
            decisions fast.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 lg:flex-row"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or brand"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:flex">
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as FoodCatalogSort)
                }
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={direction}
                onChange={(event) =>
                  setDirection(event.target.value as FoodCatalogDirection)
                }
              >
                {Object.entries(directionLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <Button type="submit">Search</Button>
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </form>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              <Filter className="mr-2 h-3.5 w-3.5" />
              Quick filters
            </Badge>
            {quickFilters.map((filter) => {
              const isActive =
                (filter.minProtein && minProtein === filter.minProtein) ||
                (filter.maxCalories && maxCalories === filter.maxCalories);

              return (
                <Button
                  key={filter.id}
                  type="button"
                  variant={isActive ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => {
                    setMinProtein(filter.minProtein ?? null);
                    setMaxCalories(filter.maxCalories ?? null);
                    setPageSize(12);
                  }}
                >
                  {filter.label}
                </Button>
              );
            })}
            <Button
              type="button"
              variant={favoritesOnly ? "default" : "outline"}
              className="rounded-full"
              onClick={() => {
                setFavoritesOnly((current) => !current);
                setPageSize(12);
              }}
            >
              <Star className="mr-2 h-4 w-4" />
              Favorites
            </Button>
            {(data?.facets.brands ?? []).map((facetBrand) => (
              <Button
                key={facetBrand}
                type="button"
                variant={brand === facetBrand ? "default" : "outline"}
                className="rounded-full"
                onClick={() => {
                  setBrand((current) =>
                    current === facetBrand ? null : facetBrand,
                  );
                  setPageSize(12);
                }}
              >
                {facetBrand}
              </Button>
            ))}
          </div>

          {comparisonFoods.length ? (
            <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Comparison tray</p>
                  <p className="text-sm text-muted-foreground">
                    Compare up to three foods using their saved serving sizes.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCompareIds([])}
                >
                  Clear comparison
                </Button>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {comparisonFoods.map((food) => (
                  <Card key={food.id} className="border-primary/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{food.name}</CardTitle>
                      <CardDescription>
                        {food.brand ? `${food.brand} · ` : ""}
                        {food.servingSize}
                        {food.servingUnit}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Calories</span>
                        <span>{food.calories}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Protein</span>
                        <span>{food.protein} g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Carbs</span>
                        <span>{food.carbs} g</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fat</span>
                        <span>{food.fat} g</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-28 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !foods.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-14">
            <Apple className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">
              {search || brand || minProtein || maxCalories || favoritesOnly
                ? "No foods match these filters"
                : "No foods saved yet"}
            </h3>
            <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
              {search || brand || minProtein || maxCalories || favoritesOnly
                ? "Try clearing filters, switching the sort, or using the high protein and favorites chips."
                : "Start your catalog with the foods you log most often so they are ready for plans and assistant suggestions."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  setSelectedFood(null);
                  setIsFormOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add food
              </Button>
              {search || brand || minProtein || maxCalories || favoritesOnly ? (
                <Button variant="outline" onClick={clearFilters}>
                  Reset filters
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Showing {foods.length} of {data?.total ?? foods.length} foods
            </p>
            <p className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Sorted by{" "}
              {sortOptions
                .find((option) => option.value === sort)
                ?.label.toLowerCase()}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {foods.map((food) => {
              const isCompared = selectedCompareIds.includes(food.id);

              return (
                <Card key={food.id} className="app-surface">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{food.name}</CardTitle>
                        <CardDescription>
                          {food.brand ? `${food.brand} · ` : ""}
                          {food.servingSize}
                          {food.servingUnit}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={food.isFavorite ? "text-amber-500" : ""}
                        onClick={() =>
                          favoriteMutation.mutate({
                            foodId: food.id,
                            isFavorite: Boolean(food.isFavorite),
                          })
                        }
                        disabled={favoriteMutation.isPending}
                      >
                        <Star
                          className={`h-4 w-4 ${food.isFavorite ? "fill-current" : ""}`}
                        />
                        <span className="sr-only">Toggle favorite</span>
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{food.calories} kcal</Badge>
                      <Badge variant="outline">P {food.protein}g</Badge>
                      <Badge variant="outline">C {food.carbs}g</Badge>
                      <Badge variant="outline">F {food.fat}g</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/30 p-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Usage</p>
                        <p className="font-medium">
                          {food.usageCount ?? 0} logs
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last used</p>
                        <p className="font-medium">
                          {food.lastUsedAt
                            ? new Date(food.lastUsedAt).toLocaleDateString()
                            : "Not yet"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedFood(food);
                          setIsLogDialogOpen(true);
                        }}
                      >
                        <CalendarPlus2 className="mr-2 h-4 w-4" />
                        Add to log
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedFood(food);
                          setIsPlanDialogOpen(true);
                        }}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        Add to plan
                      </Button>
                      <Button
                        variant={isCompared ? "default" : "outline"}
                        onClick={() => toggleCompare(food.id)}
                      >
                        Compare
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedFood(food);
                          setIsFormOpen(true);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      className="w-full justify-center text-destructive hover:text-destructive"
                      onClick={() => {
                        setSelectedFood(food);
                        setIsDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete food
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {data?.hasMore ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setPageSize((current) => current + 12)}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </>
      )}

      <FoodFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={async (values) => {
          if (selectedFood) {
            await updateMutation.mutateAsync({ id: selectedFood.id, values });
            return;
          }

          await createMutation.mutateAsync(values);
        }}
        food={selectedFood}
        isSubmitting={isSubmitting}
      />

      <DeleteFoodDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={async () => {
          if (!selectedFood) return;
          await deleteMutation.mutateAsync(selectedFood.id);
        }}
        food={selectedFood}
        isDeleting={deleteMutation.isPending}
      />

      <LogFoodEntryDialog
        open={isLogDialogOpen}
        onOpenChange={setIsLogDialogOpen}
        food={selectedFood}
        onSubmit={async (values) => {
          if (!selectedFood) return;
          await logFoodMutation.mutateAsync({
            foodId: selectedFood.id,
            values,
          });
        }}
        isSubmitting={logFoodMutation.isPending}
      />

      <AddFoodToPlanDialog
        open={isPlanDialogOpen}
        onOpenChange={setIsPlanDialogOpen}
        food={selectedFood}
        onSubmit={async (values) => {
          if (!selectedFood) return;
          await addToPlanMutation.mutateAsync({
            foodId: selectedFood.id,
            values,
          });
        }}
        isSubmitting={addToPlanMutation.isPending}
      />
    </div>
  );
}
