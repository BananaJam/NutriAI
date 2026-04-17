import { auth } from "@/server/lib/auth";

export async function getRequestSession(request: Request) {
  return auth.api.getSession({
    headers: request.headers,
  });
}

export async function requireRequestSession(
  request: Request,
  set: { status?: number | string },
) {
  const session = await getRequestSession(request);

  if (!session?.user || !session.session) {
    set.status = 401;
    return null;
  }

  return session;
}
