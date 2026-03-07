"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Food } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Apple, Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  FoodFormDialog,
  type FoodFormValues,
} from "@/components/features/food-form-dialog";
import { DeleteFoodDialog } from "@/components/features/delete-food-dialog";

export default function FoodsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["foods", debouncedSearch],
    queryFn: async () => {
      const result = await api.api.foods.get({
        query: { search: debouncedSearch || undefined, limit: 20 },
      });
      if (result.error) throw new Error("Failed to fetch foods");
      return result.data;
    },
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["foods"] });
      toast.success("Food deleted successfully");
      setIsDeleteOpen(false);
      setSelectedFood(null);
    },
    onError: () => {
      toast.error("Failed to delete food");
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(search);
  };

  const handleAddClick = () => {
    setSelectedFood(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (food: Food) => {
    setSelectedFood(food);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (food: Food) => {
    setSelectedFood(food);
    setIsDeleteOpen(true);
  };

  const handleFormSubmit = async (values: FoodFormValues) => {
    if (selectedFood) {
      await updateMutation.mutateAsync({ id: selectedFood.id, values });
    } else {
      await createMutation.mutateAsync(values);
    }
  };

  const handleDeleteConfirm = async () => {
    if (selectedFood) {
      await deleteMutation.mutateAsync(selectedFood.id);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Food Database</h2>
          <p className="text-muted-foreground">
            Search and manage your food database
          </p>
        </div>
        <Button onClick={handleAddClick}>
          <Plus className="mr-2 h-4 w-4" />
          Add Food
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search foods by name or brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !data?.foods?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Apple className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No foods found</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {debouncedSearch
                ? `No results for "${debouncedSearch}"`
                : "Add foods to your database to get started"}
            </p>
            <Button className="mt-4" onClick={handleAddClick}>
              <Plus className="mr-2 h-4 w-4" />
              Add Food
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.foods.map((food) => (
            <Card key={food.id} className="group relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <CardTitle className="text-lg">{food.name}</CardTitle>
                    {food.brand && (
                      <CardDescription>{food.brand}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEditClick(food)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(food)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Serving:</span>{" "}
                    {food.servingSize}
                    {food.servingUnit}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Calories:</span>{" "}
                    {food.calories}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Protein:</span>{" "}
                    {food.protein}g
                  </div>
                  <div>
                    <span className="text-muted-foreground">Carbs:</span>{" "}
                    {food.carbs}g
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fat:</span>{" "}
                    {food.fat}g
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FoodFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        food={selectedFood}
        isSubmitting={isSubmitting}
      />

      <DeleteFoodDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDeleteConfirm}
        food={selectedFood}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
