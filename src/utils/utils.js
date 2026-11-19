// utils.js
import dayjs from "dayjs";
import { DATE_TIME_FORMAT, IMPORT_OCC_TIME_FORMAT, SK_LEDGER_ALL_CATEGORY } from "./constants.js";

/* ==================== 金额 ==================== */

/**
 * 金额格式化（千分位，保留2-4位小数，不含符号）
 */
export function formatAmountValue(value) {
    const num = Number(value);
    if (isNaN(num)) return value ?? "";
    return num.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    });
}

/**
 * 带符号金额显示：direction 为 "2" 显示 −，否则显示 +
 * @param {number|string} amount 正数金额
 * @param {number|string} direction "1" 收入 / "2" 支出
 */
export function displaySignedAmount(amount, direction) {
    const raw = Number(amount);
    const val = isNaN(raw) ? 0 : raw;
    const sign = Number(direction) === 2 ? "−" : "+";
    const formatted = formatAmountValue(val);
    return `${sign}${formatted}`;
}

/**
 * 按金额正负显示：正 → +，负 → −（用于 detail.vue）
 */
export function displayAmountBySign(rawAmount) {
    const raw = Number(rawAmount);
    const val = isNaN(raw) ? 0 : Math.abs(raw);
    const sign = raw >= 0 ? "+" : "−";
    return `${sign}${formatAmountValue(val)}`;
}

/* ==================== 标签 ==================== */

/**
 * 兼容多种标签格式：string[] / [{name}] / {list:[]} / {tags:[]}
 * 返回去重、trim 后的 string[]
 */
export function normalizeTags(raw) {
    let arr = raw;
    if (arr && !Array.isArray(arr)) {
        arr = arr.tags || arr.list || [];
    }
    if (!Array.isArray(arr)) return [];
    return Array.from(
        new Set(
            arr
                .map((t) => (typeof t === "string" ? t : t && t.name))
                .filter((t) => t && String(t).trim().length > 0)
                .map((t) => String(t).trim()),
        ),
    );
}

/**
 * 提交前统一处理标签：trim + 去空 + 去重
 */
export function buildTagsForSubmit(tags) {
    return Array.from(new Set((tags || []).map((t) => String(t).trim()).filter((t) => t.length > 0)));
}

/* ==================== 明细行 ==================== */

export function genRowId() {
    return Date.now() + Math.random();
}

/**
 * 空明细行
 */
export function emptyDetailRow() {
    return {
        id: genRowId(),
        name: "",
        quantity: null,
        price: null,
        total: null,
        unit: "",
    };
}

/**
 * 将明细行格式化为提交接口所需结构
 */
export function formatDetailRows(rows) {
    return rows.map((row) => ({
        name: row.name,
        quantity: Number(row.quantity),
        price: Number(row.price),
        total: Number(row.total),
        unit: row.unit,
    }));
}

/**
 * 明细总金额
 */
export function sumDetailRows(rows) {
    return rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
}

/**
 * 计算单行 total
 */
export function calcRowTotal(row) {
    if (row && row.quantity !== null && row.price !== null) {
        row.total = (Number(row.quantity) * Number(row.price)).toFixed(4);
    }
    return row;
}

/**
 * 明细行校验（新增/修改共用）
 * @returns {string|null} 错误信息，null 表示通过
 */
export function validateDetailRows(rows) {
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.name) {
            return `第${i + 1}行明细：请输入物品名称`;
        }
        if (row.quantity === null || isNaN(Number(row.quantity)) || Number(row.quantity) <= 0) {
            return `第${i + 1}行明细：请输入有效的个数`;
        }
        if (!row.unit) {
            return `第${i + 1}行明细：请输入有效的单位`;
        }
        if (row.price === null || isNaN(Number(row.price)) || Number(row.price) <= 0) {
            return `第${i + 1}行明细：请输入有效的单价`;
        }
    }
    return null;
}

/* ==================== 剪贴板 / 文本 ==================== */

/**
 * 复制文本到剪贴板（带 fallback）
 */
export function copyText(text, onSuccess, onError) {
    const doFallback = () => {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand("copy");
            onSuccess?.("明细已复制到剪贴板");
        } catch {
            onError?.("复制失败");
        }
        document.body.removeChild(textarea);
    };

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
            .writeText(text)
            .then(() => onSuccess?.("明细已复制到剪贴板"))
            .catch(doFallback);
    } else {
        doFallback();
    }
}

/**
 * 明细行序列化为可复制 JSON（空值转 ""）
 */
export function serializeDetailRows(rows) {
    const toStr = (v) => (v === null || v === undefined ? "" : v);
    return JSON.stringify(
        rows.map((row) => ({
            name: toStr(row.name),
            quantity: toStr(row.quantity),
            price: toStr(row.price),
            total: toStr(row.total),
            unit: toStr(row.unit),
        })),
    );
}

/**
 * 在输入框光标位置插入分隔符（默认 ｜）
 * @returns {{ value: string, caret: number }}
 */
export function insertSeparator(val, input, sep = "｜") {
    const v = val || "";
    if (input && typeof input.selectionStart === "number") {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        return {
            value: v.slice(0, start) + sep + v.slice(end),
            caret: start + sep.length,
        };
    }
    return { value: v + sep, caret: v.length + sep.length };
}

/* ==================== 时间 ==================== */

/**
 * 格式化当前时间为接口格式 YYYY-MM-DDTHH:mm:ssZZ
 */
export function nowOccTime() {
    return dayjs().format(DATE_TIME_FORMAT);
}

/**
 * 将时间字符串格式化为导入格式 YYYY-MM-DDTHH:mm:ss+0800
 */
export function formatOccTimeForImport(input) {
    const str = String(input ?? "").trim();
    if (!str) return "";
    if (new RegExp(`^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\+0800$`).test(str)) return str;

    const normalized = str.replace(/年|月/g, "-").replace(/日/g, "").replace(/\//g, "-");
    const d = dayjs(normalized);
    if (!d.isValid()) return str;
    return d.format(IMPORT_OCC_TIME_FORMAT);
}

/* ==================== 表单校验规则 ==================== */

/**
 * 金额校验规则（新增/修改共用）
 */
export const AMOUNT_FORM_RULE = [
    { required: true, message: "请输入金额", trigger: ["blur"] },
    {
        pattern: /(^[1-9]([0-9]+)?(\.[0-9]{1,4})?$)|(^(0){1}$)|(^[0-9]\.[0-9]{1,3}?$)/,
        message: "请输入正确额格式,可保留四位小数",
    },
];

/**
 * 时间校验规则（新增/修改共用）
 */
export const OCC_TIME_FORM_RULE = [{ required: true, type: "string", message: "请选择时间", trigger: ["blur", "change"] }];

/**
 * 分类校验规则（新增/修改共用）
 */
export const CATEGORY_FORM_RULE = [{ required: true, message: "请选择类别", trigger: ["blur", "change"] }];

/* ==================== 分类缓存 ==================== */

/**
 * 从 localStorage 读取分类树
 */
export function readCategoryTree() {
    try {
        const str = window.localStorage.getItem(SK_LEDGER_ALL_CATEGORY);
        return str ? JSON.parse(str) : [];
    } catch {
        return [];
    }
}
