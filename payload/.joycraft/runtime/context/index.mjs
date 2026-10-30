import { findCandidates } from './search.mjs';

// An optional model ranker orders the candidates when it is installed; without
// it, every candidate stays available in local-search order.
async function loadRanker() {
  try { return (await import('./rank-model.mjs')).rankReferences; }
  catch (error) { if (error?.code === 'ERR_MODULE_NOT_FOUND') return null; throw error; }
}

/** Rank all selected references. Scores are reading advice, never a scope boundary. */
export async function rankContext(request, options = {}) {
  const found = await findCandidates(request, options);
  const references = found.candidates.map((candidate, index) => ({
    id: `c${index + 1}`, ...candidate, relevance: null, provenance: 'local-search', batch: null,
  }));
  const rank = options.enabled === false ? null : options.rank ?? await loadRanker();
  const reason = options.enabled === false ? 'scoring-disabled' : 'ranker-not-installed';
  const ranked = rank ? await rank(references, request, options)
    : { batches: [], unranked: references.map(({ path }) => ({ path, reason })), failed: null, provenance: 'local-search' };
  const { batches, unranked, failed } = ranked;
  references.sort((a, b) => (b.relevance ?? -1) - (a.relevance ?? -1) || b.localScore - a.localScore || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return { schemaVersion: 1, query: request.query,
    provenance: failed ? 'local-search-fallback' : rank && references.length ? ranked.provenance : 'local-search',
    status: failed ? 'incomplete-provider-ranking' : !rank ? 'local-search-only' : references.length ? 'ranked-selected-candidates' : 'no-local-candidates',
    fallbackReason: failed,
    discovery: found.discovery, candidateCount: references.length, scoredCount: rank ? references.filter(item => item.provenance === ranked.provenance).length : 0,
    references, omitted: found.omitted, unreadable: found.unreadable, unranked, batches,
    limitation: 'Relevance scores are advice, not calibrated correctness or an exhaustive project search. Hashes identify the bytes read; open the source before relying on or editing it.' };
}
