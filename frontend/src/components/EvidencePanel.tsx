import { useState } from "react";
import {
  Brain,
  Check,
  ChevronDown,
  ExternalLink,
  Globe,
  X,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { getCredibility } from "@/lib/sourceCredibility";
import type { FactCheckRecord } from "@/lib/types";
import { SOURCE_STATUS_LABELS } from "@/lib/types";
import { agreementTier } from "@/lib/verification";
import { KnowledgeEvidenceNote } from "@/components/SourcePanel";

interface EvidencePanelProps {
  record: FactCheckRecord;
}

const STATUS_BADGE: Record<
  string,
  { label: string; ok: boolean; cls: string }
> = {
  NOT_PROVIDED: {
    label: "Not provided",
    ok: false,
    cls: "border-line text-ink-ghost",
  },
  FETCHED: {
    label: "Retrieved",
    ok: true,
    cls: "border-signal/40 text-signal",
  },
  EMPTY: { label: "Empty", ok: false, cls: "border-warn/40 text-warn" },
  BLOCKED: {
    label: "Blocked",
    ok: false,
    cls: "border-danger/40 text-danger",
  },
  TIMEOUT: {
    label: "Timeout",
    ok: false,
    cls: "border-warn/40 text-warn",
  },
  INVALID: {
    label: "Invalid",
    ok: false,
    cls: "border-danger/40 text-danger",
  },
  ERROR: { label: "Error", ok: false, cls: "border-danger/40 text-danger" },
};

function domainOf(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

function faviconUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
  } catch {
    return "";
  }
}

