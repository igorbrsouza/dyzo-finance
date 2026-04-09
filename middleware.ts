import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    secret: process.env.NEXTAUTH_SECRET,
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/events/:path*",
    "/tickets/:path*",
    "/guests/:path*",
    "/promoters/:path*",
    "/bar/:path*",
    "/stock/:path*",
    "/expenses/:path*",
    "/closing/:path*",
    "/export/:path*",
    "/settings/:path*",
  ],
};
