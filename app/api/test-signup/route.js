import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json({
      status: "ok",
      message: "Endpoint de teste funcionando",
      environment: process.env.NODE_ENV || "unknown",
      timestamp: new Date().toISOString(),
      vercel: !!process.env.VERCEL,
      database: !!process.env.DATABASE_URL,
      smtp: !!process.env.SMTP_USER,
    });
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    
    return NextResponse.json({
      status: "ok",
      message: "Teste de POST funcionando",
      receivedBody: body,
      environment: process.env.NODE_ENV || "unknown",
      timestamp: new Date().toISOString(),
      vercel: !!process.env.VERCEL,
      database: !!process.env.DATABASE_URL,
      smtp: !!process.env.SMTP_USER,
    });
  } catch (error) {
    return NextResponse.json({
      status: "error", 
      message: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
