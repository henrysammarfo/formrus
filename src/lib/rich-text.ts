const ALLOWED_RICH_TEXT_TAGS = new Set([
  "a",
  "b",
  "br",
  "code",
  "div",
  "em",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "strike",
  "strong",
  "u",
  "ul",
]);

export function looksLikeRichTextHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function stripRichText(value: string): string {
  const withBreaks = value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ");

  if (typeof document === "undefined") return withBreaks.trim();

  const textarea = document.createElement("textarea");
  textarea.innerHTML = withBreaks;
  return textarea.value.replace(/\n{3,}/g, "\n\n").trim();
}

export function sanitizeRichTextHtml(value: string): string {
  if (!value.trim()) return "";
  if (typeof document === "undefined") return stripRichText(value);

  const template = document.createElement("template");
  template.innerHTML = value;

  const cleanChildren = (node: Node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue;

      const element = child as HTMLElement;
      const tag = element.tagName.toLowerCase();
      cleanChildren(element);

      if (!ALLOWED_RICH_TEXT_TAGS.has(tag)) {
        const fragment = document.createDocumentFragment();
        while (element.firstChild) fragment.appendChild(element.firstChild);
        element.replaceWith(fragment);
        continue;
      }

      for (const attr of [...element.attributes]) {
        const name = attr.name.toLowerCase();
        if (tag === "a" && name === "href") {
          try {
            const url = new URL(attr.value, window.location.origin);
            if (!["http:", "https:", "mailto:"].includes(url.protocol)) {
              element.removeAttribute(attr.name);
            } else {
              element.setAttribute("href", url.href);
              element.setAttribute("target", "_blank");
              element.setAttribute("rel", "noreferrer");
            }
          } catch {
            element.removeAttribute(attr.name);
          }
          continue;
        }
        element.removeAttribute(attr.name);
      }
    }
  };

  cleanChildren(template.content);
  return template.innerHTML.trim();
}
