export class CrawlerValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrawlerValidationError';
  }
}

export class CrawlerAdapterSelectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CrawlerAdapterSelectionError';
  }
}
