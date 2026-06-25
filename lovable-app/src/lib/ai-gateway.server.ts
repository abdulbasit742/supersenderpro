import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function createLovableAiGatewayProvider(apiKey: string) {
  const provider = createOpenAICompatible({
    name: "lovable-ai",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey },
  });
  return (modelId: string) => provider.chat(modelId);
}
