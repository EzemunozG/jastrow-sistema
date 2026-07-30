import { CardsSkeleton } from "@/components/ui/loading-skeletons";

export default function Loading() {
  return (
    <div className="space-y-5">
      <CardsSkeleton count={8} />
    </div>
  );
}
