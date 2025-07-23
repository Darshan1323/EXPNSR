// lib/inngest/client.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "expnsr",
  name: "Expnsr",
  functionOptions: {
    retries: {
      maxAttempts: 4, // 🔥 Set max retry attempts
      retryFunction: (attempt) => ({
        delay: Math.pow(2, attempt) * 1000, // exponential backoff: 1s, 2s, 4s, 8s
      }),
    },
  },
});
