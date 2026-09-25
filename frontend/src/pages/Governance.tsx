import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Landmark,
  Check,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Plus,
  Vote,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { verificationId } from "@/lib/verification";
import { VERDICT_DOT_CLASSES } from "@/components/verdictStyles";
import {
  getRecentProposals,
  getGovernanceStats,
  submitProposal,
  voteOnProposal,
  executeProposal,
  GOVERNANCE_ADDRESS,
} from "@/lib/governance";
import type { GovernanceProposal } from "@/lib/types";

const STATUS_CONFIG: Record<
  string,
  { icon: React.ElementType; label: string; cls: string }
> = {
  VERIFIED: {
    icon: Check,
    label: "Evidence verified",
    cls: "border-signal/40 bg-signal/10 text-signal",
  },
  PENDING: {
    icon: AlertTriangle,
    label: "Awaiting verification",
    cls: "border-pending/40 bg-pending/10 text-pending",
  },
  DISPUTED: {
    icon: AlertTriangle,
    label: "Evidence disputed",
    cls: "border-warn/40 bg-warn/10 text-warn",
  },
  UNVERIFIABLE: {
    icon: AlertTriangle,
    label: "Unverifiable",
    cls: "border-line bg-surface-2 text-ink-ghost",
  },
  EXECUTED: {
    icon: CheckCircle2,
    label: "Executed",
    cls: "border-signal/40 bg-signal/10 text-signal",
  },
};

