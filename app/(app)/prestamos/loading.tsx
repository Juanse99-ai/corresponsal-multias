import { SkeletonHeader, SkeletonCard, SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <SkeletonHeader />
      <div className="grid gap-5 lg:grid-cols-[1fr_400px] lg:items-start">
        <SkeletonList rows={4} />
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
