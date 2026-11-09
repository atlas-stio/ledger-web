<template>
    <div class="card-box">
        <div class="stat-header">
            <span class="stat-title">收支统计</span>
            <span class="stat-range">{{ rangeText }}</span>
        </div>
        <div class="amount-box">
            <div class="amount-item" :class="{ active: type === 'expense' }">
                <div class="amount-label">
                    支出(元)
                    <span v-if="type === 'expense'" class="dot expense-dot"></span>
                </div>
                <div class="amount-value expense">{{ formatMoney(expense) }}</div>
            </div>
            <div class="amount-divider"></div>
            <div class="amount-item" :class="{ active: type === 'income' }">
                <div class="amount-label">
                    收入(元)
                    <span v-if="type === 'income'" class="dot income-dot"></span>
                </div>
                <div class="amount-value income">{{ formatMoney(income) }}</div>
            </div>
        </div>
    </div>
</template>

<script>
import { msg } from "../../utils/message.ts";
import { GetStatistic } from "../../api/basic.js";

export default {
    name: "BillStatistic",
    props: {
        type: { type: String, default: "expense" },
        queryParams: Object,
    },
    data() {
        return {
            income: "0.00",
            expense: "0.00",
            reqSeq: 0,
        };
    },
    computed: {
        rangeText() {
            const p = this.queryParams;
            if (!p) return "";
            // 年报：YYYY  月报：YYYY-MM
            if (p.month && /^\d{4}$/.test(String(p.month))) {
                return `${p.month}年`;
            }
            const month = p.month;
            if (!month) return "";
            const [y, m] = String(month).split("-");
            return `${y}年${m}月`;
        },
    },
    mounted() {
        this.getBillStatistic();
    },
    watch: {
        queryParams: {
            handler() {
                this.getBillStatistic();
            },
            deep: true,
        },
    },
    methods: {
        formatMoney(val) {
            return (Number(val) || 0).toLocaleString("zh-CN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        },
        async getBillStatistic() {
            const p = this.queryParams;
            if (!p?.from) return;

            const isYear = p.month && /^\d{4}$/.test(String(p.month));

            // 构造请求参数
            const reqParams = {
                sa: "s01",
                // 年报传 pt: "year"，月报传 pt: "month"
                pt: isYear ? "year" : "month",
                from: p.from,
                to: p.to,
            };

            // 如果后端 pt: "year" 不支持完整日期格式，传年份即可
            if (isYear) {
                reqParams.from = String(p.month); // "2026"
                reqParams.to = String(p.month);
            } else {
                // 月报只需精确到月
                reqParams.from = String(p.from).slice(0, 7); // "2026-01"
                reqParams.to = String(p.to).slice(0, 7);
            }

            const seq = ++this.reqSeq;
            try {
                const res = await GetStatistic(reqParams);
                if (seq !== this.reqSeq) return; // 丢弃过期结果

                if (res?.payload) {
                    this.income = res.payload.income || "0.00";
                    this.expense = res.payload.expense || "0.00";
                }
            } catch {
                if (seq === this.reqSeq) msg.error("获取收支统计失败");
            }
        },
        refreshChart() {
            this.getBillStatistic();
        },
    },
};
</script>

<style scoped>
/* 样式保持不变 */
.card-box {
    width: 100%;
    background: #fff;
    border-radius: 10px;
    padding: 14px 16px;
    box-sizing: border-box;
}

.stat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.stat-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
}

.stat-range {
    font-size: 11px;
    color: #909399;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 60%;
}

.amount-box {
    display: flex;
    align-items: stretch;
    gap: 12px;
}

.amount-item {
    flex: 1;
    min-width: 0;
    padding: 4px 0;
    position: relative;
}

.amount-item.active::after {
    content: "";
    position: absolute;
    left: 0;
    bottom: 0;
    width: 24px;
    height: 2px;
    border-radius: 1px;
}

.amount-item.active:first-child::after {
    background: #f56c6c;
}

.amount-item.active:last-child::after {
    background: #36cbcb;
}

.amount-divider {
    width: 1px;
    background: #ebeef5;
    margin: 6px 0;
    flex-shrink: 0;
}

.amount-label {
    font-size: 12px;
    color: #999;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
}

.dot {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
}

.expense-dot {
    background: #f56c6c;
}

.income-dot {
    background: #36cbcb;
}

.amount-value {
    font-size: 20px;
    font-weight: bold;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.amount-item.active .amount-value {
    font-size: 24px;
}

.amount-item:not(.active) .amount-value {
    opacity: 0.85;
}

.amount-value.expense {
    color: #f56c6c;
}

.amount-value.income {
    color: #36cbcb;
}
</style>
