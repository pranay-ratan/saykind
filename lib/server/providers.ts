/**
 * Chooses which provider serves each capability. Pure: it takes the environment as an argument and returns
 * names and yes/no answers only. No key value ever leaves this function.
 *
 * Defaults: ElevenLabs for speech and transcription, Claude for conversation. OpenAI is used only when its key is
 * set and nothing else is available, or when the explicit *_PROVIDER variable asks for it. A provider is never
 * chosen without its key.
 */

export type Capability = "speak" | "transcribe" | "converse";
export type ProviderName = "elevenlabs" | "openai" | "claude" | "none";
export type Env = Readonly<Record<string, string | undefined>>;

type RealProvider = Exclude<ProviderName, "none">;

const KEY_FOR: Record<RealProvider, string> = {
  elevenlabs: "ELEVENLABS_API_KEY",
  openai: "OPENAI_API_KEY",
  claude: "ANTHROPIC_API_KEY",
};

const ALLOWED: Record<Capability, readonly RealProvider[]> = {
  speak: ["elevenlabs", "openai"],
  transcribe: ["elevenlabs", "openai"],
  converse: ["claude", "openai"],
};

const EXPLICIT_VARIABLE: Record<Capability, string> = {
  speak: "SPEAK_PROVIDER",
  transcribe: "TRANSCRIBE_PROVIDER",
  converse: "CONVERSE_PROVIDER",
};

const hasKey = (env: Env, provider: RealProvider): boolean => Boolean(env[KEY_FOR[provider]]?.trim());

/** The provider that will serve a capability, or "none" when no usable key is set. */
export function resolveProvider(capability: Capability, env: Env): ProviderName {
  const explicit = env[EXPLICIT_VARIABLE[capability]]?.trim().toLowerCase();
  if (explicit && (ALLOWED[capability] as readonly string[]).includes(explicit)) {
    const provider = explicit as RealProvider;
    if (hasKey(env, provider)) return provider;
  }
  for (const provider of ALLOWED[capability]) {
    if (hasKey(env, provider)) return provider;
  }
  return "none";
}

/** Names of the keys a capability needs, for the "not set up" message. Names only. */
export function keysNeededFor(capability: Capability): string[] {
  return ALLOWED[capability].map((provider) => KEY_FOR[provider]);
}

export type ProviderStatus = {
  configured: boolean;
  providers: Record<Capability, ProviderName>;
  keysPresent: Record<string, boolean>;
  missing: string[];
};

/** For /api/status: which providers are active, and which key names are present (never values). */
export function providerStatus(env: Env): ProviderStatus {
  const capabilities: Capability[] = ["speak", "transcribe", "converse"];
  const providers = Object.fromEntries(
    capabilities.map((capability) => [capability, resolveProvider(capability, env)]),
  ) as Record<Capability, ProviderName>;
  const keysPresent = Object.fromEntries(Object.values(KEY_FOR).map((name) => [name, Boolean(env[name]?.trim())]));
  const missing = capabilities
    .filter((capability) => providers[capability] === "none")
    .flatMap((capability) => keysNeededFor(capability));
  return {
    configured: missing.length === 0,
    providers,
    keysPresent,
    missing: [...new Set(missing)],
  };
}
