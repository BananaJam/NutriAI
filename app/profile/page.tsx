"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UserProfile } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Edit } from "lucide-react";
import { toast } from "sonner";
import { useSessionUser } from "@/lib/use-session-user";
import {
  ProfileFormDialog,
  type ProfileFormValues,
} from "@/components/features/profile-form-dialog";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
          <p className="text-muted-foreground">
            Manage your personal information and nutrition targets
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : !profile ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <User className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Profile not set up</h3>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Set up your profile to get personalized nutrition recommendations
            </p>
            <Button className="mt-4" onClick={() => setIsFormOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Set Up Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Your basic profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">
                    {profile.user?.name || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{profile.user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-medium capitalize">
                    {profile.gender?.toLowerCase() || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Activity Level</p>
                  <p className="font-medium capitalize">
                    {profile.activityLevel?.replace(/_/g, " ").toLowerCase()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Height</p>
                  <p className="font-medium">
                    {profile.height ? `${profile.height} cm` : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weight</p>
                  <p className="font-medium">
                    {profile.weight ? `${profile.weight} kg` : "Not set"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nutrition Targets</CardTitle>
              <CardDescription>Your daily nutrition goals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Calories</p>
                  <p className="font-medium">
                    {profile.targetCalories
                      ? `${profile.targetCalories} kcal`
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Protein</p>
                  <p className="font-medium">
                    {profile.targetProtein
                      ? `${profile.targetProtein}g`
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Carbs</p>
                  <p className="font-medium">
                    {profile.targetCarbs ? `${profile.targetCarbs}g` : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fat</p>
                  <p className="font-medium">
                    {profile.targetFat ? `${profile.targetFat}g` : "Not set"}
                  </p>
                </div>
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
