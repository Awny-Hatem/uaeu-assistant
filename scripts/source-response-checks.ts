/** Availability checks only; these do not establish factual support or currency. */
export async function checkSourceBody(response: Response, requestedUrl: URL): Promise<string | null> {
  const type = (response.headers.get("content-type") || "").toLowerCase();
  const expectsPdf = /\.pdf$/i.test(requestedUrl.pathname);
  if (expectsPdf || type.includes("application/pdf")) {
    if (!type.includes("application/pdf") && !type.includes("application/octet-stream")) {
      await response.body?.cancel();
      return `expected a PDF but received ${type || "no content type"}`;
    }
    const reader = response.body?.getReader();
    if (!reader) return "PDF response has no body";
    const chunks: Uint8Array[] = [];
    let count = 0;
    try {
      while (count < 1024) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value.subarray(0, 1024 - count));
        count += chunks.at(-1)!.length;
      }
    } finally { await reader.cancel(); }
    const prefix = Buffer.concat(chunks).toString("latin1");
    return /%PDF-\d\.\d/.test(prefix) ? null : "response lacks a PDF signature";
  }
  if (type.includes("text/html")) {
    const html = await response.text();
    const headings = [...html.matchAll(/<(?:title|h1)\b[^>]*>([\s\S]*?)<\/(?:title|h1)>/gi)]
      .map(match => match[1].replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").trim());
    if (headings.some(text => /(?:\b404\b|page\s+not\s+found|resource\s+not\s+found|الصفحة\s+غير\s+موجودة)/i.test(text))) {
      return "HTTP success contains a page-not-found heading (soft 404)";
    }
    const course = requestedUrl.searchParams.get("id");
    if (course && !html.toUpperCase().includes(course.toUpperCase())) {
      return `requested course ${course} not present in the returned page`;
    }
  } else {
    await response.body?.cancel();
  }
  return null;
}
