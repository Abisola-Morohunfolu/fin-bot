import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const EXTRACTION_PROMPT = `Extract transaction data from this image.
Return ONLY valid JSON (no markdown, no explanation), following this exact shape:
{
  "type": "expense" | "income",
  "amount": number,
  "currency": string,
  "merchant": string | null,
  "category": "food" | "transport" | "utilities" | "entertainment" | "shopping" | "health" | "other",
  "date": "YYYY-MM-DD" | null,
  "description": string,
  "confidence": "high" | "medium" | "low"
}`;

function parseJsonResponse(text) {
  const cleaned = text.trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("Vision response did not contain JSON.");
  }

  const jsonText = cleaned.slice(firstBrace, lastBrace + 1);
  return JSON.parse(jsonText);
}

function validateExtractedPayload(payload) {
  const required = ["type", "amount", "currency", "category", "description", "confidence"];
  const missing = required.filter((key) => !(key in payload));
  if (missing.length > 0) {
    throw new Error(`Vision response missing required fields: ${missing.join(", ")}`);
  }
  if (payload.confidence === "low") {
    throw new Error("Low confidence extraction. Please retake the photo.");
  }
}

export async function extractFromImage(base64, mimeType) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64
            }
          },
          {
            type: "text",
            text: EXTRACTION_PROMPT
          }
        ]
      }
    ]
  });

  const textBlock = response.content.find((item) => item.type === "text");
  if (!textBlock) {
    throw new Error("Vision response missing text content.");
  }

  let parsed;
  try {
    parsed = parseJsonResponse(textBlock.text);
  } catch {
    throw new Error("Unable to parse extraction result as JSON.");
  }

  validateExtractedPayload(parsed);
  return parsed;
}
