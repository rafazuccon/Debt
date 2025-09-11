import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Teste básico sem banco de dados
    return NextResponse.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development"
    });
  } catch (error) {
    return NextResponse.json({ 
      status: "error", 
      error: error.message 
    }, { status: 500 });
  }
}
