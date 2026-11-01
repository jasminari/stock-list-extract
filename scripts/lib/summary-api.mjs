export const DEFAULT_SUMMARY_MODEL = 'nvidia/nemotron-3.5-lightning:free';
const FALLBACK_MODEL = 'google/gemma-4-26b-a4b-it:free';
/** Retry unavailable models without silently switching to a paid model. */
export async function summaryFetch(url, options, fetcher = fetch) {
  const body = JSON.parse(options.body);
  const models = [...new Set([body.model, DEFAULT_SUMMARY_MODEL, FALLBACK_MODEL].filter(Boolean))];
  let response;
  for (const model of models) {
    response = await fetcher(url, {...options, body: JSON.stringify({...body, model}), signal: AbortSignal.timeout(60000)});
    if (response.ok || ![404,429,502,503].includes(response.status)) return response;
  }
  return response;
}
