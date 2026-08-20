import {
  Children,
  isValidElement,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assetResult: null as unknown,
  downloadClick: vi.fn(),
  downloadedBlob: null as Blob | null,
  taxonomyResult: [] as unknown[],
  updateMetadata: vi.fn(async () => ({ updated: true as const })),
}));

const taxonomyTerms = [
  {
    key: 'client-delivery',
    kind: 'team',
    label: 'Client delivery',
    sortOrder: 0,
    status: 'active',
    termId: 'term-team-1',
  },
  {
    key: 'create-proposal',
    kind: 'work_type',
    label: 'Create a proposal',
    sortOrder: 0,
    status: 'active',
    termId: 'term-work-1',
  },
];

const asset = {
  approvals: [],
  assetId: 'asset-1',
  body: 'Draft a proposal for {{client_name}}.',
  canEdit: true,
  comments: [],
  inputs: [],
  isFavorite: false,
  jobKey: 'create-proposal',
  kind: 'prompt' as const,
  lastVerifiedAt: null,
  ownerUserId: 'user-1',
  pendingVersion: null,
  purpose: 'Turn discovery notes into a client-ready proposal.',
  reviewState: 'draft',
  teamKey: 'client-delivery',
  title: 'Proposal drafter',
  updatedAt: 1_700_000_000_000,
  variants: [],
  versionNumber: 1,
  versions: [{ body: 'Draft a proposal for {{client_name}}.', versionNumber: 1 }],
  visibility: 'private',
};

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useMemo: <Value,>(factory: () => Value) => factory(),
    useRef: <Value,>(initial: Value) => ({ current: initial }),
    useState: <Value,>(initial: Value) => [initial, vi.fn()] as const,
  };
});

vi.mock('convex/react', async () => {
  const { getFunctionName } = await import('convex/server');
  return {
    useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
    useMutation: (mutation: Parameters<typeof getFunctionName>[0]) =>
      getFunctionName(mutation) === 'workLibrary:updatePrivateDraftMetadata'
        ? mocks.updateMetadata
        : vi.fn(async () => ({})),
    useQuery: (query: Parameters<typeof getFunctionName>[0]) =>
      getFunctionName(query) === 'workLibrary:listTaxonomyTerms'
        ? mocks.taxonomyResult
        : mocks.assetResult,
  };
});

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/app/components/work-library/WorkspaceContext', () => ({
  useWorkspace: () => ({
    name: 'Maslow AI',
    role: 'contributor',
    status: 'ready',
    workspaceId: 'workspace-1',
  }),
}));

import { AssetDetailScreen, friendlyAssetDetailError } from './AssetDetailScreen';

type ElementProps = {
  'aria-label'?: string;
  children?: ReactNode;
  onClick?: unknown;
  onSubmit?: unknown;
};

function findElement(
  node: ReactNode,
  predicate: (element: ReactElement<ElementProps>) => boolean,
): ReactElement<ElementProps> | undefined {
  if (!isValidElement(node)) return undefined;
  const element = node as ReactElement<ElementProps>;
  if (predicate(element)) return element;
  for (const child of Children.toArray(element.props.children)) {
    const match = findElement(child, predicate);
    if (match) return match;
  }
  return undefined;
}

beforeEach(() => {
  mocks.assetResult = asset;
  mocks.downloadClick.mockClear();
  mocks.downloadedBlob = null;
  mocks.taxonomyResult = taxonomyTerms;
  mocks.updateMetadata.mockClear();
  vi.stubGlobal('URL', {
    createObjectURL: (blob: Blob) => {
      mocks.downloadedBlob = blob;
      return 'blob:asset-export';
    },
    revokeObjectURL: vi.fn(),
  });
  vi.stubGlobal('document', {
    createElement: () => ({
      click: mocks.downloadClick,
      download: '',
      href: '',
    }),
  });
  vi.stubGlobal(
    'FormData',
    class {
      get(name: string) {
        const values: Record<string, string> = {
          jobKey: '',
          purpose: asset.purpose,
          teamKey: '',
          title: asset.title,
        };
        return values[name] ?? null;
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it('submits explicit empty taxonomy values when No selection clears prior choices', async () => {
  const tree = AssetDetailScreen({ assetId: 'asset-1' });
  const form = findElement(
    tree,
    (element) => element.type === 'form' && element.props['aria-label'] === 'Organize this draft',
  );
  const preventDefault = vi.fn();

  expect(form?.props.onSubmit).toBeTypeOf('function');
  await (form?.props.onSubmit as (event: FormEvent<HTMLFormElement>) => Promise<void>)({
    currentTarget: {},
    preventDefault,
  } as unknown as FormEvent<HTMLFormElement>);

  expect(preventDefault).toHaveBeenCalledOnce();
  expect(mocks.updateMetadata).toHaveBeenCalledWith({
    assetId: 'asset-1',
    jobKey: '',
    teamKey: '',
  });
});

it('maps raw Convex metadata failures to fixed recovery copy', () => {
  const result = friendlyAssetDetailError(
    new Error(
      'Uncaught Error: [CONVEX M(workLibrary:updatePrivateDraftMetadata)] Request ID: secret at convex/workLibrary.ts:578',
    ),
  );

  expect(result).toBe(
    'Roster could not save these organization details. Your changes are still here. Try again.',
  );
  expect(result).not.toMatch(/convex|updatePrivateDraftMetadata|request id|workLibrary\.ts/i);
});

it('omits unresolved taxonomy labels from the downloaded Markdown export', async () => {
  mocks.taxonomyResult = [];
  const tree = AssetDetailScreen({ assetId: 'asset-1' });
  const markdownButton = findElement(
    tree,
    (element) => element.type === 'button' && element.props.children === 'Markdown',
  );

  expect(markdownButton?.props.onClick).toBeTypeOf('function');
  (markdownButton?.props.onClick as () => void)();

  expect(mocks.downloadClick).toHaveBeenCalledOnce();
  expect(mocks.downloadedBlob).not.toBeNull();
  const markdown = await mocks.downloadedBlob?.text();
  expect(markdown).not.toContain('**Team:**');
  expect(markdown).not.toContain('**Work type:**');
  expect(markdown).not.toMatch(/client-delivery|create-proposal/i);
});
