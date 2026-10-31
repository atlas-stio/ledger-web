<template>
    <div class="page">
        <!-- 工具栏 -->
        <div class="panel toolbar">
            <div class="toolbar__stats">
                <div class="stat">
                    <span class="stat__label">本期收入</span>
                    <span class="stat__value stat__value--income">{{ formatAmount(incomeTotal) }}</span>
                    <span class="stat__unit">元</span>
                </div>

                <span class="stat__divider"></span>

                <div class="stat">
                    <span class="stat__label">本期支出</span>
                    <span class="stat__value stat__value--expense">{{ formatAmount(expendTotal) }}</span>
                    <span class="stat__unit">元</span>
                </div>
            </div>

            <el-space :size="20">
                <div class="picker-wrap" :class="{ 'picker-wrap--wide': mode === 'custom' }">
                    <el-date-picker
                        v-if="mode === 'year'"
                        v-model="month"
                        type="year"
                        placeholder="选择年份"
                        format="YYYY"
                        value-format="YYYY"
                        @change="handleMonthChange" />
                    <el-date-picker
                        v-if="mode === 'month'"
                        v-model="month"
                        type="month"
                        placeholder="选择月份"
                        format="YYYY-MM"
                        value-format="YYYY-MM"
                        @change="handleMonthChange" />
                    <el-date-picker
                        v-if="mode === 'custom'"
                        v-model="custom"
                        type="daterange"
                        start-placeholder="开始日期"
                        end-placeholder="结束日期"
                        format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD"
                        @change="handleMonthChange" />
                </div>
                <el-button-group v-if="mode !== 'custom'">
                    <el-button :icon="ArrowLeft" @click="handleShift(-1)" />
                    <el-button :icon="ArrowRight" @click="handleShift(1)" />
                </el-button-group>

                <el-radio-group v-model="mode" @change="handleModeChange">
                    <el-radio-button label="year">年报</el-radio-button>
                    <el-radio-button label="month">月报</el-radio-button>
                    <el-radio-button label="custom">自定义</el-radio-button>
                </el-radio-group>

                <el-button type="primary" :icon="Refresh" :loading="loading" @click="onRefresh">刷新</el-button>
            </el-space>
        </div>

        <!-- 图表区：2 × 2 网格 -->
        <div class="chart-grid">
            <div class="panel chart-card">
                <DayExpenseChart ref="dayExpenseChartRef" :query-params="chartParams" />
            </div>
            <div class="panel chart-card">
                <DayIncomeChart ref="dayIncomeChartRef" :query-params="chartParams" />
            </div>
            <div class="panel chart-card">
                <Category ref="categoryChartRef" :query-params="chartParams" />
            </div>
            <div class="panel chart-card">
                <ExpenseRank ref="expenseRankRef" :query-params="chartParams" />
            </div>
        </div>
    </div>
</template>

