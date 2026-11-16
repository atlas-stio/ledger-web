// src/utils/ecode.js

export const ECODE_MESSAGE_MAP = {
    "Ledger.0000": "操作成功",
    "Ledger.0101": "结果错误",
    "Ledger.0102": "查询参数错误",
    "Ledger.0103": "请求参数校验失败",
    "Ledger.0104": "请求体错误",
    "Ledger.0105": "路径参数非法",
    "Ledger.0106": "没有可更新的字段",
    "Ledger.0107": "分页参数非法",
    "Ledger.0108": "时间范围/周期参数非法",
    "Ledger.0201": "分类不存在",
    "Ledger.0202": "账单不存在",
    "Ledger.0203": "标签不存在",
    "Ledger.0301": "上游返回处理错误",
    "Ledger.0311": "资源已存在",
    "Ledger.0312": "分类存在子分类，无法删除",
    "Ledger.0313": "分类被账单引用，无法删除",
    "Ledger.0401": "无权操作该资源",
    "Ledger.0402": "系统分类不允许修改/删除",
    "Ledger.0501": "分类方向非法（仅 1/2）",
    "Ledger.0502": "发生时间非法",
    "Ledger.0503": "金额方向与分类方向不一致",
    "Ledger.0504": "明细总价超过账单金额",
    "Ledger.0505": "金额不能为 0",
    "Ledger.0175": "无效/错误的 token",
    "Ledger.0177": "action 不存在",
    "Ledger.0178": "策略未授权此操作",
    "Ledger.0198": "删除资源时冲突",
};

export function resolveEcodeMessage(meta) {
    if (!meta) return "请求失败";
    return ECODE_MESSAGE_MAP[meta.ecode] || meta.message || "请求失败";
}
