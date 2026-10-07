<template>
    <div class="mobile-dashboard">
        <!-- 固定页眉 -->
        <div class="header">
            <div class="header-row">
                <span class="header-title">账单统计</span>
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
            </div>
            <div class="date-row">
                <el-date-picker
                    v-model="currentMonth"
                    type="month"
                    placeholder="选择月份"
                    format="YYYY年MM月"
                    value-format="YYYY-MM"
                    :clearable="false"
                    class="month-picker" />
                <button class="month-btn" @click="changeMonth(-1)" aria-label="上一月">
                    <span class="arrow">‹</span>
                </button>
                <button class="month-btn" @click="changeMonth(1)" aria-label="下一月">
                    <span class="arrow">›</span>
                </button>
            </div>
        </div>

        <!-- 内容区 -->
        <div class="content">
            <BillStatistic :type="currentType" :query-params="queryParams" />
            <DayChart :type="currentType" :query-params="queryParams" />
            <CategoryChart :type="currentType" :query-params="queryParams" />
            <!-- 补回排行卡片 -->
            <RankChart :type="currentType" :query-params="queryParams" />
        </div>
    </div>
</template>

<script>
import BillStatistic from "./BillStatistic.vue";
import DayChart from "./DayChart.vue";
import CategoryChart from "./CategoryChart.vue";
// 补回引入
import RankChart from "./RankChart.vue";

const TYPE_OPTIONS = [
    { value: "expense", label: "支出", color: "#f56c6c" },
    { value: "income", label: "收入", color: "#36cbcb" },
];

function currentMonthStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, "0");
    return `${y}-${m}`;
}

export default {
    // 补回注册
    components: { BillStatistic, DayChart, CategoryChart, RankChart },
    data() {
        return {
            typeOptions: TYPE_OPTIONS,
            currentType: "expense", // 全局收支类型
            currentMonth: currentMonthStr(), // "2026-03"
        };
    },
    computed: {
        queryParams() {
            const month = this.currentMonth || currentMonthStr();
            const [y, m] = month.split("-").map(Number);
            const lastDay = new Date(y, m, 0).getDate();
            return {
                month,
                from: `${month}-01`,
                to: `${month}-${String(lastDay).padStart(2, "0")}`,
            };
        },
    },
    methods: {
        // offset: -1 上一月 / +1 下一月，跨年自动进位
        changeMonth(offset) {
            const base = this.currentMonth || currentMonthStr();
            const [y, m] = base.split("-").map(Number);
            // Date 月份从 0 开始，所以用 m - 1 + offset；跨年由 Date 自动处理
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

.type-switch {
    display: flex;
    padding: 2px;
    background: #f5f5f5;
    border-radius: 8px;
}

.switch-item {
    padding: 5px 18px;
    font-size: 13px;
    color: #606266;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
}

/* ========== 月份选择器 + 上一月/下一月 ========== */
.date-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

/* 左右切换按钮（保留你最新调整的 62px 宽度） */
.month-btn {
    flex-shrink: 0;
    width: 62px;
    height: 36px;
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

.month-btn:active {
    background: #e8eaed;
}

.month-btn .arrow {
    font-size: 22px;
    line-height: 1;
    font-weight: 600;
    transform: translateY(-1px);
}

/* 中间月份选择器占满剩余空间 */
.month-picker {
    flex: 1;
    min-width: 0;
}

/* ========== 强制对齐 Element 输入框 ========== */
.date-row :deep(.el-date-editor.el-input),
.date-row :deep(.el-input__wrapper) {
    height: 36px;
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
