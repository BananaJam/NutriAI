"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Circle, Edit, User } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { api, normalizeProfileResponse, type UserProfile } from "@/lib/api";
import { useSessionUser } from "@/lib/use-session-user";

export default function ProfilePage() {
  const { userId } = useSessionUser();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<{ profile: UserProfile } | null> => {
      const result = await api.api.profile.get();
      if (result.error || !("profile" in result.data)) return null;
      const payload = normalizeProfileResponse(result.data);
      return payload.profile ? { profile: payload.profile } : null;
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

      {profile && (() => {
        const fields = [
          { label: "Gender", filled: !!profile.gender, required: false },
          { label: "Date of birth", filled: !!profile.dateOfBirth, required: false },
          { label: "Height", filled: !!profile.height, required: false },
          { label: "Weight", filled: !!profile.weight, required: false },
          { label: "Activity level", filled: !!profile.activityLevel, required: false },
          { label: "Calorie target", filled: !!profile.targetCalories, required: true },
          { label: "Protein target", filled: !!profile.targetProtein, required: true },
          { label: "Carbs target", filled: !!profile.targetCarbs, required: false },
          { label: "Fat target", filled: !!profile.targetFat, required: false },
        ];
        const filled = fields.filter((f) => f.filled).length;
        const pct = Math.round((filled / fields.length) * 100);
        return (
          <Card className="app-surface">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Profile completeness</CardTitle>
                  <CardDescription>
                    Fields marked <span className="font-medium text-foreground">Required</span> affect calorie tracking and adherence reporting.
                  </CardDescription>
                </div>
                <span className="text-2xl font-semibold">{pct}%</span>
              </div>
              <Progress value={pct} className="mt-2" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {fields.map((field) => (
                  <div key={field.label} className="flex items-center gap-2 text-sm">
                    {field.filled ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className={field.filled ? "text-foreground" : "text-muted-foreground"}>
                      {field.label}
                      {field.required && !field.filled && (
                        <span className="ml-1 text-xs text-destructive">Required</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              {pct < 100 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 rounded-xl"
                  onClick={() => setIsFormOpen(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Fill missing fields
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })()}

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
