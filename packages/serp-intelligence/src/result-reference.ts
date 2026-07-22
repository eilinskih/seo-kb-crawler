import {
  SerpPageEvidence,
  SerpResult,
  SerpResultReference,
} from './domain/serp-intelligence-types';
import { domainFromUrl } from './normalize-serp-text';

export function resultReference(
  page: SerpPageEvidence,
  result?: SerpResult,
): SerpResultReference {
  return {
    resultId: page.resultId,
    position: result?.position ?? 0,
    url: result?.url ?? page.url,
    domain: result?.domain ?? page.domain ?? domainFromUrl(page.url),
    title: result?.title ?? page.title ?? null,
  };
}
