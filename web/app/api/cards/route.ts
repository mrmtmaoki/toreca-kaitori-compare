import { NextRequest, NextResponse } from "next/server";
import { searchCards, topCards, type SortMode } from "@/lib/db";
import { getSeriesBySlug } from "@/lib/series";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const sort = (searchParams.get("sort") as SortMode | null) ?? "shops_desc";
  const seriesSlug = searchParams.get("series");
  const series = seriesSlug ? getSeriesBySlug(seriesSlug)?.name : undefined;
  const set = searchParams.get("set")?.trim() || undefined;
  const color = searchParams.get("color")?.trim() || undefined;
  const pokemonType = searchParams.get("type")?.trim() || undefined;

  const cards = q
    ? searchCards(q, series, 60, set, color, pokemonType)
    : topCards(sort, 30, series, set, color, pokemonType);
  return NextResponse.json({ cards });
}
