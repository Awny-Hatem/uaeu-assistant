// Shared grading for FR3/FR4 evaluations: every graded turn is assessed with
// the same rubric as the main QA runners; a scenario takes its worst turn.
import { assess } from './run-qa-audit.mjs';
import { applySourceEquivalences } from './source-equivalences.mjs';

const rank = { correct: 0, partial: 1, incorrect: 2 };
/** Grade every graded turn on its own; the scenario takes the worst turn result. */
export function gradeScenario(c, conversation) {
  const grades = c.turnGrades ?? conversation.map((_, i) => (i === conversation.length - 1 ? { checks: c.checks, sources: c.sources, needsCitation: c.needsCitation } : null));
  const turns = grades.map((g, i) => {
    if (!g) return null;
    const spec = { ...c, checks: g.checks, sources: g.sources ?? [], needsCitation: g.needsCitation, forbidden: [...(c.forbidden ?? []), ...(g.forbidden ?? [])] };
    const upto = conversation.slice(0, i + 1);
    return { turn: i + 1, basis: g.basis, ...applySourceEquivalences(assess(spec, upto), spec, upto) };
  });
  const graded = turns.filter(Boolean);
  const worst = graded.reduce((w, t) => (rank[t.result] > rank[w] ? t.result : w), 'correct');
  return { result: worst, turns, gradedTurns: graded.length, missing: graded.flatMap((t) => t.missing.map((m) => `turn ${t.turn}: ${m}`)), sourcePass: graded.every((t) => t.sourcePass), unrelated: graded.flatMap((t) => t.unrelated) };
}
