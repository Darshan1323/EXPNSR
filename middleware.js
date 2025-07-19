import { clerkMiddleware } from "@clerk/nextjs/server";
import arcjet, { createMiddleware, detectBot, shield } from "@arcjet/next";

// export default clerkMiddleware();

const aj = arcjet({
  key: process.env.ARCJET_KEY,
  rules:[
    shield({
      mode: "LIVE",
    }),
    detectBot({
      mode: "LIVE", 
      allow:[
        "CATEGORY:SEARCH_ENGINE","GO_HTTP",
      ]
    })
  ]
})

export default createMiddleware(aj, clerkMiddleware);

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};