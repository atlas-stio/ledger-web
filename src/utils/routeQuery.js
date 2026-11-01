const isNil = (v) => v === null || v === undefined;

/**
 * Merge params into the route query (keeps all other existing query params).
 * @param {import('vue-router').Router} router
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route
 * @param {Object} params Form params
 * @param {Object} [options]
 * @param {boolean} [options.removeEmpty=true] Whether to remove empty values
 * @param {boolean} [options.replace=true] true=replace, false=push
 * @returns {Promise<void>} Resolves when navigation finishes
 */
export function setRouteQuery(router, route, params, options = {}) {
    const { removeEmpty = true, replace = true } = options;

    const nextQuery = { ...(route?.query || {}) };

    Object.keys(params || {}).forEach((key) => {
        const value = params[key];

        if (removeEmpty && (value === "" || isNil(value))) {
            delete nextQuery[key];
            return;
        }

        // `null` must not go through JSON.stringify
        nextQuery[key] = !isNil(value) && typeof value === "object" ? JSON.stringify(value) : String(value);
    });

    const action = replace ? router.replace : router.push;
    // Swallow rejections caused by aborted or duplicated navigation
    return action.call(router, { query: nextQuery }).catch(() => null);
}

/**
 * Read the specified keys from route.query.
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route
 * @param {string[]} keys
 * @param {Object} [defaults]
 * @param {Object} [options]
 * @param {boolean} [options.coerce=true] Whether to restore number/boolean/JSON (false returns raw strings)
 */
export function getRouteQuery(route, keys, defaults = {}, options = {}) {
    const { coerce = true } = options;
    const result = {};

    keys.forEach((key) => {
        const raw = route?.query?.[key];
        // Treat `null` as "absent" and fall back to defaults
        if (!isNil(raw)) {
            result[key] = coerce ? parseQueryValue(raw) : raw;
        } else if (key in defaults) {
            result[key] = defaults[key];
        }
    });
    return result;
}

/**
 * Remove the specified query params (keeps all other params).
 */
export function removeRouteQuery(router, route, keys, replace = true) {
    const nextQuery = { ...(route?.query || {}) };
    keys.forEach((key) => delete nextQuery[key]);
    const action = replace ? router.replace : router.push;
    return action.call(router, { query: nextQuery }).catch(() => null);
}

/**
 * Restore the original type of a string (number, boolean, object, array).
 */
function parseQueryValue(raw) {
    if (isNil(raw)) return raw;
    if (Array.isArray(raw)) return raw.map((v) => parseQueryValue(v));
    if (raw === "true") return true;
    if (raw === "false") return false;

    const trimmed = raw.trim();

    // Use `trimmed` for the numeric check; `[0-9]` instead of `\d`
    if (/^-?[0-9]+(\.[0-9]+)?$/.test(trimmed)) return Number(trimmed);

    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
        try {
            return JSON.parse(trimmed);
        } catch {
            return raw;
        }
    }
    return raw;
}