<script>
import { Refresh, ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import { GetCycleSummary } from "../../api/basic.js";
import Category from "./charts/category.vue";
import ExpenseRank from "./charts/expenseRank.vue";
import DayExpenseChart from "./charts/DayExpenseChart.vue";
import DayIncomeChart from "./charts/DayIncomeChart.vue";

// 每个图表一个独立 ref，避免重复 ref 被合并成数组
const CHART_REFS = ["dayExpenseChartRef", "dayIncomeChartRef", "categoryChartRef", "expenseRankRef"];

export default {
    name: "OverviewIndex",
    components: { Category, ExpenseRank, DayExpenseChart, DayIncomeChart },
    setup() {
        return { Refresh, ArrowLeft, ArrowRight };
    },
    data() {
        return {
            loading: false,
            mode: "year",
            month: "",
            custom: [],
            chartParams: null,
            incomeTotal: 0,
            expendTotal: 0,
        };
    },
    created() {
        this.$globalBus.emit("updateActivePath", "/overview");
        this.month = this.getCurrentModeDefault();
        this.handleMonthChange();
    },
    methods: {
        // 金额千分位 + 固定两位小数
        formatAmount(val) {
            const n = Number(val);
            if (!isFinite(n)) return "0.00";
            return n.toLocaleString("zh-CN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        },

        getRangeParams() {
            const { mode, month, custom } = this;
            if (mode === "custom") {
                if (!Array.isArray(custom) || custom.length !== 2) return null;
                return { from: custom[0], to: custom[1] };
            }
            if (!month) return null;

            if (mode === "year") {
                return { from: `${month}-01-01`, to: `${month}-12-31` };
            }
            if (mode === "month") {
                const [y, m] = month.split("-");
                const lastDay = new Date(y, m, 0).getDate();
                return {
                    from: `${month}-01`,
                    to: `${month}-${String(lastDay).padStart(2, "0")}`,
                };
            }
            return null;
        },

        getCurrentModeDefault() {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            if (this.mode === "year") return String(year);
            if (this.mode === "month") return `${year}-${month}`;
            return "";
        },

        handleShift(step) {
            if (this.mode === "year") {
                this.month = String(Number(this.month) + step);
            } else if (this.mode === "month") {
                const [y, m] = this.month.split("-").map(Number);
                const d = new Date(y, m - 1 + step, 1);
                const yy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                this.month = `${yy}-${mm}`;
            } else {
                return;
            }
            this.handleMonthChange();
        },

        async getSummary() {
            const params = this.getRangeParams();
            if (!params) return;
            const res = await GetCycleSummary(params);
            if (res.metadata.ecode === "Ledger.0000") {
                this.incomeTotal = res.payload.income;
                this.expendTotal = res.payload.expense;
            }
        },

        async handleMonthChange() {
            const params = this.getRangeParams();
            if (!params) return;
            this.chartParams = params;
            await this.getSummary();
            this.refreshChartComponent();
        },

        handleModeChange() {
            this.custom = this.mode === "custom" ? [] : this.custom;
            if (this.mode !== "custom") {
                this.month = this.getCurrentModeDefault();
            }
            this.handleMonthChange();
        },

        async onRefresh() {
            this.loading = true;
            try {
                await this.handleMonthChange();
            } finally {
                this.loading = false;
            }
        },

        refreshChartComponent() {
            this.$nextTick(() => {
                CHART_REFS.forEach((key) => {
                    this.$refs[key]?.refreshChart?.();
                });
            });
        },
    },
};
</script>

<style scoped lang="less">
/* ---------- 页面容器 ---------- */
.page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    box-sizing: border-box;
}

/* ---------- 统一卡片 ---------- */
.panel {
    background: #fff;
    border-radius: 8px;
    border: 1px solid #ebeef5;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    box-sizing: border-box;
}

/* ---------- 工具栏 ---------- */
.toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    padding: 16px 20px;
}

/* ---------- 收支统计 ---------- */
.toolbar__stats {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0;
}

.stat {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    white-space: nowrap;
}

.stat__label {
    color: #909399;
    font-size: 13px;
    font-weight: 400;
    letter-spacing: 0.5px;
}

.stat__value {
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: 0.3px;
    font-variant-numeric: tabular-nums;
    font-family:
        "DIN Alternate",
        "SF Pro Display",
        -apple-system,
        "Segoe UI",
        "Helvetica Neue",
        sans-serif;

    &--income {
        color: #13a3a3;
    }

    &--expense {
        color: #e54d4d;
    }
}

.stat__unit {
    color: #c0c4cc;
    font-size: 12px;
    margin-left: -6px;
    align-self: flex-end;
    padding-bottom: 2px;
}

.stat__divider {
    width: 1px;
    height: 22px;
    background: #ebeef5;
    margin: 0 24px;
    flex-shrink: 0;
}

.chart-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: 400px;
    gap: 16px;
}

.chart-card {
    padding: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    > * {
        flex: 1 1 auto;
        min-height: 0;
    }
}
</style>
