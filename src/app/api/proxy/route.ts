import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = request.url;
  const searchParams = request.nextUrl.searchParams;

  // Extract targetUrl preserving query string parameters
  let targetUrl = "";
  let referer = "";

  const urlMatch = requestUrl.match(/[?&]url=([^&]+(?:&(?!(?:referer)=)[^&]+)*)/);
  if (urlMatch && urlMatch[1]) {
    try {
      targetUrl = decodeURIComponent(urlMatch[1]);
    } catch {
      targetUrl = searchParams.get("url") || "";
    }
  } else {
    targetUrl = searchParams.get("url") || "";
  }

  const refererMatch = requestUrl.match(/[?&]referer=([^&]+)/);
  if (refererMatch && refererMatch[1]) {
    try {
      referer = decodeURIComponent(refererMatch[1]);
    } catch {
      referer = searchParams.get("referer") || searchParams.get("headers") || "";
    }
  } else {
    referer = searchParams.get("referer") || searchParams.get("headers") || "";
  }

  if (!targetUrl) {
    return new NextResponse("Missing url parameter", { status: 400 });
  }

  try {
    const targetUri = new URL(targetUrl);
    const origin = targetUri.origin;

    if (!referer || referer.includes("localhost") || referer.includes("127.0.0.1") || referer.includes("0.0.0.0")) {
      referer = `${origin}/`;
    }

    const baseHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
    };

    // Attempt 1: Fetch with provided Referer and Origin
    const fetchHeaders: Record<string, string> = {
      ...baseHeaders,
      Referer: referer,
      Origin: origin,
    };

    let response = await fetch(targetUrl, {
      headers: fetchHeaders,
      redirect: "follow",
    });

    // Attempt 2: Fallback without Referer/Origin if 404/403
    if (!response.ok && (response.status === 404 || response.status === 403)) {
      response = await fetch(targetUrl, {
        headers: baseHeaders,
        redirect: "follow",
      });
    }

    if (!response.ok) {
      return new NextResponse(`Proxy target returned status: ${response.status} ${response.statusText}`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get("content-type") || "";
    const urlWithoutQuery = targetUrl.split("?")[0];

    const isM3u8Candidate =
      urlWithoutQuery.endsWith(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("x-mpegurl") ||
      contentType.includes("vnd.apple.mpegurl");

    if (isM3u8Candidate) {
      const manifestText = await response.text();

      if (manifestText.includes("#EXTM3U") || isM3u8Candidate) {
        const baseUrl = urlWithoutQuery.substring(0, urlWithoutQuery.lastIndexOf("/") + 1);

        // Rewrite relative and absolute URL lines in m3u8 playlist to route back through this proxy
        const rewrittenManifest = manifestText
          .split("\n")
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) {
              if (trimmed.startsWith("#EXT-X-KEY:") || trimmed.startsWith("#EXT-X-MAP:")) {
                return trimmed.replace(/URI="([^"]+)"/g, (match, uriStr) => {
                  const absoluteUri = uriStr.startsWith("http")
                    ? uriStr
                    : new URL(uriStr, baseUrl).toString();
                  const proxyUri = `/api/proxy?url=${encodeURIComponent(absoluteUri)}${
                    referer ? `&referer=${encodeURIComponent(referer)}` : ""
                  }`;
                  return `URI="${proxyUri}"`;
                });
              }
              return line;
            }

            let segmentUrl = trimmed;
            if (!segmentUrl.startsWith("http://") && !segmentUrl.startsWith("https://")) {
              if (segmentUrl.startsWith("/")) {
                segmentUrl = `${origin}${segmentUrl}`;
              } else {
                segmentUrl = `${baseUrl}${segmentUrl}`;
              }
            }

            return `/api/proxy?url=${encodeURIComponent(segmentUrl)}${
              referer ? `&referer=${encodeURIComponent(referer)}` : ""
            }`;
          })
          .join("\n");

        return new NextResponse(rewrittenManifest, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.apple.mpegurl",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Cache-Control": "no-cache",
          },
        });
      }
    }

    const arrayBuffer = await response.arrayBuffer();
    return new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    console.error("Proxy error:", error);
    return new NextResponse(`Proxy server error: ${error?.message || "Unknown"}`, {
      status: 500,
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}
