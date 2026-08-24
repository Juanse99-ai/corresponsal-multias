import { SkeletonHeader, SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <SkeletonHeader />
      <SkeletonList rows={8} />
    </div>
  );
}