export default function EvidencePanel({ record }: EvidencePanelProps) {
  const reduceMotion = useReducedMotion();
  const delay = (ms: number) => (reduceMotion ? 0 : ms);
  const [expanded, setExpanded] = useState<number | null>(null);

  const isKnowledgeBased = record.verification_mode === "KNOWLEDGE_BASED";

  if (isKnowledgeBased) {
    return (
      <motion.section
        aria-label="Evidence used"
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(0.8), duration: 0.45 }}
        className="rounded-xl border border-line bg-surface p-6 shadow-card"
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pending/10">
            <Brain size={14} className="text-pending" />
          </span>
          <h2 className="font-display text-sm font-semibold tracking-wide text-ink">
            Evidence used
          </h2>
        </div>
        <KnowledgeEvidenceNote />
      </motion.section>
    );
  }

  const evidenceByUrl = new Map(
    (record.source_details ?? []).map((d) => [d.url, d])
  );
  const allSources = [
    record.source_url,
    ...record.sources_checked.filter((s) => s !== record.source_url),
  ].filter(Boolean);
  const fetchedCount = allSources.filter((url) => {
    const detail = evidenceByUrl.get(url);
    if (detail) return detail.status === "FETCHED";
    if (url === record.source_url) return record.source_status === "FETCHED";
    return true;
  }).length;
  const agreement = agreementTier(record.confidence);

  return (
    <motion.section
      aria-label="Evidence used"
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay(0.8), duration: 0.45 }}
      className="rounded-xl border border-line bg-surface p-6 shadow-card"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-signal/10">
            <Globe size={14} className="text-signal" />
          </span>
          <h2 className="font-display text-sm font-semibold tracking-wide text-ink">
            Evidence sources
          </h2>
        </div>
        <span className="rounded-full bg-surface-2 px-3 py-1 font-mono text-[0.65rem] font-semibold text-ink-dim">
          {fetchedCount} / {allSources.length} retrieved
        </span>
      </div>

      {/* Evidence agreement bar */}
      <div className="mb-5 rounded-lg bg-surface-2 px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-mono text-[0.6rem] uppercase tracking-wider text-ink-ghost">
            Evidence agreement
          </span>
          <span className="font-mono text-xs font-semibold text-ink">
            {agreement.pct}%
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-void">
          <motion.div
            initial={reduceMotion ? false : { width: 0 }}
            animate={{ width: `${Math.max(agreement.pct, 5)}%` }}
            transition={{ delay: delay(1200), duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-signal"
          />
        </div>
        <p className="mt-1.5 font-mono text-[0.6rem] text-ink-ghost">
          {agreement.label} across sources
        </p>
      </div>

      {/* Source cards */}
      <div className="space-y-3">
        {allSources.map((url, index) => {
          const isExpanded = expanded === index;
          const detail = evidenceByUrl.get(url);
          const isPrimary = detail ? detail.role === "primary" : index === 0;
          const cred = getCredibility(url);
          const status = detail?.status ?? (index === 0 ? record.source_status : "FETCHED");
          const badge = STATUS_BADGE[status] ?? STATUS_BADGE["ERROR"];
          const host = detail?.host || domainOf(url);
          const hash = detail?.content_hash ?? "";
          const length = detail?.content_length ?? 0;

          return (
            <motion.div
              key={`${url}-${index}`}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: delay(1400 + index * 150),
                duration: 0.3,
              }}
              className="rounded-lg border border-line bg-surface-2 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : index)}
                aria-expanded={isExpanded}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-line-dim/40"
              >
                <img
                  src={faviconUrl(url)}
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4 shrink-0 rounded-sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[0.6rem] font-bold uppercase tracking-wider text-ink-ghost">
                      {isPrimary ? "Source 1" : `Source ${index + 1}`}
                    </span>
                    {isPrimary && (
                      <span className="rounded border border-signal-border bg-signal-dim px-1.5 py-0.5 font-mono text-[0.5rem] font-bold tracking-widest text-signal">
                        PRIMARY
                      </span>
                    )}
                    {!isPrimary && (
                      <span className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[0.5rem] font-bold tracking-widest text-ink-ghost">
                        CORROBORATING
                      </span>
                    )}
                  </div>
                  <span className="mt-0.5 block truncate font-mono text-xs text-ink">
                    {isExpanded ? url : host}
                  </span>
                </div>
                <span
                  className={`hidden shrink-0 rounded border px-2 py-0.5 font-mono text-[0.55rem] font-semibold sm:inline ${cred.badgeClass}`}
                >
                  {cred.label} {cred.score}
                </span>
                <span
                  className={`flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 font-mono text-[0.55rem] ${badge.cls}`}
                >
                  {badge.ok ? <Check size={10} /> : <X size={10} />}
                  {badge.label}
                </span>
                <ChevronDown
                  size={13}
                  className={`shrink-0 text-ink-ghost transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isExpanded && (
                <div className="border-t border-line-dim px-4 py-3">
                  <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-wider text-ink-ghost">
                    Full URL
                  </p>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-3 flex items-center gap-1.5 font-mono text-xs text-signal transition-colors hover:underline"
                  >
                    {url.slice(0, 60)}
                    {url.length > 60 ? "..." : ""}
                    <ExternalLink size={10} className="shrink-0" />
                  </a>
                  {detail && (
                    <div className="mb-3 grid grid-cols-1 gap-1.5 rounded border border-line-dim bg-surface px-3 py-2 font-mono text-[0.6rem] text-ink-dim sm:grid-cols-2">
                      <div>
                        <span className="uppercase tracking-wider text-ink-ghost">
                          Host{" "}
                        </span>
                        {detail.host || "—"}
                      </div>
                      <div>
                        <span className="uppercase tracking-wider text-ink-ghost">
                          Role{" "}
                        </span>
                        {detail.role}
                      </div>
                      <div>
                        <span className="uppercase tracking-wider text-ink-ghost">
                          Length{" "}
                        </span>
                        {length > 0 ? `${length.toLocaleString()} chars` : "—"}
                      </div>
                      <div className="truncate">
                        <span className="uppercase tracking-wider text-ink-ghost">
                          Hash{" "}
                        </span>
                        {hash ? (
                          <span title={hash}>{hash.slice(0, 12)}…</span>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[0.6rem] text-ink-ghost">
                    <span className="font-mono uppercase tracking-wider">
                      Why it matters
                    </span>
                    <span className="text-signal">
                      {isPrimary
                        ? "✓ Primary evidence — fetched live during verification"
                        : "✓ Independent corroboration — cross-referenced by the AI"}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <p className="mt-4 font-mono text-[0.6rem] text-ink-ghost">
        Sources were retrieved live during on-chain verification. Per-source
        provenance (status, content hash, length) is stored on-chain with each
        check. Credibility scores reflect established-source quality tiers.
      </p>
    </motion.section>
  );
}
