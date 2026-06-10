export class TopicValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = TopicValidationError.name;
  }
}

export class TopicStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = TopicStateError.name;
  }
}

export class TopicNotFoundError extends Error {
  constructor(id: string) {
    super(`Topic ${id} was not found`);
    this.name = TopicNotFoundError.name;
  }
}

export class TopicConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = TopicConflictError.name;
  }
}
