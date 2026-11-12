// constants.js
export const SK_LEDGER_ALL_CATEGORY = "LEDGER_ALL_CATEGORY";

export const DEFAULT_PAGE_SIZE = 10;

// 一天毫秒数
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// 时间格式
export const DATE_TIME_FORMAT = "YYYY-MM-DDTHH:mm:ssZZ";
export const DISPLAY_DATE_TIME_FORMAT = "YYYY-MM-DD HH:mm:ss";
export const IMPORT_OCC_TIME_FORMAT = "YYYY-MM-DDTHH:mm:ss+0800";

// 排序白名单（index.vue）
export const SORT_WHITELIST = ["occ_at", "amount", "create_time"];
export const ORDER_WHITELIST = ["asc", "desc"];

// URL 里与搜索相关的参数 key（不含分页 s/p）
export const SEARCH_KEYS = ["cid", "keyword", "direction", "from", "to", "min_amount", "max_amount", "sort", "order"];
// 从 URL 读取时关注的 key（含分页）
export const QUERY_KEYS = ["s", "p", ...SEARCH_KEYS];
