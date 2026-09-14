import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

/**
 * Renders a post body (Markdown) into the `.blog-prose` article styles. This is a
 * server component — react-markdown runs at render time so the parser never ships
 * to the client. `remark-breaks` turns single newlines into <br> to match how the
 * seed copy is authored. Links are hardened (protocol-relative fix + safe rel).
 */
export function BlogProse({ body }: { body: string }) {
  return (
    <div className="blog-prose">
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          a: ({ href, children }) => {
            const url = href && !/^https?:\/\//.test(href) ? `https://${href}` : href;
            const external = Boolean(url && /^https?:\/\//.test(url));
            return (
              <a
                href={url}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
