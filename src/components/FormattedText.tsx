import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

/**
 * Lightweight, safe renderer for structured AI responses (headings, bullet/numbered lists,
 * bold emphasis, and inline code) so raw markdown markers never leak into the UI.
 */
function renderInline(line: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-semibold text-ink-primary">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="rounded border border-hairline bg-surface px-1 py-0.5 font-mono text-[11px] text-ink-primary"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <span key={match.index} className="text-ink-muted">
          {token.slice(1, -1)}
        </span>
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }
  return parts;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '' }) => {
  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let listItems: { ordered: boolean; items: string[]; startKey: number } | null = null;

  const flushList = () => {
    if (!listItems) return;
    const Tag = listItems.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag
        key={`list-${listItems.startKey}`}
        className={`${
          listItems.ordered ? 'list-decimal' : 'list-disc'
        } space-y-1 pl-4 text-ink-secondary`}
      >
        {listItems.items.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {renderInline(item)}
          </li>
        ))}
      </Tag>
    );
    listItems = null;
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      flushList();
      blocks.push(
        <div key={`h-${idx}`} className="font-semibold text-ink-primary">
          {renderInline(headingMatch[1])}
        </div>
      );
      return;
    }

    const bulletMatch = line.match(/^[-•]\s+(.+)$/);
    if (bulletMatch) {
      if (!listItems || listItems.ordered) {
        flushList();
        listItems = { ordered: false, items: [], startKey: idx };
      }
      listItems.items.push(bulletMatch[1]);
      return;
    }

    const numMatch = line.match(/^\d+\.\s+(.+)$/);
    if (numMatch) {
      if (!listItems || !listItems.ordered) {
        flushList();
        listItems = { ordered: true, items: [], startKey: idx };
      }
      listItems.items.push(numMatch[1]);
      return;
    }

    flushList();
    blocks.push(
      <p key={`p-${idx}`} className="leading-relaxed text-ink-secondary">
        {renderInline(line)}
      </p>
    );
  });

  flushList();

  return <div className={`space-y-2 ${className}`}>{blocks}</div>;
};
