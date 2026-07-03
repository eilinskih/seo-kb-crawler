export class DiscoveryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiscoveryValidationError';
  }
}

export class DiscoveryStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DiscoveryStateError';
  }
}
