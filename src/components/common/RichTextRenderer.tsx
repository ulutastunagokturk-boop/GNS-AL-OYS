import React from 'react';
import Markdown from 'react-markdown';

interface RichTextRendererProps {
  content: string;
  className?: string;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  return (
    <div className={`rich-text-content prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-200 leading-relaxed ${className}`}>
      <Markdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-3 mb-2 border-b border-slate-200 dark:border-slate-800 pb-1">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-2.5 mb-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400 inline-block"></span>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 mt-2 mb-1">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 leading-relaxed text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-extrabold text-slate-900 dark:text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-slate-700 dark:text-slate-200">
              {children}
            </em>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1 my-2 pl-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 marker:text-purple-600 dark:marker:text-purple-400">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1 my-2 pl-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 marker:font-bold marker:text-purple-600 dark:marker:text-purple-400">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 px-3.5 py-2 my-2.5 rounded-r-xl text-xs sm:text-sm text-purple-900 dark:text-purple-200 italic shadow-xs">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 dark:text-purple-400 underline underline-offset-2 font-bold hover:text-purple-700 transition"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-purple-600 dark:text-purple-300 font-mono text-[11px] border border-slate-200 dark:border-slate-700 font-semibold">
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <table className="min-w-full text-xs text-left divide-y divide-slate-200 dark:divide-slate-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-[11px] font-black uppercase tracking-wider">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 whitespace-normal text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800">
              {children}
            </td>
          ),
          hr: () => (
            <hr className="my-3 border-slate-200 dark:border-slate-800" />
          )
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};
