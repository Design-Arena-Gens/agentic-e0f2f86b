import { NextResponse } from "next/server";
import { z } from "zod";
import { getOpenAI } from "@/lib/openai";

const requestSchema = z.object({
  customerName: z.string().min(1),
  goal: z.string().min(1),
  product: z.string().min(1),
  tone: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const payload = requestSchema.parse(await req.json());

    const prompt = `
You are a professional outbound calling agent. Create a concise call script following this structure:
1. Friendly greeting by the agent mentioning the customer name (${payload.customerName}).
2. One-sentence purpose statement describing the goal (${payload.goal}) and product (${payload.product}).
3. Two personalized talking points or benefits.
4. A closing call-to-action asking for the next step.

Tone: ${payload.tone ?? "Professional and upbeat"}.
Additional notes: ${payload.notes ?? "None"}.

Return the script as plain text with each agent line prefixed by "Agent:" and customer responses prefixed by "Customer:" where natural.
    `.trim();

    const openai = getOpenAI();
    const completion = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content:
            "You craft succinct, natural sounding call scripts. Keep responses under 200 words.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const script =
      completion.output_text?.trim() ??
      completion.output
        ?.map((item) => {
          if (!("content" in item) || !Array.isArray(item.content)) return "";
          return item.content
            .map((chunk) => (typeof chunk === "object" && chunk !== null && "text" in chunk ? (chunk as { text?: string }).text ?? "" : ""))
            .join("");
        })
        .join("")
        .trim() ??
      "";

    if (!script) {
      throw new Error("Empty script returned from language model.");
    }

    return NextResponse.json({ script });
  } catch (error) {
    console.error("Script generation error", error);
    const message =
      error instanceof z.ZodError
        ? "Invalid script configuration."
        : "Unable to generate script. Check API key and try again.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
