<template>
    <el-card class="calendar-page" shadow="never">
        <template #header>
            <div class="page-header">
                <div class="page-header-left">
                    <el-icon class="page-icon"><Calendar /></el-icon>
                    <span class="page-title">日历视图</span>
                </div>
                <el-space>
                    <el-date-picker
                        v-model="monthPicker"
                        class="month-picker"
                        type="month"
                        format="YYYY年MM月"
                        :clearable="false"
                        :editable="false"
                        placeholder="选择月份" />
                    <el-button-group>
                        <el-button title="上个月" @click="changeMonth(-1)">
                            <el-icon><ArrowLeft /></el-icon>
                        </el-button>
                        <el-button @click="goToday">本月</el-button>
                        <el-button title="下个月" @click="changeMonth(1)">
                            <el-icon><ArrowRight /></el-icon>
                        </el-button>
                    </el-button-group>
                    <el-button type="primary" :icon="Refresh" :loading="loading" @click="loadSummary"> 刷新 </el-button>
                </el-space>
            </div>
        </template>

        <div class="calendar-wrapper" v-loading="loading">
            <div class="weekday-row">
                <div v-for="w in weekdays" :key="w" class="weekday">{{ w }}</div>
            </div>

            <div class="calendar-grid">
                <div
                    v-for="(day, idx) in days"
                    :key="idx"
                    class="day-cell"
                    :class="{ 'is-other-month': !day.isCurrentMonth, 'is-today': day.isToday }"
                    @click="openDayDetail(day)">
                    <div class="day-header">
                        <span class="day-number">{{ day.day }}</span>
                        <span v-if="day.isToday" class="today-tag">今</span>
                    </div>

                    <div class="day-body">
                        <div v-if="day.income > 0" class="day-amount income">
                            <span class="label income">收</span>
                            <span class="value">{{ formatMoney(day.income) }}</span>
                        </div>
                        <div v-if="day.expense > 0" class="day-amount expense">
                            <span class="label expense">支</span>
                            <span class="value">{{ formatMoney(day.expense) }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </el-card>

    <el-dialog v-model="detail.visible" :title="detail.title" width="420px" align-center>
        <div v-if="detail.day" class="detail-list">
            <div class="detail-row">
                <span class="detail-label">
                    <span class="label income">收</span>
                    收入合计
                </span>
                <span class="detail-value income">{{ formatMoney(detail.day.income) }}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">
                    <span class="label expense">支</span>
                    支出合计
                </span>
                <span class="detail-value expense">{{ formatMoney(detail.day.expense) }}</span>
            </div>
            <div class="detail-row total">
                <span class="detail-label">收支净额</span>
                <span class="detail-value" :class="getNetClass(detail.day)">
                    {{ formatMoney(getNet(detail.day)) }}
                </span>
            </div>
        </div>
        <template #footer>
            <el-button @click="detail.visible = false">关闭</el-button>
        </template>
    </el-dialog>
</template>

<script>
import { ElMessage } from "element-plus";
import { ArrowLeft, ArrowRight, Calendar, Refresh } from "@element-plus/icons-vue";
import { withDelay } from "../../utils/common.js";
import { msgcon } from "../../utils/message.js";
import { GetChartDay } from "../../api/basic.js";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];
const TOTAL_CELLS = 42;

