import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h3 className="mt-8 font-heading text-xl tracking-[-0.03em] text-[var(--ink)] first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="mt-8 font-heading text-xl tracking-[-0.03em] text-[var(--ink)] first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 text-base font-semibold text-[var(--ink)] first:mt-0">{children}</h3>
  ),
  h4: ({ children }) => (
    <h3 className="mt-6 text-base font-semibold text-[var(--ink)] first:mt-0">{children}</h3>
  ),
  h5: ({ children }) => (
    <h3 className="mt-6 text-base font-semibold text-[var(--ink)] first:mt-0">{children}</h3>
  ),
  h6: ({ children }) => (
    <h3 className="mt-6 text-base font-semibold text-[var(--ink)] first:mt-0">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mt-4 text-[15px] leading-7 text-[var(--ink-soft)] first:mt-0">{children}</p>
  ),
  ul: ({ children, className }) => {
    const isTaskList = className?.includes('contains-task-list');
    return (
      <ul className={`mt-4 space-y-2 text-[15px] leading-7 text-[var(--ink-soft)] ${isTaskList ? 'list-none pl-0' : 'list-disc pl-6'}`}>
        {children}
      </ul>
    );
  },
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-2 pl-6 text-[15px] leading-7 text-[var(--ink-soft)]">
      {children}
    </ol>
  ),
  li: ({ children, className }) => (
    <li className={className?.includes('task-list-item') ? 'list-none pl-0' : 'pl-1'}>
      {children}
    </li>
  ),
  table: ({ children }) => (
    <div
      aria-label="Scrollable description table"
      className="mt-5 max-w-full overflow-x-auto overscroll-x-contain border border-[var(--line)]"
      role="region"
      tabIndex={0}
    >
      <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[var(--panel-soft)]">{children}</thead>,
  tr: ({ children }) => <tr className="border-b border-[var(--line)] last:border-b-0">{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-3 font-semibold text-[var(--ink)]">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-3 align-top text-[var(--ink-soft)]">{children}</td>
  ),
  input: ({ node, ...props }) => {
    void node;
    return (
      <input
        {...props}
        aria-label={props.checked ? 'Completed checklist item' : 'Incomplete checklist item'}
        className="mr-2 h-4 w-4 align-[-0.15em] accent-[var(--strategy-strong)]"
      />
    );
  },
  del: ({ children }) => <del className="text-[var(--muted)]">{children}</del>,
  blockquote: ({ children }) => (
    <blockquote className="mt-5 border-l-4 border-[var(--tech)] bg-[var(--tech-wash)] px-4 py-3 text-[var(--ink-soft)]">
      {children}
    </blockquote>
  ),
  pre: ({ children }) => (
    <pre className="mt-5 max-w-full overflow-x-auto whitespace-pre-wrap border border-[var(--line)] bg-[var(--panel-strong)] p-4 text-sm leading-6 text-white [overflow-wrap:anywhere]">
      {children}
    </pre>
  ),
  code: ({ children }) => (
    <code className="bg-[var(--panel-soft)] px-1 py-0.5 font-mono text-[0.92em] text-[var(--ink)]">
      {children}
    </code>
  ),
  a: ({ children, href }) => (
    <a
      className="font-semibold text-[var(--strategy-strong)] underline decoration-[var(--accent)] underline-offset-4"
      href={href}
      rel="noreferrer noopener"
      target="_blank"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-6 border-0 border-t border-[var(--line)]" />,
};

export function MarkdownDescription({ markdown }: { markdown: string }) {
  return (
    <div className="max-w-[72ch] [overflow-wrap:anywhere]">
      <Markdown
        components={markdownComponents}
        disallowedElements={['img']}
        remarkPlugins={[remarkGfm]}
        skipHtml
      >
        {markdown}
      </Markdown>
    </div>
  );
}
