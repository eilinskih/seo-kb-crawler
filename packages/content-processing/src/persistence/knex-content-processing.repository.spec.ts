import { KnexContentProcessingRepository } from './knex-content-processing.repository';

describe('KnexContentProcessingRepository', () => {
  it('can be constructed with the database boundary', () => {
    const repository = new KnexContentProcessingRepository({} as never);

    expect(repository).toBeInstanceOf(KnexContentProcessingRepository);
  });
});
