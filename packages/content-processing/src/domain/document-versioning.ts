export interface DocumentVersionCandidate {
  id: string;
  contentHash: string | null;
  extractorVersion: string;
}

export function reusableContentVersion(
  versions: DocumentVersionCandidate[],
  options: {
    contentHash: string | null;
    extractorVersion: string;
  },
): DocumentVersionCandidate | null {
  if (!options.contentHash) {
    return null;
  }
  return (
    versions.find(
      (version) =>
        version.contentHash === options.contentHash &&
        version.extractorVersion === options.extractorVersion,
    ) ?? null
  );
}
