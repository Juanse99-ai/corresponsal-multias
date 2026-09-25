import { SkeletonHeader, SkeletonCard, SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <SkeletonHeader />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <SkeletonList rows={6} />
        <SkeletonCard />
      </div>
    </div>
  );
}
