import { SkeletonPageHead, SkeletonTable } from "@/components/Skeleton";

/** Admin bo'limi: sahifa almashishda darhol skeleton ko'rinadi */
export default function AdminLoading() {
  return (
    <>
      <SkeletonPageHead />
      <SkeletonTable rows={6} cols={4} />
    </>
  );
}
