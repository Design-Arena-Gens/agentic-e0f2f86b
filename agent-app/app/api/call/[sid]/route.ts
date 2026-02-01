import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTwilioClient } from "@/lib/twilio";

const paramsSchema = z.object({
  sid: z.string().min(1),
});

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ sid: string }> }
) {
  try {
    const { sid } = paramsSchema.parse(await context.params);
    const client = getTwilioClient();
    const call = await client.calls(sid).fetch();

    return NextResponse.json({
      status: call.status,
      direction: call.direction,
      duration: call.duration,
      startTime: call.startTime,
      endTime: call.endTime,
    });
  } catch (error) {
    console.error("Call status error", error);
    return NextResponse.json({ error: "Unable to retrieve call status." }, { status: 400 });
  }
}
