import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Dyad-Uptime-Checker/1.0",
      },
    });
    const endTime = Date.now();
    const latency = endTime - startTime;

    // Mengambil informasi lokasi dari header Vercel
    const city = request.headers.get('x-vercel-ip-city') || '';
    const region = request.headers.get('x-vercel-ip-region') || '';
    const country = request.headers.get('x-vercel-ip-country') || '';
    let monitoringLocation = [city, region, country].filter(Boolean).join(", ");
    if (!monitoringLocation) {
      monitoringLocation = "Unknown Location";
    }

    if (response.ok) {
      return NextResponse.json({ status: "Up", latency, monitoringLocation });
    } else {
      return NextResponse.json({
        status: "Down",
        latency,
        statusCode: response.status,
        monitoringLocation,
      });
    }
  } catch (error) {
    // Mengambil informasi lokasi dari header Vercel juga untuk error
    const city = request.headers.get('x-vercel-ip-city') || '';
    const region = request.headers.get('x-vercel-ip-region') || '';
    const country = request.headers.get('x-vercel-ip-country') || '';
    let monitoringLocation = [city, region, country].filter(Boolean).join(", ");
    if (!monitoringLocation) {
      monitoringLocation = "Unknown Location";
    }
    return NextResponse.json({ status: "Down", latency: null, monitoringLocation });
  }
}