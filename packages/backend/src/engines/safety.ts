const CRISIS_PATTERN =
  /\b(suicide|kill myself|end my (life|own life)|self[- ]?harm|cut myself|want to die|don'?t want to live|better off dead|no reason to live|take my (own )?life)\b/i;

const MEDICAL_CLAIM_PATTERN =
  /\b(you have (a |an )?\w+ (disorder|disease|syndrome|condition)|diagnosed with|you are suffering from|your condition is|this is (definitely|certainly) a medical|you need medication|you should take \w+ for)\b/i;

const OVERCONFIDENCE_PATTERN =
  /\b(you absolutely (should|must|need to)|this is definitely|without (a |any )doubt|I (know|am certain|am sure) this|this will (definitely|certainly|absolutely) (work|help|fix))\b/i;

const DEPENDENCY_PATTERN =
  /\b(I'?(ll| will) always be (here|with you|there for you)|you need me|you can'?t (handle|do|get through) this without me|I'?(m| am) the only one who (understands|gets|can help))\b/i;

const CRISIS_RESOURCE =
  "If you're experiencing thoughts of self-harm or suicide, please reach out for help immediately. " +
  "You can contact the 988 Suicide & Crisis Lifeline by calling or texting 988 (in the US), " +
  "or contact your local emergency services. You are not alone, and there are people who want to help.";

export async function safetyCheck(params: {
  userId: string;
  userMessage: string;
  assistantResponse: string;
}): Promise<{ passed: boolean; flags: string[]; reason?: string }> {
  const flags: string[] = [];

  // Check both user message and assistant response together for crisis terms
  const combined = `${params.userMessage} ${params.assistantResponse}`;

  // 1. Crisis detection — check both user input and assistant response
  if (CRISIS_PATTERN.test(combined)) {
    flags.push("crisis");
  }

  // 2-4 check the assistant response only (the AI's output)
  const response = params.assistantResponse;

  // 2. Medical advice
  if (MEDICAL_CLAIM_PATTERN.test(response)) {
    flags.push("medical_claim");
  }

  // 3. Overconfidence
  if (OVERCONFIDENCE_PATTERN.test(response)) {
    flags.push("overconfidence");
  }

  // 4. Dependency
  if (DEPENDENCY_PATTERN.test(response)) {
    flags.push("dependency");
  }

  const passed = flags.length === 0;
  const reason = flags.includes("crisis") ? CRISIS_RESOURCE : undefined;

  return { passed, flags, reason };
}
