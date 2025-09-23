import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

    if (response.ok) {
      return NextResponse.json({ status: "Up", latency });
    } else {
      return NextResponse.json({
        status: "Down",
        latency,
        statusCode: response.status,
      });
    }
  } catch (error) {
    return NextResponse.json({ status: "Down", latency: null });
  }
}