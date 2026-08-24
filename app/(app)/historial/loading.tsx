import { Skeleton, SkeletonHeader, SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <SkeletonHeader />
      <Skeleton className="mb-5 h-10 w-56 rounded-full" />
      <SkeletonList rows={8} />
    </div>
  );
}
