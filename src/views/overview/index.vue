<template>
    <div style="padding-top: 10px">
        <el-card style="width: 100%">
            <div class="my_refresh">
                <div>
                    <el-space>
                        <el-text>
                            本期收入：
                            <span class="amount income">{{ incomeTotal }}</span>
                        </el-text>
                        <el-text>
                            本期支出：
                            <span class="amount expense">{{ expendTotal }}</span>
                        </el-text>
                    </el-space>
                </div>
                <el-space>
                    <!-- Quick prev / next buttons, only for month / year mode -->
                    <el-button-group v-if="mode !== 'custom'">
                        <el-button :icon="ArrowLeft" @click="handleShift(-1)" />
                        <el-button :icon="ArrowRight" @click="handleShift(1)" />
                    </el-button-group>

                    <el-date-picker
                        v-if="mode === 'year'"
                        v-model="month"
                        type="year"
                        placeholder="选择年份"
                        format="YYYY"
                        value-format="YYYY"
                        style="width: 320px"
                        @change="handleMonthChange" />
                    <el-date-picker
                        v-if="mode === 'month'"
                        v-model="month"
                        type="month"
                        placeholder="选择月份"
                        format="YYYY-MM"
                        value-format="YYYY-MM"
                        style="width: 320px"
                        @change="handleMonthChange" />
                    <el-date-picker
                        v-if="mode === 'custom'"
                        v-model="custom"
                        type="daterange"
                        start-placeholder="开始日期"
                        end-placeholder="结束日期"
                        format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD"
                        style="width: 320px"
                        @change="handleMonthChange" />

                    <el-select v-model="mode" placeholder="报表类型" style="width: 240px" @change="handleModeChange">
                        <el-option label="年报" value="year" />
                        <el-option label="月报" value="month" />
                        <el-option label="自定义" value="custom" />
                    </el-select>

                    <el-button type="primary" :icon="Refresh" @click="onRefresh" :loading="loading">刷新</el-button>
                </el-space>
            </div>
        </el-card>
    </div>

    <div style="padding-top: 10px">
        <div class="chart-wrapper">
            <!-- Line chart: full-width row, enough horizontal space for daily trend -->
            <div class="chart-item chart-item--full">
                <Day ref="dayChartRef" :query-params="chartParams" />
            </div>
            <!-- Pie chart and ranking: half-width each, side by side -->
            <div class="chart-item">
                <Category ref="categoryChartRef" :query-params="chartParams" />
            </div>
            <div class="chart-item">
                <ExpenseRank ref="expenseRankRef" :query-params="chartParams" />
            </div>
        </div>
    </div>
</template>

<script>
import { Refresh, ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import { GetCycleSummary } from "../../api/basic.js";
import Day from "./charts/day.vue";
import Category from "./charts/category.vue";
import ExpenseRank from "./charts/expenseRank.vue";

// Centralized ref names for the three charts, used for batch refresh
const CHART_REFS = ["dayChartRef", "categoryChartRef", "expenseRankRef"];

export default {
    name: "OverviewIndex",
    components: { Day, Category, ExpenseRank },
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

        // Shift the selected period by N units (-1 prev / +1 next)
        handleShift(step) {
            if (this.mode === "year") {
                const year = Number(this.month) + step;
                this.month = String(year);
            } else if (this.mode === "month") {
                const [y, m] = this.month.split("-").map(Number);
                // Date handles month overflow automatically (e.g. Jan -1 => Dec prev year)
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
            } else {
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

        // Refresh all three charts in one pass
        refreshChartComponent() {
            this.$nextTick(() => {
                CHART_REFS.forEach((key) => {
                    const ref = this.$refs[key];
                    ref?.refreshChart?.();
                });
            });
        },
    },
};
</script>

<style scoped lang="less">
.my_refresh {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
}

.amount {
    display: inline-block;
    min-width: 80px;
    font-weight: 600;

    &.income {
        color: #36cbcb;
    }

    &.expense {
        color: #f56c6c;
    }
}

.chart-wrapper {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
}

.chart-item {
    height: 400px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    border: 1px solid #f5f7fa;
    background-color: #fff;
    overflow: hidden;
    padding: 20px;
    box-sizing: border-box;
}

/* Line chart spans the full row */
.chart-item--full {
    grid-column: 1 / -1;
}

/* Narrow screens (mobile / portrait tablet) fall back to a single column */
@media (max-width: 900px) {
    .chart-wrapper {
        grid-template-columns: minmax(0, 1fr);
    }
}
</style>
