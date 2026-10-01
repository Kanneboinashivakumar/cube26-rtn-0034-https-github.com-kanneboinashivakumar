"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function InspectionRedirect() {
  const params = useParams();
  const router = useRouter();
  const recordId = params?.record_id as string;

  useEffect(() => {
    if (recordId) {
      router.replace(`/results/${recordId}/evidence`);
    }
  }, [recordId, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-xs text-slate-500">
      Redirecting to Evidence & Audit Record…
    </div>
  );
}
