import { z } from 'zod';

/**
 * Instance ID parameter — added to every tool to support multi-instance routing.
 * When multiple EasyEDA tabs are connected, the agent must specify which instance to target.
 * With only one instance connected, this is auto-selected and can be omitted.
 */
export const instanceParam = {
	instance_id: z
		.string()
		.optional()
		.describe(
			'Target EasyEDA instance ID (8-char hex). Required when multiple instances are connected. Omit when only one instance is connected (auto-selected). Use list_instances to see connected instances.',
		),
};

/**
 * Generic query parameters for post-processing results from data-returning tools.
 * These are extracted by the extension's ws-client before dispatching to handlers,
 * then applied as post-processing on the result.
 */
export const queryParams = {
	...instanceParam,
	fields: z
		.array(z.string())
		.optional()
		.describe(
			'Project results to only these top-level keys. Response includes _availableFields showing all keys. IMPORTANT: Always specify fields when you know what you need — without it, responses include every property and can be extremely large (100KB+), wasting context.',
		),
	filter: z
		.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]))
		.optional()
		.describe(
			'Keep items matching all conditions (AND). Exact: {key: value}, prefix glob: {key: "R*"}, OR: {key: ["a","b"]}',
		),
	limit: z
		.number()
		.int()
		.positive()
		.optional()
		.describe('Truncate result array to at most N items'),
};

/** Spread into a tool's params object to add query param support. */
export function withQueryParams<T extends Record<string, z.ZodTypeAny>>(
	params: T,
): T & typeof queryParams {
	return { ...params, ...queryParams };
}

/** Add instance_id to a tool's params that doesn't use withQueryParams. */
export function withInstanceParam<T extends Record<string, z.ZodTypeAny>>(
	params: T,
): T & typeof instanceParam {
	return { ...params, ...instanceParam };
}
