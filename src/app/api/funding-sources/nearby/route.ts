import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { FUNDING_RADIUS_KM, fetchNearbyPlaces, findNearbyVillageFunds } from "@/lib/fundingSourcesNearby";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: { formErrors: ["กรุณาเข้าสู่ระบบ"] } }, { status: 401 });
  if (!user.householdId) {
    return NextResponse.json({ error: { formErrors: ["บัญชีนี้ยังไม่ได้ผูกกับครัวเรือนเป้าหมายใดในระบบ"] } }, { status: 403 });
  }

  const household = await prisma.targetHousehold.findUnique({
    where: { id: user.householdId },
    select: { villageId: true, village: { select: { latitude: true, longitude: true, villageName: true } } },
  });
  if (!household) return NextResponse.json({ error: { formErrors: ["ไม่พบข้อมูลครัวเรือน"] } }, { status: 404 });

  const { latitude, longitude, villageName } = household.village;
  if (latitude == null || longitude == null) {
    return NextResponse.json({ hasCoordinates: false, villageName, radiusKm: FUNDING_RADIUS_KM, villageFunds: [], places: [], placesUnavailable: false });
  }

  const [villageFunds, placeResult] = await Promise.all([
    findNearbyVillageFunds(latitude, longitude, household.villageId),
    fetchNearbyPlaces(latitude, longitude),
  ]);

  return NextResponse.json({
    hasCoordinates: true,
    villageName,
    center: { latitude, longitude },
    radiusKm: FUNDING_RADIUS_KM,
    villageFunds,
    places: placeResult.places,
    placesUnavailable: placeResult.unavailable,
  });
}
