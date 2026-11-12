<template>
    <el-drawer v-model="drawer" direction="rtl" title="账单详情" :size="'35%'">
        <div v-loading="loading" class="detail-wrap">
            <div class="amount-card">
                <div class="amount-label">账单总金额</div>
                <div :class="amountClass">{{ displayAmount }}</div>
            </div>

            <div class="info-card">
                <div class="info-row">
                    <span class="label">记账时间</span>
                    <span class="value">{{ disFrom.occ_time || "-" }}</span>
                </div>
                <div class="info-row">
                    <span class="label">分类</span>
                    <span class="value">{{ disFrom.categoryName || "-" }}</span>
                </div>
                <div class="info-row">
                    <span class="label">备注</span>
                    <span class="value">{{ disFrom.remark || "无备注" }}</span>
                </div>
                <div class="info-row">
                    <span class="label">标签</span>
                    <span class="value">
                        <template v-if="disFrom.tags && disFrom.tags.length > 0">
                            <el-tag v-for="tag in disFrom.tags" :key="tag" size="small" class="tag-item" type="info" effect="plain">
                                {{ tag }}
                            </el-tag>
                        </template>
                        <span v-else class="empty-text">无标签</span>
                    </span>
                </div>
            </div>

            <div class="detail-card" v-if="disFrom.detail.length > 0">
                <div class="card-title">账目明细</div>
                <div class="detail-item" v-for="(val, inx) in disFrom.detail" :key="inx">
                    <div class="item-name">{{ val.name }}</div>
                    <div class="item-calc">
                        {{ val.price }}元 × {{ val.quantity }}{{ val.unit }} =
                        <span class="item-total">{{ val.total }}</span>
                    </div>
                </div>
            </div>
            <div class="empty-tip" v-else>暂无明细</div>
        </div>
    </el-drawer>
</template>

<script>
import dayjs from "dayjs";
import { GetTranDetails } from "../../api/basic.js";
import { getCategoryPath } from "../../utils/category.js";
import { DISPLAY_DATE_TIME_FORMAT, SK_LEDGER_ALL_CATEGORY } from "./constants.js";
import { displayAmountBySign, normalizeTags } from "./utils.js";

const DEFAULT_TRAN_FORM = {
    occ_time: "",
    amount: "",
    category: "",
    categoryName: "",
    remark: "",
    tags: [],
    detail: [],
};

export default {
    name: "TranDetail",
    data() {
        return {
            drawer: false,
            loading: true,
            tranId: "",
            // 初始为 null，表示金额尚未就绪，避免误判为收入导致颜色闪烁
            tranRawAmount: null,
            disFrom: { ...DEFAULT_TRAN_FORM },
        };
    },
    computed: {
        amountClass() {
            // 数据未就绪时不赋颜色类，避免首帧按默认/错误状态着色
            if (this.tranRawAmount === null) return "";
            return this.tranRawAmount >= 0 ? "income-text" : "expense-text";
        },
        displayAmount() {
            // 数据未就绪时显示占位符，而不是 0
            if (this.tranRawAmount === null) return "-";
            return displayAmountBySign(this.tranRawAmount);
        },
    },
    methods: {
        async onOpenDialog(val) {
            // 重置为 null，而不是 0
            this.tranRawAmount = null;
            this.loading = true;
            this.drawer = true;
            this.tranId = val.id;
            this.disFrom = { ...DEFAULT_TRAN_FORM, tags: [], detail: [] };

            try {
                await this.GetDetails();
            } finally {
                this.loading = false;
            }
        },
        async GetDetails() {
            const res = await GetTranDetails(this.tranId);
            const payload = res.payload || {};

            // 安全转换：Number(undefined/空串) 会得到 NaN，这里兜底为 0
            const rawAmount = Number(payload.amount);
            this.tranRawAmount = Number.isNaN(rawAmount) ? 0 : rawAmount;

            this.disFrom.occ_time = payload.occ_time ? dayjs(payload.occ_time).format(DISPLAY_DATE_TIME_FORMAT) : "";
            this.disFrom.amount = Math.abs(this.tranRawAmount).toString();
            this.disFrom.category = payload.cid;
            this.disFrom.categoryName = this.resolveCategoryName(payload.cid, payload.categoryName);
            this.disFrom.remark = payload.remark || "";
            this.disFrom.detail = payload.detail ? [...payload.detail] : [];
            this.disFrom.tags = normalizeTags(payload.tags);
        },
        resolveCategoryName(cid, fallbackName) {
            if (!cid) return fallbackName || "";
            try {
                const str = window.localStorage.getItem(SK_LEDGER_ALL_CATEGORY);
                const tree = str ? JSON.parse(str) : [];
                const path = getCategoryPath(tree, cid);
                return path || fallbackName || "";
            } catch (e) {
                console.error("读取分类缓存失败", e);
                return fallbackName || "";
            }
        },
        handleClose() {
            this.tranId = "";
            this.tranRawAmount = null;
            this.disFrom = { ...DEFAULT_TRAN_FORM, tags: [], detail: [] };
        },
    },
};
</script>
<style scoped lang="less">
.detail-wrap {
    padding: 4px 8px;
}
.amount-card {
    background: #f7f8fa;
    border-radius: 8px;
    padding: 16px 20px;
    margin-bottom: 16px;
    text-align: center;
    .amount-label {
        font-size: 14px;
        color: #666;
        margin-bottom: 6px;
    }
    .income-text {
        font-size: 30px;
        font-weight: bold;
        color: var(--color-income);
    }
    .expense-text {
        font-size: 30px;
        font-weight: bold;
        color: var(--color-expense);
    }
}
.info-card {
    border: 1px solid #e5e6eb;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
    .info-row {
        display: flex;
        padding: 8px 0;
        &:not(:last-child) {
            border-bottom: 1px solid #f2f3f5;
        }
        .label {
            width: 90px;
            color: #666;
            flex-shrink: 0;
        }
        .value {
            flex: 1;
            color: #222;
            word-break: break-all;
        }
        .empty-text {
            color: #999;
        }
        .tag-item {
            margin-right: 8px;
            margin-bottom: 4px;
        }
    }
}
.detail-card {
    border: 1px solid #e5e6eb;
    border-radius: 8px;
    padding: 16px;
    .card-title {
        font-weight: bold;
        font-size: 15px;
        margin-bottom: 12px;
    }
    .detail-item {
        position: relative;
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        &::after {
            content: "";
            position: absolute;
            left: 0;
            right: 0;
            bottom: 0;
            height: 1px;
            background: transparent;
            background-image: linear-gradient(to right, #e0e0e0 50%, transparent 50%);
            background-size: 6px 1px;
        }
        &:last-child::after {
            display: none;
        }
        .item-name {
            color: #333;
        }
        .item-calc {
            color: #666;
            .item-total {
                color: #1890ff;
                font-weight: 500;
            }
        }
    }
}
.empty-tip {
    color: #999;
    text-align: center;
    padding: 30px 0;
    border: 1px dashed #e5e6eb;
    border-radius: 8px;
}
</style>
