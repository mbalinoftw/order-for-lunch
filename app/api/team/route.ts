import { NextRequest, NextResponse } from "next/server"
import { getTeamMembers } from "@/lib/db"

export async function GET(_request: NextRequest) {
  const members = await getTeamMembers()
  return NextResponse.json(members)
}
