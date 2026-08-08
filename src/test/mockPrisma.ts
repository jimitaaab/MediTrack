export type PrismaMockDelegate = {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
  aggregate: jest.Mock;
  groupBy: jest.Mock;
};

export type PrismaMock = {
  user: PrismaMockDelegate;
  patient: PrismaMockDelegate;
  doctor: PrismaMockDelegate;
  doctorAssistant: PrismaMockDelegate;
  doctorSchedule: PrismaMockDelegate;
  appointment: PrismaMockDelegate;
  queue: PrismaMockDelegate;
  review: PrismaMockDelegate;
  notification: PrismaMockDelegate;
  chatbotLog: PrismaMockDelegate;
  specialization: PrismaMockDelegate;
  admin: PrismaMockDelegate;
  $transaction: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
};

const makeDelegate = (): PrismaMockDelegate => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
  groupBy: jest.fn(),
});

export const createPrismaMock = (): PrismaMock => ({
  user: makeDelegate(),
  patient: makeDelegate(),
  doctor: makeDelegate(),
  doctorAssistant: makeDelegate(),
  doctorSchedule: makeDelegate(),
  appointment: makeDelegate(),
  queue: makeDelegate(),
  review: makeDelegate(),
  notification: makeDelegate(),
  chatbotLog: makeDelegate(),
  specialization: makeDelegate(),
  admin: makeDelegate(),
  $transaction: jest.fn(),
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
});