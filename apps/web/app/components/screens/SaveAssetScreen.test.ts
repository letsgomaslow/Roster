import {
  Children,
  isValidElement,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createDraft: vi.fn(async () => ({ assetId: 'asset-1', versionNumber: 1 })),
  push: vi.fn(),
  stateCall: 0,
}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useMemo: <Value,>(factory: () => Value) => factory(),
    useState: <Value,>(initial: Value) => {
      mocks.stateCall += 1;
      const value = mocks.stateCall === 9 ? true : initial;
      return [value, vi.fn()] as const;
    },
  };
});

vi.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useMutation: () => mocks.createDraft,
  useQuery: () => [],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/app/components/work-library/WorkspaceContext', () => ({
  useWorkspace: () => ({
    name: 'Maslow AI',
    role: 'contributor',
    status: 'ready',
    workspaceId: 'workspace-1',
  }),
}));

import { SaveAssetScreen } from './SaveAssetScreen';

type ElementProps = { children?: ReactNode; disabled?: boolean; onSubmit?: unknown };

function findHostElement(node: ReactNode, type: string): ReactElement<ElementProps> | undefined {
  if (!isValidElement(node)) return undefined;
  const element = node as ReactElement<ElementProps>;
  if (element.type === type) return element;
  for (const child of Children.toArray(element.props.children)) {
    const match = findHostElement(child, type);
    if (match) return match;
  }
  return undefined;
}

beforeEach(() => {
  mocks.createDraft.mockClear();
  mocks.push.mockClear();
  mocks.stateCall = 0;
});

it('does not submit a draft while imported text is still being extracted', async () => {
  const tree = SaveAssetScreen();
  const form = findHostElement(tree, 'form');
  const saveButton = findHostElement(tree, 'button');
  const preventDefault = vi.fn();

  expect(saveButton?.props.disabled).toBe(true);
  expect(form?.props.onSubmit).toBeTypeOf('function');
  await (form?.props.onSubmit as (event: FormEvent<HTMLFormElement>) => Promise<void>)({
    preventDefault,
  } as unknown as FormEvent<HTMLFormElement>);

  expect(preventDefault).toHaveBeenCalledOnce();
  expect(mocks.createDraft).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
});
