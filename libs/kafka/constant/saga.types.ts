/**
 * Saga Pattern Types and Enums
 * Used for distributed transaction coordination across microservices
 */

export enum SagaStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
  FAILED = 'FAILED',
}

export enum SagaStepStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  COMPENSATED = 'COMPENSATED',
}

export interface SagaStep {
  stepId: string;
  service: string;
  action: string;
  status: SagaStepStatus;
  data?: any;
  error?: string;
  timestamp: string;
}

export interface SagaContext {
  sagaId: string;
  status: SagaStatus;
  steps: SagaStep[];
  payload: any;
  createdAt: string;
  updatedAt: string;
}

export interface SagaEvent {
  sagaId: string;
  eventType: string;
  stepId: string;
  service: string;
  status: SagaStepStatus;
  data?: any;
  error?: string;
  timestamp: string;
}
