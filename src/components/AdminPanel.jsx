import React from 'react';
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  Flame, 
  AlertTriangle, 
  ShieldCheck, 
  Wrench, 
  Sparkles, 
  RotateCcw,
  TrendingUp,
  HeartHandshake
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CIVIC_CATEGORIES, CIVIC_STATUSES } from '../types';

export default function AdminPanel({ 
  civicIssues, 
  lostFoundItems, 
  onUpdateCivicStatus,
  onResetData 
}) {
  const unresolvedCivic = civicIssues.filter(i => i.status !== 'resolved');
  const resolvedCivic = civicIssues.filter(i => i.status === 'resolved');
  const reunitedItems = lostFoundItems.filter(i => i.status === 'reunited');

  const resolutionRate = civicIssues.length > 0 
    ? Math.round((resolvedCivic.length / civicIssues.length) * 100) 
    : 0;

  const reunitedRate = lostFoundItems.length > 0
    ? Math.round((reunitedItems.length / lostFoundItems.length) * 100)
    : 0;

  const handleQuickAdvance = (issue, nextStatus) => {
    if (nextStatus === 'resolved') {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#A7F3D0', '#DDD6FE', '#FED7AA']
      });
    }
    onUpdateCivicStatus(issue.id, nextStatus, `Updated via Ops Dashboard by Facility Lead`);
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-pastel-butter-light/90 via-pastel-lavender-light/80 to-pastel-mint-light/90 border border-stone-200/60 shadow-soft-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/80 border border-stone-200/60 text-xs font-semibold text-brand-dark mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-pastel-butter-dark" />
              <span>Campus Facilities & Ops Headquarters</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-dark">
              Pipeline Management & Insights
            </h1>
            <p className="text-stone-600 text-xs sm:text-sm mt-1">
              Dispatch maintenance crews, update civic resolution milestones, and track reunion metrics.
            </p>
          </div>

          <button
            onClick={onResetData}
            className="self-start sm:self-center px-4 py-2 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-semibold flex items-center space-x-1.5 shadow-soft-sm transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
            <span>Reset Demo Seed Data</span>
          </button>
        </div>
      </div>

      {/* High-Level Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-3xl border border-stone-200/70 shadow-soft-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>Civic Resolution Rate</span>
            <CheckCircle2 className="w-4 h-4 text-pastel-mint-dark" />
          </div>
          <div className="text-3xl font-bold text-brand-dark">{resolutionRate}%</div>
          <div className="text-[11px] text-stone-500">
            {resolvedCivic.length} of {civicIssues.length} issues fixed & verified
          </div>
        </div>

        <div className="bg-surface p-5 rounded-3xl border border-stone-200/70 shadow-soft-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>Lost Item Reunion Rate</span>
            <HeartHandshake className="w-4 h-4 text-pastel-lavender-dark" />
          </div>
          <div className="text-3xl font-bold text-brand-dark">{reunitedRate}%</div>
          <div className="text-[11px] text-stone-500">
            {reunitedItems.length} returned safely to owners
          </div>
        </div>

        <div className="bg-surface p-5 rounded-3xl border border-stone-200/70 shadow-soft-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>Avg. Resolution Turnaround</span>
            <Clock className="w-4 h-4 text-pastel-sky-dark" />
          </div>
          <div className="text-3xl font-bold text-brand-dark">28.4h</div>
          <div className="text-[11px] text-stone-500">Target SLA is &lt; 48 hours</div>
        </div>

        <div className="bg-surface p-5 rounded-3xl border border-stone-200/70 shadow-soft-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>Open High-Urgency Tasks</span>
            <Flame className="w-4 h-4 text-pastel-peach-dark" />
          </div>
          <div className="text-3xl font-bold text-brand-dark">
            {unresolvedCivic.filter(i => i.urgencyUpvotes >= 20).length}
          </div>
          <div className="text-[11px] text-stone-500">Prioritized by community votes</div>
        </div>
      </div>

      {/* Active Pipeline Work Queue */}
      <div className="bg-surface rounded-3xl border border-stone-200/70 shadow-soft-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-brand-dark flex items-center space-x-2">
            <Wrench className="w-4 h-4 text-brand-primary" />
            <span>Facility Work Queue & Pipeline Actions</span>
          </h2>
          <span className="text-xs text-stone-500">
            {unresolvedCivic.length} active assignments
          </span>
        </div>

        {unresolvedCivic.length === 0 ? (
          <div className="text-center py-8 text-xs text-stone-400">
            🎉 All reported civic issues are resolved and closed!
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {unresolvedCivic.map((issue) => (
              <div
                key={issue.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-pastel-peach-light text-pastel-peach-dark uppercase">
                      {issue.category.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-semibold text-stone-500">
                      📍 {issue.location?.name}
                    </span>
                    <span className="text-xs text-pastel-peach-dark font-bold flex items-center space-x-0.5">
                      <Flame className="w-3 h-3 fill-current" />
                      <span>{issue.urgencyUpvotes} Upvotes</span>
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-brand-dark">{issue.title}</h3>
                  <p className="text-xs text-stone-500 line-clamp-1">{issue.description}</p>
                </div>

                {/* Status Advancement Quick Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <span className="text-[11px] text-stone-400 mr-1">Move to:</span>

                  {issue.status === 'reported' && (
                    <button
                      onClick={() => handleQuickAdvance(issue, 'acknowledged')}
                      className="px-3 py-1.5 rounded-xl bg-pastel-lavender-light text-pastel-lavender-dark border border-pastel-lavender-border text-xs font-semibold hover:bg-pastel-lavender transition-all"
                    >
                      Acknowledge
                    </button>
                  )}

                  {(issue.status === 'reported' || issue.status === 'acknowledged') && (
                    <button
                      onClick={() => handleQuickAdvance(issue, 'in_progress')}
                      className="px-3 py-1.5 rounded-xl bg-pastel-sky-light text-pastel-sky-dark border border-pastel-sky-border text-xs font-semibold hover:bg-pastel-sky transition-all"
                    >
                      Dispatch Crew
                    </button>
                  )}

                  <button
                    onClick={() => handleQuickAdvance(issue, 'resolved')}
                    className="px-3.5 py-1.5 rounded-xl bg-pastel-mint text-pastel-mint-dark border border-pastel-mint-border text-xs font-bold hover:bg-pastel-mint-border transition-all flex items-center space-x-1 shadow-soft-sm"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Mark Resolved</span>
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
