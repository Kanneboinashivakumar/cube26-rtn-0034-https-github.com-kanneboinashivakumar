/**
 * GET /api/inspections/[record_id]
 *
 * Fetches a single inspection record by record_id, scoped to the org.
 * org_id is read from the query string: ?org_id=org_demo_alpha
 *
 * Response codes:
 *   200  — record found
 *   400  — missing org_id
 *   404  — record not found for this org
 *   500  — unexpected error
 */

import { NextRequest, NextResponse } from "next/server";
import { getInspection } from "@/lib/supabase/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ record_id: string }> }
) {
  const { record_id } = await params;
  const orgId = request.nextUrl.searchParams.get("org_id");

  if (!orgId) {
    return NextResponse.json(
      { error: "org_id query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const record = await getInspection(record_id, orgId);

    if (!record) {
      return NextResponse.json(
        { error: `Inspection ${record_id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ record }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[GET /api/inspections/:id]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