function ProposalCard({
  proposal,
  reduceMotion,
  delay,
}: {
  proposal: GovernanceProposal;
  reduceMotion: boolean;
  delay: (ms: number) => number;
}) {
  const queryClient = useQueryClient();
  const [showVote, setShowVote] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["gov-proposals"] });
    queryClient.invalidateQueries({ queryKey: ["gov-stats"] });
  };

  const voteMutation = useMutation({
    mutationFn: (support: boolean) => voteOnProposal(proposal.id, support),
    onSuccess: () => {
      invalidate();
      setShowVote(false);
    },
    onError: (err: Error) => {
      setVoteError(err.message);
    },
  });

  const executeMutation = useMutation({
    mutationFn: () => executeProposal(proposal.id),
    onSuccess: () => {
      invalidate();
      setExecError(null);
    },
    onError: (err: Error) => {
      setExecError(err.message);
    },
  });

  const statusCfg = STATUS_CONFIG[proposal.status] ?? STATUS_CONFIG.PENDING;
  const StatusIcon = statusCfg.icon;
  const dotClass = VERDICT_DOT_CLASSES[proposal.truthlock_verdict] ?? "bg-mute";
  const canVote =
    proposal.status === "VERIFIED" || proposal.status === "DISPUTED";
  const canExecute = proposal.status === "VERIFIED";
  const checkId = proposal.truthlock_check_id;
  const hasVoting = showVote && canVote;
  const modeLabel =
    proposal.truthlock_mode === "SOURCE_VERIFIED"
      ? "Source-verified"
      : "Knowledge-based";

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay(300), duration: 0.35 }}
      className="rounded-xl border border-line bg-surface p-6 shadow-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.6rem] font-bold tracking-wider text-ink-ghost">
              {proposal.id.slice(0, 12)}…
            </span>
            <span
              className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[0.55rem] font-bold ${statusCfg.cls}`}
            >
              <StatusIcon size={10} />
              {statusCfg.label}
            </span>
          </div>
          <h3 className="mt-2 font-display text-base font-semibold text-ink">
            {proposal.title}
          </h3>
          {proposal.description && (
            <p className="mt-1 max-w-[600px] font-mono text-xs leading-relaxed text-ink-dim">
              {proposal.description}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
            <span className="font-display text-sm font-bold text-ink">
              {proposal.truthlock_verdict}
            </span>
          </div>
          <span className="font-mono text-xs text-ink-dim">
            {proposal.truthlock_confidence}%
          </span>
          <span
            className={`rounded border px-1.5 py-0.5 font-mono text-[0.5rem] font-bold tracking-wider ${
              proposal.truthlock_mode === "SOURCE_VERIFIED"
                ? "border-signal/40 text-signal"
                : "border-line text-ink-ghost"
            }`}
          >
            {modeLabel}
          </span>
        </div>
      </div>

      {/* Verification details */}
      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line-dim pt-4">
        <span className="flex items-center gap-1.5 font-mono text-[0.65rem] text-ink-dim">
          <ShieldCheck size={11} className="text-signal" />
          {proposal.votes_for + proposal.votes_against} vote
          {proposal.votes_for + proposal.votes_against !== 1 ? "s" : ""}
        </span>
        <span className="font-mono text-[0.65rem] text-ink-dim">
          {proposal.votes_for} for · {proposal.votes_against} against
        </span>
        {checkId && (
          <Link
            to={`/result/${checkId}`}
            className="flex items-center gap-1 font-mono text-[0.65rem] text-signal hover:underline"
          >
            Inspect evidence
            <ExternalLink size={9} />
          </Link>
        )}
        <span className="ml-auto font-mono text-[0.55rem] tracking-widest text-ink-ghost">
          {checkId ? verificationId(checkId) : "—"}
        </span>
      </div>

      {/* Vote / execute section */}
      {(canVote || canExecute) && (
        <div className="mt-4 border-t border-line-dim pt-4 space-y-3">
          {canExecute && (
            <div>
              <button
                type="button"
                onClick={() => executeMutation.mutate()}
                disabled={executeMutation.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-signal/40 bg-signal/5 px-4 py-2.5 font-display text-xs font-semibold text-signal transition-colors hover:bg-signal/10 disabled:opacity-50"
              >
                {executeMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                Execute proposal
              </button>
              <p className="mt-1.5 text-center font-mono text-[0.55rem] text-ink-ghost">
                Requires quorum (≥50% members), 2/3 supermajority, confidence
                ≥70%, and SOURCE_VERIFIED mode
              </p>
              {execError && (
                <p className="flex items-center justify-center gap-1 font-mono text-xs text-danger">
                  <AlertTriangle size={11} /> {execError}
                </p>
              )}
            </div>
          )}
          {canVote && (
            !showVote ? (
              <button
                type="button"
                onClick={() => setShowVote(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-signal/30 bg-signal/5 px-4 py-2.5 font-display text-xs font-semibold text-signal transition-colors hover:border-signal/50 hover:bg-signal/10"
              >
                <Vote size={13} />
                Cast your vote
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => voteMutation.mutate(true)}
                    disabled={voteMutation.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-signal/40 bg-signal/5 px-4 py-2.5 font-display text-xs font-semibold text-signal transition-colors hover:bg-signal/10 disabled:opacity-50"
                  >
                    {voteMutation.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    Vote FOR
                  </button>
                  <button
                    type="button"
                    onClick={() => voteMutation.mutate(false)}
                    disabled={voteMutation.isPending}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-danger/40 bg-danger/5 px-4 py-2.5 font-display text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                  >
                    {voteMutation.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <X size={13} />
                    )}
                    Vote AGAINST
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowVote(false);
                    setVoteError(null);
                  }}
                  className="w-full text-center font-mono text-[0.6rem] text-ink-ghost hover:text-ink-dim"
                >
                  Cancel
                </button>
                {voteError && (
                  <p className="flex items-center gap-1 font-mono text-xs text-danger">
                    <AlertTriangle size={11} /> {voteError}
                  </p>
                )}
              </div>
            )
          )}
        </div>
      )}
    </motion.div>
  );
}

function SubmitProposalForm() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [checkId, setCheckId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const titleValid = title.trim().length >= 5 && title.length <= 200;
  const checkIdValid = checkId.trim().length > 0;
  const formValid = titleValid && checkIdValid;

  const submitMutation = useMutation({
    mutationFn: () =>
      submitProposal(title.trim(), description.trim(), checkId.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gov-proposals"] });
      queryClient.invalidateQueries({ queryKey: ["gov-stats"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setCheckId("");
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  if (!GOVERNANCE_ADDRESS) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center shadow-card">
        <p className="text-sm text-ink-dim">
          Governance contract not deployed yet. Set{" "}
          <code className="font-mono text-xs text-signal">
            VITE_GOVERNANCE_ADDRESS
          </code>{" "}
          in your .env after deploying{" "}
          <code className="font-mono text-xs text-signal">
            governance_dao.py
          </code>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-signal/30 bg-signal/[0.02] px-4 py-4 font-display text-sm font-semibold text-signal transition-colors hover:border-signal/50 hover:bg-signal/5"
        >
          <Plus size={16} />
          Submit a proposal
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-signal/30 bg-surface p-6 shadow-card"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-ink">
              New proposal
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-ink-ghost hover:text-ink"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label mb-1.5 block">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Proposal title (5–200 chars)"
                maxLength={200}
                className="w-full"
              />
            </div>
            <div>
              <label className="label mb-1.5 block">
                Description{" "}
                <span className="normal-case text-ink-ghost">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details about this proposal..."
                maxLength={1000}
                className="w-full"
              />
            </div>
            <div>
              <label className="label mb-1.5 block">
                TruthLock Verification ID
              </label>
              <input
                type="text"
                value={checkId}
                onChange={(e) => setCheckId(e.target.value)}
                placeholder="The check ID from a TruthLock verification"
                className="w-full"
              />
              <p className="mt-1 font-mono text-[0.6rem] text-ink-ghost">
                The contract reads TruthLock.get_check() to verify the claim's
                verdict on-chain.
              </p>
            </div>
          </div>

          {error && (
            <p className="mt-3 flex items-center gap-1 font-mono text-xs text-danger">
              <AlertTriangle size={11} /> {error}
            </p>
          )}

          <button
            type="button"
            onClick={() => submitMutation.mutate()}
            disabled={!formValid || submitMutation.isPending}
            className="btn-primary mt-4 w-full disabled:opacity-40"
          >
            {submitMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Submitting on-chain...
              </span>
            ) : (
              "Submit proposal"
            )}
          </button>
        </motion.div>
      )}
    </div>
  );
}

export default function Governance() {
  const reduceMotion = useReducedMotion() ?? false;
  const delay = (ms: number) => (reduceMotion ? 0 : ms);

  const { data: proposals, isLoading } = useQuery({
    queryKey: ["gov-proposals"],
    queryFn: () => getRecentProposals(20),
    retry: false,
    staleTime: 15_000,
  });

  const { data: stats } = useQuery({
    queryKey: ["gov-stats"],
    queryFn: getGovernanceStats,
    retry: false,
    staleTime: 30_000,
  });

  const hasContract = !!GOVERNANCE_ADDRESS;

  return (
    <div className="mx-auto max-w-page px-5 pb-24">
      {/* Header */}
      <section className="pt-16 pb-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-signal/20 bg-signal/5 px-4 py-1.5">
            <Landmark size={12} className="text-signal" />
            <span className="font-mono text-xs text-signal">
              Governance verification
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            DAO <span className="text-gradient-signal">proposals</span>
          </h1>
          <p className="mt-3 max-w-lg text-ink-dim">
            Every proposal backed by an on-chain TruthLock verification. The
            GovernanceDAO contract reads TruthLock.get_check() to verify each
            claim&apos;s verdict before proposals can receive votes.
          </p>
        </motion.div>
      </section>

      {/* Contract details */}
      {hasContract && stats && (
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay(0.05), duration: 0.45 }}
          className="mb-6 rounded-xl border border-line bg-surface p-4 shadow-card"
        >
          <div className="flex flex-wrap items-center gap-6 font-mono text-xs text-ink-dim">
            <div>
              <span className="text-ink-ghost">Proposals </span>
              <span className="font-semibold text-ink">
                {stats.total_proposals}
              </span>
            </div>
            <div>
              <span className="text-ink-ghost">Members </span>
              <span className="font-semibold text-ink">
                {stats.member_count}
              </span>
            </div>
            <div>
              <span className="text-ink-ghost">Min confidence </span>
              <span className="font-semibold text-ink">
                {stats.min_confidence}%
              </span>
            </div>
            <div>
              <span className="text-ink-ghost">Supermajority </span>
              <span className="font-semibold text-ink">
                {stats.supermajority ?? "2/3"}
              </span>
            </div>
          </div>
        </motion.section>
      )}

      {/* How it works */}
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(0.1), duration: 0.45 }}
        className="mb-6 rounded-xl border border-line bg-surface p-6 shadow-card"
      >
        <h2 className="mb-4 font-display text-sm font-semibold tracking-wide text-ink">
          How governance verification works
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[
            {
              step: "01",
              label: "Proposal submitted",
              detail: "With a TruthLock check ID",
            },
            {
              step: "02",
              label: "TruthLock reads verdict",
              detail: "get_check() called on-chain",
            },
            {
              step: "03",
              label: "Members vote",
              detail: "FOR or AGAINST the proposal",
            },
            {
              step: "04",
              label: "Execute if verified",
              detail: "Quorum + 2/3 + SOURCE_VERIFIED + conf ≥70",
            },
          ].map((s, i) => (
            <div key={s.step} className="text-center">
              <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface-2 font-mono text-xs font-bold text-ink-ghost">
                {s.step}
              </span>
              <p className="font-display text-xs font-semibold text-ink">
                {s.label}
              </p>
              <p className="mt-0.5 font-mono text-[0.6rem] text-ink-ghost">
                {s.detail}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Submit proposal */}
      <SubmitProposalForm />

      {/* Proposals list */}
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(0.2), duration: 0.45 }}
      >
        <h2 className="mb-4 font-display text-sm font-semibold tracking-wide text-ink">
          Proposals
        </h2>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-surface-2" />
            ))}
          </div>
        )}

        {!isLoading && proposals && proposals.length === 0 && (
          <div className="rounded-xl border border-line bg-surface p-10 text-center shadow-card">
            <Landmark size={24} className="mx-auto text-ink-ghost" />
            <p className="mt-3 text-sm text-ink-dim">No proposals yet.</p>
            <p className="mt-1 font-mono text-xs text-ink-ghost">
              Submit the first proposal to see it verified on-chain.
            </p>
          </div>
        )}

        {!isLoading && proposals && proposals.length > 0 && (
          <div className="space-y-4">
            {proposals.map((p, i) => (
              <ProposalCard
                key={p.id}
                proposal={p}
                reduceMotion={reduceMotion}
                delay={(ms) => delay(ms + i * 80)}
              />
            ))}
          </div>
        )}
      </motion.section>

      {/* CTA */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay(0.6), duration: 0.45 }}
        className="mt-8 rounded-xl border border-line bg-surface p-6 text-center shadow-card"
      >
        <p className="text-sm text-ink-dim">
          First, verify a claim with TruthLock to get a check ID.
        </p>
        <Link
          to="/"
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-signal/40 bg-signal-dim px-5 py-2.5 font-display text-xs font-semibold text-signal transition-colors hover:border-signal/60"
        >
          Verify a claim
          <ExternalLink size={11} />
        </Link>
      </motion.div>
    </div>
  );
}
