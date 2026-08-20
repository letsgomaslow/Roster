declare const manifest: {
  packageName: string;
  version: string;
  contractVersion: string;
  logoPolicy: "immutable-designer-master";
  logoAssets: Array<{
    id: string;
    path: string;
    sourceFilename: string;
    role: "complete-lockup" | "symbol" | "square-symbol";
    use: string;
    width: number;
    height: number;
    sha256: string;
  }>;
  sourceHashes: Record<string, string>;
  assetHashes: Record<string, string>;
};
export default manifest;
