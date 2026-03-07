"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
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

interface UserProfile {
  id: string;
  userId: string;
  gender: string | null;
  height: number | null;
  weight: number | null;
  activityLevel: string;
  targetCalories: number | null;
  targetProtein: number | null;
  targetCarbs: number | null;
  targetFat: number | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image?: string | null;
  };
}

export default function ProfilePage() {
  const userId = "demo-user";

  const { data, isLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async (): Promise<{ profile: UserProfile } | null> => {
      const result = await api.api.profile({ userId }).get();
      if (result.error) return null;
      return result.data as { profile: UserProfile };
    },
  });

  const profile = data?.profile;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
          <p className="text-muted-foreground">
            Manage your personal information and nutrition targets
          </p>
        </div>
        <Button>
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
            <Button className="mt-4">
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
    </div>
  );
}
