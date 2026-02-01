import { NextResponse } from "next/server";
import { z } from "zod";
import { getTwilioClient } from "@/lib/twilio";
import { getEnv } from "@/lib/env";

const requestSchema = z.object({
  toNumber: z.string().min(1),
  script: z.string().min(1),
  voice: z.string().optional(),
  language: z.string().optional(),
  record: z.boolean().optional(),
});

const escapeForXml = (input: string) =>
  input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export async function POST(req: Request) {
  try {
    const payload = requestSchema.parse(await req.json());

    const twiml = `<Response>
  <Say language="${payload.language ?? "en-US"}" voice="${payload.voice ?? "Polly.Joanna"}">
    ${escapeForXml(payload.script)}
  </Say>
  <Pause length="2"/>
</Response>`;

    const client = getTwilioClient();
    const env = getEnv();
    const call = await client.calls.create({
      to: payload.toNumber,
      from: env.TWILIO_CALLER_ID,
      twiml,
      record: payload.record ?? false,
    });

    return NextResponse.json({
      callSid: call.sid,
      status: call.status,
      to: call.to,
      from: call.from,
    });
  } catch (error) {
    console.error("Call initiation error", error);
    const message =
      error instanceof z.ZodError
        ? "Invalid call request."
        : "Unable to start call. Verify Twilio credentials and destination number.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
