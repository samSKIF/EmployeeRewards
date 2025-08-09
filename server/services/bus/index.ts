import { BUS_MODE } from '../../config/bus';
import * as Stub from './stub';
import * as KafkaBus from './kafka';

type PublishFn = (topic: string, message: unknown) => Promise<void>;
type RegisterConsumerFn = (topic: string, handler: (msg: any) => Promise<void>) => Promise<void>;
type HealthFn = () => Promise<{ ok: boolean; details?: any }>;
type CloseFn = () => Promise<void>;
type StartFn = () => Promise<void>;

let publish: PublishFn;
let registerConsumer: RegisterConsumerFn;
let health: HealthFn;
let start: StartFn;
let close: CloseFn;

if (BUS_MODE === 'kafka') {
  publish = KafkaBus.publish;
  registerConsumer = KafkaBus.registerConsumer;
  health = KafkaBus.health;
  start = KafkaBus.start;
  close = KafkaBus.close;
} else {
  publish = Stub.publish;
  registerConsumer = Stub.registerConsumer;
  health = Stub.health;
  start = Stub.start;
  close = Stub.close;
}

export { publish, registerConsumer, health, start, close };