export default {
    name: "CalendarView",
    setup() {
        return { ArrowLeft, ArrowRight, Calendar, Refresh };
    },
    data() {
        const now = new Date();
        return {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            loading: false,
            summaryMap: {},
            weekdays: WEEKDAYS,
            detail: { visible: false, title: "", day: null },
        };
    },
    computed: {
        days() {
            return this.buildDays();
        },
        monthPicker: {
            get() {
                return new Date(this.year, this.month - 1, 1);
            },
            set(val) {
                if (!val) return;
                const d = new Date(val);
                if (isNaN(d.getTime())) return;

                const y = d.getFullYear();
                const m = d.getMonth() + 1;
                if (y === this.year && m === this.month) return;

                this.year = y;
                this.month = m;
                this.loadSummary();
            },
        },
    },
    methods: {
        pad(n) {
            return String(n).padStart(2, "0");
        },

        toDateStr(date) {
            return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())}`;
        },

        monthRange() {
            const { year, month } = this;
            const lastDay = new Date(year, month, 0).getDate();
            const m = this.pad(month);
            return { start: `${year}-${m}-01`, end: `${year}-${m}-${this.pad(lastDay)}` };
        },

        buildDays() {
            const { year, month } = this;
            const todayStr = this.toDateStr(new Date());
            const firstDay = new Date(year, month - 1, 1);
            const offset = (firstDay.getDay() + 6) % 7;
            const daysInMonth = new Date(year, month, 0).getDate();
            const prevMonthDays = new Date(year, month - 1, 0).getDate();

            const make = (y, m, d, isCurrent) => {
                const dateStr = this.toDateStr(new Date(y, m - 1, d));
                const summary = this.summaryMap[dateStr] || {};
                return {
                    date: dateStr,
                    day: d,
                    isCurrentMonth: isCurrent,
                    isToday: dateStr === todayStr,
                    income: Number(summary.income) || 0,
                    expense: Number(summary.expense) || 0,
                };
            };

            const days = [];
            for (let i = offset - 1; i >= 0; i--) {
                days.push(make(year, month - 1, prevMonthDays - i, false));
            }
            for (let d = 1; d <= daysInMonth; d++) {
                days.push(make(year, month, d, true));
            }
            let next = 1;
            while (days.length < TOTAL_CELLS) {
                days.push(make(year, month + 1, next++, false));
            }
            return days;
        },

        async loadSummary() {
            this.loading = true;
            const { start, end } = this.monthRange();
            try {
                const res = await withDelay(() => GetChartDay({ from: start, to: end }));

                const payload = res?.payload;
                const items = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];

                const map = {};
                items.forEach((it) => {
                    const rawDate = it.day || it.date;
                    if (!rawDate) return;
                    const dateStr = String(rawDate).slice(0, 10).replace(/\//g, "-");
                    map[dateStr] = {
                        income: Number(it.income ?? it.in ?? 0),
                        expense: Number(it.expense ?? it.out ?? 0),
                    };
                });
                this.summaryMap = map;
            } catch (error) {
                console.error("加载日历数据失败：", error);
                this.summaryMap = {};
                ElMessage.error(msgcon("加载日历数据失败"));
            } finally {
                this.loading = false;
            }
        },

        changeMonth(delta) {
            let m = this.month + delta;
            let y = this.year;
            if (m < 1) {
                m = 12;
                y -= 1;
            } else if (m > 12) {
                m = 1;
                y += 1;
            }
            this.year = y;
            this.month = m;
            this.loadSummary();
        },

        goToday() {
            const now = new Date();
            this.year = now.getFullYear();
            this.month = now.getMonth() + 1;
            this.loadSummary();
        },

        formatMoney(value) {
            return (Number(value) || 0).toLocaleString("zh-CN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        },

        getNet(day) {
            if (!day) return 0;
            return (Number(day.income) || 0) - (Number(day.expense) || 0);
        },

        getNetClass(day) {
            return this.getNet(day) >= 0 ? "income" : "expense";
        },

        openDayDetail(day) {
            this.detail = { visible: true, title: `${day.date} 收支概览`, day };
        },
    },
    created() {
        this.$globalBus?.emit("updateActivePath", "/calendar");
        this.loadSummary();
    },
};
</script>

<style scoped lang="less">
/* ========== mixin ========== */
.money-tag(@size: 18px, @fs: 11px) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: @size;
    height: @size;
    font-size: @fs;
    line-height: 1;
    color: #fff;
    border-radius: 3px;

    &.income {
        background: #10b981;
    }
    &.expense {
        background: #f59e0b;
    }
}

.money-color() {
    &.income {
        color: #10b981;
    }
    &.expense {
        color: #f59e0b;
    }
}

/* ========== 卡片外壳 ========== */
.calendar-page {
    --page-gap: 120px;

    display: flex;
    flex-direction: column;
    width: 100%;
    height: calc(100vh - var(--page-gap));
    overflow: hidden;

    :deep(.el-card__header) {
        flex-shrink: 0;
        padding: 14px 20px;
        border-bottom: 1px solid var(--el-border-color-lighter);
    }
    :deep(.el-card__body) {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        padding: 0;
    }
}

.page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.page-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.page-icon {
    font-size: 18px;
    color: var(--el-color-primary);
}

.page-title {
    font-size: 16px;
    font-weight: 600;
}

.month-picker {
    width: 150px;

    :deep(.el-input__inner) {
        font-size: 14px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        text-align: center;
    }
}

/* ========== 日历 ========== */
.calendar-wrapper {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    padding: 16px 20px 20px;
    overflow: hidden;
}

.weekday-row {
    flex-shrink: 0;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin-bottom: 1px;
    background: var(--el-border-color-lighter);
}

.weekday {
    padding: 10px 0;
    font-size: 13px;
    font-weight: 500;
    text-align: center;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    border-right: 1px solid var(--el-border-color-lighter);

    &:last-child {
        border-right: none;
    }
}

.calendar-grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    grid-template-rows: repeat(6, minmax(0, 1fr));
    gap: 1px;
    background: var(--el-border-color-lighter);
}

.day-cell {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 0;
    padding: 8px 10px;
    overflow: hidden;
    background: var(--el-bg-color);
    cursor: pointer;
    transition: background-color 0.12s ease;

    &:hover {
        background: var(--el-fill-color-light);
    }

    &.is-other-month {
        background: var(--el-fill-color-lighter);

        .day-number {
            color: var(--el-text-color-placeholder);
        }
        .day-amount {
            opacity: 0.5;
        }
    }

    &.is-today {
        position: relative;
        background: #fff7ed;

        &::before {
            content: "";
            position: absolute;
            inset: 0 0 auto 0;
            height: 2px;
            background: #f97316;
        }

        .day-number {
            color: #ea580c;
            font-weight: 700;
        }
    }
}

.day-header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
}

.day-number {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    font-variant-numeric: tabular-nums;
}

.today-tag {
    width: 18px;
    height: 18px;
    font-size: 11px;
    line-height: 18px;
    text-align: center;
    color: #fff;
    background: #f97316;
    border-radius: 2px;
}

.day-body {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 10px;
    padding: 2px 0;
    overflow: hidden;
}

.day-amount {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    .money-color();

    .label {
        .money-tag();
    }

    .value {
        overflow: hidden;
        font-weight: 600;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

/* ========== 弹窗 ========== */
.detail-list {
    display: flex;
    flex-direction: column;
}

.detail-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    font-size: 14px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    &:last-child {
        border-bottom: none;
    }
    &.total {
        margin-top: 4px;
        font-weight: 600;
        border-top: 1px solid var(--el-border-color);
        border-bottom: none;
    }
}

.detail-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--el-text-color-regular);

    .label {
        .money-tag(20px, 12px);
    }
}

.detail-value {
    font-size: 15px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--el-text-color-primary);
    .money-color();
}
</style>
