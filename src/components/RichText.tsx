import { Fragment, type ReactNode } from "react";

/** Sehr kleiner Markdown-Ersatz: Codeblöcke, `Code` und **fett**. Kein HTML, also sicher. */
export function RichText({ text }: { text: string }) {
  const blocks = text.split(/```(?:[a-zA-Z]*)\n?([\s\S]*?)```/g);
  return (
    <>
      {blocks.map((block, i) =>
        i % 2 === 1 ? (
          <pre key={i}>
            <code>{block.replace(/\n$/, "")}</code>
          </pre>
        ) : (
          <Fragment key={i}>{inline(block.replace(/^\n+/, i > 0 ? "" : "$&").replace(/\n+$/, i < blocks.length - 1 ? "" : "$&"))}</Fragment>
        ),
      )}
    </>
  );
}

function inline(text: string): ReactNode[] {
  return text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*)/g).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={i}>{part.slice(2, -2)}</strong>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}
