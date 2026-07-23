import {
  MediaAssetObservation,
  MediaPolicyDecision,
  MediaResearchPolicy,
} from './domain/research-scheduling-types';

export class MediaResearchPolicyService {
  decide(
    policy: MediaResearchPolicy,
    asset: MediaAssetObservation,
    consumerRequested = false,
  ): MediaPolicyDecision {
    if (policy.allowedMediaTypes && !policy.allowedMediaTypes.includes(asset.mediaType)) {
      return {
        assetId: asset.assetId,
        storageStatus: 'metadata_only',
        shouldDownload: false,
        reason: 'Media type is not allowed by Topic media policy.',
      };
    }

    if (policy.mode === 'full_archive') {
      return {
        assetId: asset.assetId,
        storageStatus: 'archive_allowed',
        shouldDownload: true,
        reason: 'Full archive media policy allows binary download.',
      };
    }

    if (
      policy.mode === 'selected' &&
      (consumerRequested || (asset.mediaPotential ?? 0) >= 0.7)
    ) {
      return {
        assetId: asset.assetId,
        storageStatus: 'selected_for_download',
        shouldDownload: true,
        reason: 'Selected media policy allows this asset.',
      };
    }

    return {
      assetId: asset.assetId,
      storageStatus: 'metadata_only',
      shouldDownload: false,
      reason: 'Metadata-only media policy avoids binary download.',
    };
  }
}
