'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  FileCode,
  Send,
  Loader2,
  Compass,
  Cpu,
  Layers,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react';
import { askAI } from '../lib/api';
import type { AISummaryArtifact } from '@repo-analyzer/shared';

interface AiInsightsViewProps {
  scanId: string;
  aiSummary: AISummaryArtifact;
}

export function AiInsightsView({ scanId, aiSummary }: AiInsightsViewProps) {
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [qaHistory, setQaHistory] = useState<
    { question: string; answer: string; files: string[] }[]
  >([]);

  const handleAsk = async (customQ?: string) => {
    const q = (customQ || question).trim();
    if (!q || isAsking) return;

    setIsAsking(true);
    try {
      const res = await askAI(scanId, q);
      setQaHistory((prev) => [
        ...prev,
        { question: q, answer: res.answer, files: res.referencedFiles || [] },
      ]);
      setQuestion('');
    } catch (err: any) {
      alert(`AI Query Error: ${err.message || 'Failed to query Gemini'}`);
    } finally {
      setIsAsking(false);
    }
  };

  const sampleQuestions = [
    'How does the routing architecture map incoming HTTP requests?',
    'Which database models and relations are defined in the schema?',
    'What security hygiene patterns or middleware protections were observed?',
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Grounded AI Disclaimer Pill */}
      <div className="p-4 rounded-xl bg-surface border border-border shadow-subtle flex items-start space-x-3 text-xs text-text-muted">
        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-text-main block">
            Google Gemini Synthesis & Explanations
          </span>
          <p className="mt-0.5 leading-relaxed">
            The narratives below are synthesized by Google Gemini strictly conditioned on the verified
            AST facts (routes, controllers, schemas, and line counts) discovered by our deterministic engine.
          </p>
        </div>
      </div>

      {/* Project Overview & Architecture Narrative */}
      <div className="p-6 rounded-xl bg-surface border border-border shadow-subtle space-y-4">
        <div className="flex items-center space-x-2 text-text-main font-semibold text-sm">
          <Cpu className="w-4 h-4 text-primary" />
          <span>System Architecture & Role</span>
        </div>

        <p className="text-sm text-text-muted leading-relaxed">
          {aiSummary.overview || 'Overview narrative generated from discovered code structure.'}
        </p>

        {aiSummary.architectureOverview && (
          <div className="pt-3 border-t border-border/60">
            <h4 className="text-xs font-semibold text-text-main uppercase font-mono tracking-wider mb-1.5">
              Request Pipeline Architecture
            </h4>
            <p className="text-xs text-text-muted leading-relaxed">
              {aiSummary.architectureOverview}
            </p>
          </div>
        )}

        {/* Observed Key Capabilities */}
        {aiSummary.keyFeatures && aiSummary.keyFeatures.length > 0 && (
          <div className="pt-3 border-t border-border/60">
            <h4 className="text-xs font-semibold text-text-subtle uppercase font-mono tracking-wider mb-2.5">
              Observed Code Capabilities:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {aiSummary.keyFeatures.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-background border border-border flex items-start space-x-2"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="text-text-main leading-normal">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggested Exploration Paths */}
      {aiSummary.suggestedExplorationPaths && aiSummary.suggestedExplorationPaths.length > 0 && (
        <div className="p-6 rounded-xl bg-surface border border-border shadow-subtle space-y-4">
          <div className="flex items-center space-x-2 text-text-main font-semibold text-sm">
            <Compass className="w-4 h-4 text-accent" />
            <span>Recommended Codebase Exploration Paths</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            {aiSummary.suggestedExplorationPaths.map((path, idx) => (
              <div key={idx} className="p-3.5 rounded-lg bg-background border border-border space-y-2">
                <div className="font-bold text-text-main font-sans">{path.title}</div>
                <div className="text-[11px] text-text-muted font-sans leading-relaxed">
                  {path.description}
                </div>
                <div className="text-[10px] text-primary flex items-center space-x-1 pt-1 truncate">
                  <FileCode className="w-3 h-3 shrink-0" />
                  <span className="truncate">Entry: {path.entryFile}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Module Highlights */}
      {aiSummary.moduleHighlights && aiSummary.moduleHighlights.length > 0 && (
        <div className="p-6 rounded-xl bg-surface border border-border shadow-subtle space-y-4">
          <div className="flex items-center space-x-2 text-text-main font-semibold text-sm">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Key Module Highlights</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {aiSummary.moduleHighlights.map((mod, idx) => (
              <div key={idx} className="p-3.5 rounded-lg bg-background border border-border space-y-2">
                <div className="font-semibold text-text-main">{mod.name}</div>
                <p className="text-[11px] text-text-muted leading-relaxed">{mod.description}</p>
                {mod.keyFiles && mod.keyFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {mod.keyFiles.map((kf, kfIdx) => (
                      <span
                        key={kfIdx}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface border border-border text-text-subtle"
                      >
                        {kf}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Integrated Repository Q&A Assistant */}
      <div className="p-6 rounded-xl bg-surface border border-border shadow-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-text-main font-semibold text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Ask Gemini About This Codebase</span>
          </div>
          <span className="text-[11px] font-mono text-text-subtle">Grounding Engine Active</span>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2 text-xs">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(q)}
              disabled={isAsking}
              className="px-3 py-1.5 rounded-lg bg-background border border-border hover:border-primary/50 text-text-muted hover:text-text-main text-xs transition-colors text-left"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Q&A Thread Feed */}
        {qaHistory.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-border">
            {qaHistory.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-background border border-border space-y-2 text-xs">
                <div className="font-semibold text-primary flex items-center space-x-2">
                  <span>Q:</span>
                  <span>{item.question}</span>
                </div>
                <div className="text-text-muted leading-relaxed whitespace-pre-line text-[11px]">
                  {item.answer}
                </div>
                {item.files && item.files.length > 0 && (
                  <div className="pt-2 border-t border-border/60 text-[10px] font-mono text-text-subtle flex flex-wrap gap-1.5 items-center">
                    <span>Evidence files:</span>
                    {item.files.map((f, fIdx) => (
                      <span key={fIdx} className="underline text-text-muted">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex gap-2 pt-2"
        >
          <input
            type="text"
            placeholder="Ask a technical question about endpoints, schema, or architecture..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={isAsking}
            className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-xs text-text-main placeholder-text-subtle focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={isAsking || !question.trim()}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition-colors disabled:opacity-40 shadow-sm"
          >
            {isAsking ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
}
