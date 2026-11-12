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
            <el-space>
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
                    <el-radio-button label="年报" value="year" />
                    <el-radio-button label="月报" value="month" />
                    <el-radio-button label="自定义" value="custom" />
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
import { setRouteQuery, getRouteQuery } from "../../utils/routeQuery";
import Category from "./charts/category.vue";
import ExpenseRank from "./charts/expenseRank.vue";
import DayExpenseChart from "./charts/DayExpenseChart.vue";
import DayIncomeChart from "./charts/DayIncomeChart.vue";

const CHART_REFS = ["dayExpenseChartRef", "dayIncomeChartRef", "categoryChartRef", "expenseRankRef"];

const QUERY_KEYS = ["mode", "month", "custom"];
const QUERY_DEFAULTS = { mode: "year", month: "", custom: null };
const VALID_MODES = ["year", "month", "custom"];

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
            isReady: false,
        };
    },
    watch: {
        mode() {
            this.syncToUrl();
        },
        month() {
            this.syncToUrl();
        },
        custom: {
            deep: true,
            handler() {
                this.syncToUrl();
            },
        },
    },
    created() {
        this.$globalBus.emit("updateActivePath", "/overview");

        const saved = getRouteQuery(this.$route, QUERY_KEYS, QUERY_DEFAULTS);

        // 关键修复：URL 里的 "2024" 会被 parseQueryValue 还原成数字 2024，
        // 而 el-date-picker value-format="YYYY" 要求 v-model 为字符串，
        // 数字会导致选择器不显示年份，因此这里统一 String 化。
        const restoredMode = VALID_MODES.includes(String(saved.mode)) ? String(saved.mode) : "year";
        this.mode = restoredMode;

        if (restoredMode === "custom") {
            this.custom = Array.isArray(saved.custom) && saved.custom.length === 2 && saved.custom[0] && saved.custom[1] ? saved.custom.map(String) : [];
            this.month = "";
        } else {
            this.month = String(saved.month || this.getCurrentModeDefault());
            this.custom = [];
        }

        this.$nextTick(() => {
            this.isReady = true;
        });

        this.handleMonthChange();
    },
    methods: {
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
            if (this.mode === "custom") {
                this.custom = [];
                this.month = "";
            } else {
                this.custom = [];
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

        syncToUrl() {
            if (!this.isReady) return;

            const params = { mode: this.mode };

            if (this.mode === "custom") {
                const ok = Array.isArray(this.custom) && this.custom.length === 2 && this.custom[0] && this.custom[1];
                params.custom = ok ? this.custom : null;
                params.month = "";
            } else {
                params.month = this.month || "";
                params.custom = null;
            }
            setRouteQuery(this.$router, this.$route, params);
        },
    },
};
</script>
<style scoped lang="less">
.page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-sizing: border-box;
}

.panel {
    background: #fff;
    border-radius: 8px;
    border: 1px solid #ebeef5;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    box-sizing: border-box;
}

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
        color: var(--color-income);
    }

    &--expense {
        color: var(--color-expense);
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
