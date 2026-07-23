import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/lib/db";
import { getSeriesBySlug } from "@/lib/series";

export async function GET(request: NextRequest) {
  const seriesSlug = new URL(request.url).searchParams.get("series");
  const series = seriesSlug ? getSeriesBySlug(seriesSlug)?.name : undefined;
  return NextResponse.json(getStats(series));
}
