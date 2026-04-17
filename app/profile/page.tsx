"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/features/page-header";
import {
  ProfileFormDialog,
  type ProfileFormValues,
} from "@/components/features/profile-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, type UserProfile } from "@/lib/api";
import { useSessionUser } from "@/lib/use-session-user";

export default function ProfilePage() {
  const { userId } = useSessionUser();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<{ profile: UserProfile } | null> => {
      const result = await api.api.profile.get();
      if (result.error) return null;
      return result.data as { profile: UserProfile };
    },
    enabled: !!userId,
  });

  const profile = data?.profile;

  const updateMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      const result = await api.api.profile.put({
        gender: values.gender,
        dateOfBirth: values.dateOfBirth || undefined,
        height: values.height,
        weight: values.weight,
        activityLevel: values.activityLevel,
        targetCalories: values.targetCalories,
        targetProtein: values.targetProtein,
        targetCarbs: values.targetCarbs,
        targetFat: values.targetFat,
      });

      if (result.error) throw new Error("Failed to update profile");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Profile updated successfully");
      setIsFormOpen(false);
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });

  const handleFormSubmit = async (values: ProfileFormValues) => {
    await updateMutation.mutateAsync(values);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Personalization"
        title="Profile"
        description="Keep your body metrics and target intake current so the rest of the app stays useful."
        actions={
          <Button onClick={() => setIsFormOpen(true)} className="rounded-xl">
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="app-surface">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card className="app-surface">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : !profile ? (
        <Card className="app-surface">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/8 text-primary">
              <User className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">
              Profile not set up
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Add a few core details so calorie targets, progress views, and
              nutrition guidance reflect you.
            </p>
            <Button
              className="mt-5 rounded-xl"
              onClick={() => setIsFormOpen(true)}
            >
              <Edit className="mr-2 h-4 w-4" />
              Set Up Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="app-surface">
            <CardHeader>
              <CardTitle>Personal information</CardTitle>
              <CardDescription>Your account and body metrics</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{profile.user?.name || "Not set"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{profile.user?.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium capitalize">
                  {profile.gender?.toLowerCase() || "Not set"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Activity level</p>
                <p className="font-medium capitalize">
                  {profile.activityLevel?.replace(/_/g, " ").toLowerCase()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Height</p>
                <p className="font-medium">
                  {profile.height ? `${profile.height} cm` : "Not set"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Weight</p>
                <p className="font-medium">
                  {profile.weight ? `${profile.weight} kg` : "Not set"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="app-surface">
            <CardHeader>
              <CardTitle>Nutrition targets</CardTitle>
              <CardDescription>
                Daily numbers used across the app
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Calories</p>
                <p className="font-medium">
                  {profile.targetCalories
                    ? `${profile.targetCalories} kcal`
                    : "Not set"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Protein</p>
                <p className="font-medium">
                  {profile.targetProtein
                    ? `${profile.targetProtein}g`
                    : "Not set"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Carbs</p>
                <p className="font-medium">
                  {profile.targetCarbs ? `${profile.targetCarbs}g` : "Not set"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Fat</p>
                <p className="font-medium">
                  {profile.targetFat ? `${profile.targetFat}g` : "Not set"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ProfileFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        profile={profile}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
