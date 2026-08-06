import { OperatorConsoleApiClient } from './operator-console-api.client';
import { OperatorConsoleController } from './operator-console.controller';

describe('OperatorConsoleController', () => {
  it('passes external entity accept decisions to the API client', async () => {
    const apiClient = {
      acceptExternalEntity: jest.fn(),
    } as unknown as OperatorConsoleApiClient;
    const controller = new OperatorConsoleController({} as never, apiClient);

    await controller.acceptExternalEntity({
      attemptId: 'pack-1',
      subjectType: 'external_id',
      providerKey: 'google_knowledge_graph',
      externalId: 'kg:/m/test',
      externalIdType: 'google_kg_id',
      reviewedBy: 'operator',
      note: 'Accepted.',
    });

    expect(apiClient.acceptExternalEntity).toHaveBeenCalledWith({
      attemptId: 'pack-1',
      subjectType: 'external_id',
      providerKey: 'google_knowledge_graph',
      externalId: 'kg:/m/test',
      externalIdType: 'google_kg_id',
      candidateName: null,
      reviewedBy: 'operator',
      note: 'Accepted.',
    });
  });

  it('passes candidate reject decisions to the API client', async () => {
    const apiClient = {
      rejectExternalEntity: jest.fn(),
    } as unknown as OperatorConsoleApiClient;
    const controller = new OperatorConsoleController({} as never, apiClient);

    await controller.rejectExternalEntity({
      attemptId: 'pack-1',
      subjectType: 'candidate',
      providerKey: 'google_knowledge_graph',
      candidateName: 'Laser Hair Removal',
    });

    expect(apiClient.rejectExternalEntity).toHaveBeenCalledWith({
      attemptId: 'pack-1',
      subjectType: 'candidate',
      providerKey: 'google_knowledge_graph',
      externalId: null,
      externalIdType: null,
      candidateName: 'Laser Hair Removal',
      reviewedBy: 'operator-console',
      note: null,
    });
  });
});
