import { SkeletonPageHead, SkeletonStats, SkeletonCourses } from "@/components/Skeleton";

/** O'quvchi bo'limi: sahifa almashishda darhol skeleton ko'rinadi */
export default function UserLoading() {
  return (
    <>
      <SkeletonPageHead />
      <SkeletonStats />
      <SkeletonCourses />
    </>
  );
}
