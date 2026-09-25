import { SkeletonHeader, SkeletonCard, SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <SkeletonHeader />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="flex flex-col gap-5">
          <SkeletonCard />
          <SkeletonList rows={3} />
        </div>
        <SkeletonCard />
      </div>
    </div>
  );
}
