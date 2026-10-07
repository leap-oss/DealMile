async function main() {
  const key = process.env.GEMINI_API_KEY;
  const gemini = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models",
    {
      headers: { "x-goog-api-key": key ?? "" },
      signal: AbortSignal.timeout(20000),
    },
  );
  const modelData = (await gemini.json()) as {
    models?: { name: string; supportedGenerationMethods?: string[] }[];
    error?: { status?: string };
  };
  console.log({
    geminiStatus: gemini.status,
    geminiError: modelData.error?.status,
    models: modelData.models
      ?.filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => m.name)
      .slice(0, 15),
  });
  const paypal = await fetch(
    "https://api-m.sandbox.paypal.com/v1/oauth2/token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(20000),
    },
  );
  const paypalData = (await paypal.json()) as {
    access_token?: string;
    error?: string;
  };
  console.log({
    paypalStatus: paypal.status,
    paypalConnected: !!paypalData.access_token,
    paypalError: paypalData.error,
  });
}
main().catch(() => {
  console.error("Connection check failed.");
  process.exitCode = 1;
});
