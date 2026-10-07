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
import { msgcon } from "../../utils/message.js";
import { GetStatistic } from "../../api/basic.js";

export default {
    name: "BillStatistic",
    props: {
        // 仅用于高亮当前图表展示的类型，卡片始终同时显示支出和收入
        type: { type: String, default: "expense" },
        queryParams: Object,
    },
    data() {
        return {
            income: "0.00",
            expense: "0.00",
        };
    },
    computed: {
        rangeText() {
            const month = this.queryParams?.month;
            if (!month) return "";
            const [y, m] = month.split("-");
            return `${y}年${m}月`;
        },
    },
    mounted() {
        this.getBillStatistic();
    },
    watch: {
        queryParams: {
            handler(n, o) {
                if (o !== undefined) this.getBillStatistic();
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
            const month = this.queryParams?.month;
            if (!month) return;
            try {
                const res = await GetStatistic({
                    sa: "s01",
                    pt: "month",
                    from: month, // "2026-03"
                    to: month,
                });
                if (res?.payload) {
                    this.income = res.payload.income || "0.00";
                    this.expense = res.payload.expense || "0.00";
                }
            } catch (err) {
                console.error("获取统计失败：", err);
                msgcon.error("获取收支统计失败");
            }
        },
    },
};
</script>

<style scoped>
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

/* 左右两栏并排 */
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

/* 当前图表展示的类型：加底部指示条 + 数字放大 */
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

/* 当前选中类型的小圆点 */
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

/* 当前选中类型数字放大，另一个稍小、略淡 */
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
