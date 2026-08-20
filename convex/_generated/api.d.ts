/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as lib_starterAssets from "../lib/starterAssets.js";
import type * as lib_workLibraryTaxonomy from "../lib/workLibraryTaxonomy.js";
import type * as lib_workLibraryValidators from "../lib/workLibraryValidators.js";
import type * as onboarding from "../onboarding.js";
import type * as prompts from "../prompts.js";
import type * as workLibrary from "../workLibrary.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "lib/starterAssets": typeof lib_starterAssets;
  "lib/workLibraryTaxonomy": typeof lib_workLibraryTaxonomy;
  "lib/workLibraryValidators": typeof lib_workLibraryValidators;
  onboarding: typeof onboarding;
  prompts: typeof prompts;
  workLibrary: typeof workLibrary;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
