<template>
    <div class="mobile-dashboard">
        <!-- 固定页眉 -->
        <div class="header">
            <div class="header-row">
                <span class="header-title">账单统计</span>
                <div class="period-switch">
                    <div
                        v-for="item in periodOptions"
                        :key="item.value"
                        class="switch-item period-item"
                        :class="{ active: currentPeriod === item.value }"
                        :style="currentPeriod === item.value ? { background: item.color, color: '#fff' } : {}"
                        @click="currentPeriod = item.value">
                        {{ item.label }}
                    </div>
                </div>
            </div>
            <div class="date-row">
                <!-- 收支切换 -->
                <div class="type-switch">
                    <div
                        v-for="item in typeOptions"
                        :key="item.value"
                        class="switch-item"
                        :class="{ active: currentType === item.value }"
                        :style="currentType === item.value ? { background: item.color, color: '#fff' } : {}"
                        @click="currentType = item.value">
                        {{ item.label }}
                    </div>
                </div>

                <!-- 日期选择器 -->
                <el-date-picker
                    v-if="currentPeriod === 'year'"
                    v-model="currentYear"
                    type="year"
                    placeholder="选择年份"
                    format="YYYY年"
                    value-format="YYYY"
                    :clearable="false"
                    class="month-picker" />

                <el-date-picker
                    v-else
                    v-model="currentMonth"
                    type="month"
                    placeholder="选择月份"
                    format="YYYY年MM月"
                    value-format="YYYY-MM"
                    :clearable="false"
                    class="month-picker" />

                <button class="ctrl-btn" @click="changePeriod(-1)" aria-label="上一期">
                    <span class="arrow">‹</span>
                </button>
                <button class="ctrl-btn" @click="changePeriod(1)" aria-label="下一期">
                    <span class="arrow">›</span>
                </button>
            </div>
        </div>

        <!-- 内容区 -->
        <div class="content">
            <BillStatistic ref="billStatisticRef" :type="currentType" :query-params="chartParams" />
            <DayChart ref="dayChartRef" :type="currentType" :query-params="chartParams" />
            <CategoryChart ref="categoryChartRef" :type="currentType" :query-params="chartParams" />
            <RankChart ref="rankChartRef" :type="currentType" :query-params="chartParams" />
        </div>
    </div>
</template>

<script>
import BillStatistic from "./BillStatistic.vue";
import DayChart from "./DayChart.vue";
import CategoryChart from "./CategoryChart.vue";
import RankChart from "./RankChart.vue";

const TYPE_OPTIONS = [
    { value: "expense", label: "支出", color: "#f56c6c" },
    { value: "income", label: "收入", color: "#36cbcb" },
];

const PERIOD_OPTIONS = [
    { value: "year", label: "年报", color: "#409eff" },
    { value: "month", label: "月报", color: "#409eff" },
];

function currentMonthStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, "0");
    return `${y}-${m}`;
}

function currentYearStr() {
    return new Date().getFullYear().toString();
}

export default {
    components: { BillStatistic, DayChart, CategoryChart, RankChart },
    data() {
        return {
            typeOptions: TYPE_OPTIONS,
            periodOptions: PERIOD_OPTIONS,
            currentType: "expense",
            currentPeriod: "month",
            currentMonth: currentMonthStr(),
            currentYear: currentYearStr(),
            // 对齐 PC 端：用 data 维护查询参数，变化后主动刷新子组件
            chartParams: null,
        };
    },
    watch: {
        currentPeriod: "buildParams",
        currentMonth: "buildParams",
        currentYear: "buildParams",
    },
    created() {
        this.buildParams();
    },
    methods: {
        buildParams() {
            if (this.currentPeriod === "year") {
                const year = this.currentYear || currentYearStr();
                this.chartParams = {
                    month: year,
                    year,
                    from: `${year}-01-01`,
                    to: `${year}-12-31`,
                };
            } else {
                const month = this.currentMonth || currentMonthStr();
                const [y, m] = month.split("-").map(Number);
                const lastDay = new Date(y, m, 0).getDate();
                this.chartParams = {
                    month,
                    from: `${month}-01`,
                    to: `${month}-${String(lastDay).padStart(2, "0")}`,
                };
            }
            // 赋新对象后，主动刷新所有子组件（对齐 PC 端 refreshChartComponent）
            this.$nextTick(() => this.refreshAllCharts());
        },
        refreshAllCharts() {
            ["billStatisticRef", "dayChartRef", "categoryChartRef", "rankChartRef"].forEach((k) => {
                this.$refs[k]?.refreshChart?.();
            });
        },
        // offset: -1 上一期 / +1 下一期
        changePeriod(offset) {
            if (this.currentPeriod === "year") {
                const baseYear = Number(this.currentYear || currentYearStr());
                this.currentYear = String(baseYear + offset);
                return;
            }
            const base = this.currentMonth || currentMonthStr();
            const [y, m] = base.split("-").map(Number);
            const d = new Date(y, m - 1 + offset, 1);
            const ny = d.getFullYear();
            const nm = (d.getMonth() + 1).toString().padStart(2, "0");
            this.currentMonth = `${ny}-${nm}`;
        },
    },
};
</script>

<style scoped>
.mobile-dashboard {
    min-height: 100vh;
    background: #f5f6f8;
}

/* ========== 固定页眉 ========== */
.header {
    position: -webkit-sticky;
    position: sticky;
    top: 0;
    z-index: 100;
    background: #fff;
    padding: 10px 12px 12px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.header-title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
}

/* ========== 统一切换容器 ========== */
.type-switch,
.period-switch {
    display: flex;
    padding: 2px;
    background: #f5f5f5;
    border-radius: 8px;
    flex-shrink: 0;
}

.switch-item {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 14px;
    font-size: 13px;
    color: #606266;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
    white-space: nowrap;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
}

.period-switch {
    padding: 2px;
    border-radius: 7px;
}

.period-item {
    height: 26px;
    padding: 0 10px;
    font-size: 12px;
    border-radius: 5px;
}

/* ========== 日期行 ========== */
.date-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.date-row .type-switch {
    flex-shrink: 0;
}

.ctrl-btn {
    flex-shrink: 0;
    width: 44px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f6f8;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    color: #606266;
    cursor: pointer;
    outline: none;
    transition: all 0.15s;
    -webkit-tap-highlight-color: transparent;
    padding: 0;
    box-sizing: border-box;
}

.ctrl-btn:active {
    background: #e8eaed;
}

.ctrl-btn .arrow {
    font-size: 20px;
    line-height: 1;
    font-weight: 600;
    transform: translateY(-1px);
}

.month-picker {
    flex: 1;
    min-width: 0;
}

/* ========== 强制对齐 Element 输入框 ========== */
.date-row :deep(.el-date-editor.el-input),
.date-row :deep(.el-input__wrapper) {
    height: 32px;
    width: 100%;
    box-sizing: border-box;
}

.date-row :deep(.el-input__wrapper) {
    background: #f5f6f8;
    border-radius: 6px;
    box-shadow: 0 0 0 1px #e4e7ed inset;
    padding: 0 10px;
    display: flex;
    align-items: center;
}

.date-row :deep(.el-input__wrapper.is-focus) {
    box-shadow: 0 0 0 1px #409eff inset;
    background: #fff;
}

.date-row :deep(.el-input__inner) {
    font-size: 13px;
    color: #303133;
    text-align: center;
    height: 100%;
    line-height: normal;
}

/* ========== 内容区 ========== */
.content {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-bottom: calc(80px + env(safe-area-inset-bottom));
}
</style>
