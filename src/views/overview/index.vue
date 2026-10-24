<template>
    <div class="page">
        <!-- 工具栏 -->
        <div class="panel toolbar">
            <div class="toolbar__stats">
                <span class="stat">
                    <span class="stat__label">本期收入：</span>
                    <span class="stat__value stat__value--income">{{ incomeTotal }}</span>
                </span>
                <span class="stat">
                    <span class="stat__label">本期支出：</span>
                    <span class="stat__value stat__value--expense">{{ expendTotal }}</span>
                </span>
            </div>

            <div class="toolbar__actions">
                <el-button-group v-if="mode !== 'custom'">
                    <el-button :icon="ArrowLeft" @click="handleShift(-1)" />
                    <el-button :icon="ArrowRight" @click="handleShift(1)" />
                </el-button-group>

                <!-- 固定宽度容器，切换模式时不抖动 -->
                <div class="picker-wrap">
                    <el-date-picker
                        v-if="mode === 'year'"
                        v-model="month"
                        type="year"
                        placeholder="选择年份"
                        format="YYYY"
                        value-format="YYYY"
                        class="picker"
                        @change="handleMonthChange" />
                    <el-date-picker
                        v-if="mode === 'month'"
                        v-model="month"
                        type="month"
                        placeholder="选择月份"
                        format="YYYY-MM"
                        value-format="YYYY-MM"
                        class="picker"
                        @change="handleMonthChange" />
                    <el-date-picker
                        v-if="mode === 'custom'"
                        v-model="custom"
                        type="daterange"
                        start-placeholder="开始日期"
                        end-placeholder="结束日期"
                        format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD"
                        class="picker"
                        @change="handleMonthChange" />
                </div>

                <el-select v-model="mode" class="mode-select" placeholder="报表类型" @change="handleModeChange">
                    <el-option label="年报" value="year" />
                    <el-option label="月报" value="month" />
                    <el-option label="自定义" value="custom" />
                </el-select>

                <el-button type="primary" :icon="Refresh" :loading="loading" @click="onRefresh">刷新</el-button>
            </div>
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
            mode: "month",
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
/* ---------- 页面容器：统一内边距与纵向间距 ---------- */
.page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    box-sizing: border-box;
}

/* ---------- 统一卡片外观（工具栏 + 图表共用） ---------- */
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

.toolbar__stats {
    display: flex;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
}

.stat {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    white-space: nowrap;
}

.stat__label {
    color: #606266;
    font-size: 14px;
}

.stat__value {
    min-width: 80px;
    font-weight: 600;
    font-size: 16px;
    font-variant-numeric: tabular-nums;

    &--income {
        color: #36cbcb;
    }

    &--expense {
        color: #f56c6c;
    }
}

.toolbar__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

/* 固定宽度包一层，三种 picker 切换时布局不抖动 */
.picker-wrap {
    width: 280px;
}

.picker {
    width: 100%;
}

.mode-select {
    width: 140px;
}

/* ---------- 图表网格 ---------- */
.chart-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-auto-rows: 400px;
    gap: 16px;
}

.chart-card {
    height: 100%;
    padding: 16px;
    overflow: hidden;
    display: flex;
    flex-direction: column;

    /* 让内部图表组件撑满卡片 */
    > * {
        flex: 1 1 auto;
        min-height: 0;
    }
}

/* ---------- 响应式 ---------- */

/* 中等屏：缩小高度、收窄控件 */
@media (max-width: 1200px) {
    .chart-grid {
        grid-auto-rows: 360px;
    }

    .picker-wrap {
        width: 240px;
    }
}

/* 平板 / 手机横屏：单列 + 工具栏换行 */
@media (max-width: 900px) {
    .page {
        padding: 8px;
    }

    .toolbar {
        flex-direction: column;
        align-items: stretch;
    }

    .toolbar__actions {
        width: 100%;
    }

    .toolbar__actions > * {
        flex: 1 1 auto;
    }

    .picker-wrap,
    .mode-select {
        width: 100%;
        min-width: 0;
    }

    .chart-grid {
        grid-template-columns: minmax(0, 1fr);
        grid-auto-rows: 320px;
    }
}

@media (max-width: 600px) {
    .chart-grid {
        grid-auto-rows: 280px;
    }

    .toolbar__stats {
        gap: 12px;
    }

    .stat__value {
        min-width: 64px;
        font-size: 15px;
    }
}
</style>
