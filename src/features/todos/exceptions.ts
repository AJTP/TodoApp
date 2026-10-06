import { AppException } from "../../shared/exceptions/app-exception.js";

export class TodoNotFoundError extends AppException {
  constructor(todoId: string) {
    super(`Todo not found with id '${todoId}'`, 404);
  }
}

export class TodoNotOwnedError extends AppException {
  constructor() {
    super(`Todo not owned by the current user`, 403);
  }
}

export class TodoInputDataError extends AppException {
  constructor(field: string) {
    super(`Field ${field} is not valid`);
  }
}
