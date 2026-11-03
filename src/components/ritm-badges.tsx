import { statuses, priorities, type RitmInput } from '@/lib/domain';

export function Status({ value }: { value: RitmInput['status'] }) {
  return (
    <span className={`status s-${statuses.indexOf(value)}`}>
      <i />
      {value}
    </span>
  );
}

export function Priority({ value }: { value: RitmInput['priority'] }) {
  return <span className={`priority p-${priorities.indexOf(value)}`}>▰ {value}</span>;
}
