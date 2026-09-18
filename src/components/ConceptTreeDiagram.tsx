import React from 'react';
import { GitFork, Network } from 'lucide-react';

interface ConceptTreeDiagramProps {
  diagramText: string;
  className?: string;
}

export interface ParsedTree {
  parent: string;
  children: string[];
}

export function parseTreeDiagram(text?: string): ParsedTree | null {
  if (!text || typeof text !== 'string') return null;
  const raw = text.replace(/\\n/g, '\n').trim();

  // Case 1: Arrow -> or →
  if (raw.includes('->') || raw.includes('→')) {
    const arrow = raw.includes('->') ? '->' : '→';
    const [parentPart, childrenPart] = raw.split(arrow);
    const parent = parentPart.replace(/^[\[\(]|[\)\]]$/g, '').trim();
    const children = (childrenPart || '')
      .split(/\s*\|\s*|\n/)
      .map((c) => c.replace(/^[\[\(]|[\)\]]$/g, '').trim())
      .filter(Boolean);
    if (parent && children.length > 0) return { parent, children };
  }

  // Case 2: Multi-line with dash or bullets
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2 && lines.slice(1).some((l) => /^[-*•\d\.\)]/.test(l))) {
    const parent = lines[0].replace(/^[\[\(]|[\)\]]$/g, '').trim();
    const children = lines
      .slice(1)
      .map((l) => l.replace(/^[-*•\d\.\)\s]+/, '').replace(/^[\[\(]|[\)\]]$/g, '').trim())
      .filter(Boolean);
    if (parent && children.length > 0) return { parent, children };
  }

  // Case 3: Colon : followed by piped children
  if (raw.includes(':') && raw.includes('|')) {
    const [parentPart, childrenPart] = raw.split(':');
    const parent = parentPart.replace(/^[\[\(]|[\)\]]$/g, '').trim();
    const children = (childrenPart || '')
      .split(/\s*\|\s*/)
      .map((c) => c.replace(/^[\[\(]|[\)\]]$/g, '').trim())
      .filter(Boolean);
    if (parent && children.length > 0) return { parent, children };
  }

  return null;
}

const isVariable = (s: string) => /^[A-ZА-Яa-z\d\?؟]$/.test(s.trim());

export const ConceptTreeDiagram: React.FC<ConceptTreeDiagramProps> = ({
  diagramText,
  className = '',
}) => {
  const tree = parseTreeDiagram(diagramText);

  if (!tree || tree.children.length === 0) {
    // Fallback if parsing fails: render as a clean badge box
    return (
      <div className={`my-3 p-4 rounded-2xl bg-teal-950/30 border border-teal-500/40 text-right dir-rtl ${className}`} dir="rtl">
        <p className="font-arabic text-base text-teal-100 leading-relaxed font-medium">{diagramText}</p>
      </div>
    );
  }

  const childCount = tree.children.length;
  // Grid columns class based on count
  const gridColsClass = 
    childCount === 2 ? 'grid-cols-2' :
    childCount === 3 ? 'grid-cols-3' :
    childCount === 4 ? 'grid-cols-4' :
    childCount === 5 ? 'grid-cols-5' : 'grid-cols-4';

  return (
    <div
      className={`my-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-teal-500/40 shadow-xl overflow-x-auto ${className}`}
      dir="rtl"
    >
      {/* Header Badge */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-4">
        <span className="text-[11px] font-sans font-bold text-teal-400 flex items-center gap-1.5 uppercase tracking-wider">
          <Network className="w-3.5 h-3.5 text-teal-400" />
          <span>الرسم البياني / Peta Konsep</span>
        </span>
        <span className="text-[10px] text-slate-400 font-sans">
          {childCount} Cabang
        </span>
      </div>

      <div className="min-w-[340px] sm:min-w-[420px] max-w-2xl mx-auto flex flex-col items-center">
        {/* Parent / Root Node */}
        <div className="relative z-10">
          {isVariable(tree.parent) ? (
            <div className="inline-flex items-center justify-center px-7 py-2.5 rounded-xl border-2 border-amber-400 bg-amber-950/50 text-amber-300 font-extrabold text-2xl font-mono shadow-lg shadow-amber-950/40 tracking-wider min-w-[80px]">
              {tree.parent}
            </div>
          ) : (
            <div className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl border-2 border-teal-500 bg-slate-900/95 text-teal-200 font-bold text-base sm:text-lg font-arabic shadow-lg text-center leading-relaxed">
              {tree.parent}
            </div>
          )}
        </div>

        {/* Dynamic Radiating SVG Arrows */}
        <div className="w-full h-11 relative overflow-visible my-0.5">
          <svg
            className="w-full h-full overflow-visible"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <marker
                id="tree-arrowhead"
                viewBox="0 0 10 10"
                refX="6"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#2dd4bf" />
              </marker>
            </defs>

            {tree.children.map((_, idx) => {
              // In RTL, index 0 is at the right edge
              const childXPct = (1 - (idx + 0.5) / childCount) * 100;
              return (
                <line
                  key={idx}
                  x1="50%"
                  y1="0"
                  x2={`${childXPct}%`}
                  y2="100%"
                  stroke="#2dd4bf"
                  strokeWidth="2"
                  strokeLinecap="round"
                  markerEnd="url(#tree-arrowhead)"
                />
              );
            })}
          </svg>
        </div>

        {/* Children Row */}
        <div className={`grid ${gridColsClass} gap-2 sm:gap-3 w-full items-stretch pt-0.5`}>
          {tree.children.map((child, idx) => {
            const isChildVar = isVariable(child);
            return (
              <div key={idx} className="flex flex-col items-center">
                <div
                  className={`w-full h-full min-h-[56px] flex items-center justify-center p-2 sm:p-3 rounded-xl border-2 text-center transition-all ${
                    isChildVar
                      ? 'border-amber-400/90 bg-amber-950/50 text-amber-300 font-mono font-extrabold text-xl shadow-md shadow-amber-950/30'
                      : 'border-slate-700 hover:border-teal-500/50 bg-slate-850/90 bg-slate-900/90 text-slate-100 font-arabic font-semibold text-xs sm:text-sm md:text-base leading-snug shadow-sm'
                  }`}
                >
                  <span className="break-words line-clamp-3 font-medium">
                    {child}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
