<template>
    <div class="archive-page">
        <!-- 左侧 A4 预览 -->
        <div class="preview-area">
            <div class="a4-sheet" v-loading="loading">
                <!-- 页眉 -->
                <div class="sheet-header">
                    <div class="sheet-title">账目归档</div>
                    <div class="sheet-sub">
                        <span>统计月份：{{ monthText }}</span>
                        <span>制表日期：{{ madeDate }}</span>
                    </div>
                </div>
                <!-- 分类收支 --->
                <div id="summary">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 26%">汇总</th>
                                <th style="width: 37%">收入汇总</th>
                                <th style="width: 37%">支出汇总</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="vertical-align: top">
                                    <div class="summary-list">
                                        <div class="summary-item">
                                            <span>总收入</span>
                                            <span class="num income">{{ formatAmount(summary.income) }}</span>
                                        </div>
                                        <div class="summary-item">
                                            <span>总支出</span>
                                            <span class="num expense">{{ formatAmount(summary.expense) }}</span>
                                        </div>
                                        <div class="summary-item">
                                            <span>结余</span>
                                            <span class="num" :class="summary.balance >= 0 ? 'income' : 'expense'">{{ formatAmount(summary.balance) }}</span>
                                        </div>
                                        <div class="summary-item">
                                            <span>笔数</span>
                                            <span class="num">{{ summary.count }}</span>
                                        </div>
                                    </div>
                                </td>
                                <td style="vertical-align: top">
                                    <div class="cat-list">
                                        <div v-if="incomeCategoryRows.length === 0" class="empty">本月暂无收入</div>
                                        <div v-for="row in incomeCategoryRows" :key="'i-' + row.categoryId" class="cat-item">
                                            <span class="cat-name">{{ row.categoryName }}</span>
                                            <span class="num income">{{ formatAmount(row.amount) }}</span>
                                        </div>
                                        <div v-if="incomeCategoryRows.length > 0" class="cat-total">
                                            <span>收入合计</span>
                                            <span class="num income">{{ formatAmount(summary.income) }}</span>
                                        </div>
                                    </div>
                                </td>
                                <td style="vertical-align: top">
                                    <div class="cat-list">
                                        <div v-if="expenseCategoryRows.length === 0" class="empty">本月暂无支出</div>
                                        <div v-for="row in expenseCategoryRows" :key="'e-' + row.categoryId" class="cat-item">
                                            <span class="cat-name">{{ row.categoryName }}</span>
                                            <span class="num expense">{{ formatAmount(row.amount) }}</span>
                                        </div>
                                        <div v-if="expenseCategoryRows.length > 0" class="cat-total">
                                            <span>支出合计</span>
                                            <span class="num expense">{{ formatAmount(summary.expense) }}</span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- 备注 -->
                <div v-if="showRemark" class="remark-row">
                    <span class="remark-label">备注：</span>
                    <span class="remark-text">{{ remark }}</span>
                </div>

                <!-- 明细 -->
                <div v-if="showDetail">
                    <table>
                        <thead>
                            <tr>
                                <th style="min-width: 65px">日期</th>
                                <th style="min-width: 90px">分类</th>
                                <th>备注</th>
                                <th style="min-width: 30px">收支</th>
                                <th>金额</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(row, idx) in detailRows" :key="row.id || idx">
                                <td v-if="row.dateRowspan > 0" :rowspan="row.dateRowspan">{{ row.dateText }}</td>
                                <td>{{ row.categoryText }}</td>
                                <td class="remark-cell">{{ row.remark || "-" }}</td>
                                <td class="num" :class="row.direction === '收' ? 'income' : 'expense'">{{ row.direction }}</td>
                                <td class="num" :class="row.direction === '收' ? 'income' : 'expense'">
                                    {{ formatSignedAmount(row.signedAmount) }}
                                </td>
                            </tr>
                            <tr v-if="detailRows.length === 0">
                                <td colspan="5" class="empty">本月暂无明细</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- 右侧操作区 -->
        <div class="side-panel">
            <div class="panel-title">归档打印</div>

            <div class="panel-block">
                <div class="block-label">统计月份</div>
                <el-date-picker
                    v-model="month"
                    type="month"
                    format="YYYY年MM月"
                    value-format="YYYY-MM"
                    :clearable="false"
                    :editable="false"
                    style="width: 100%"
                    @change="onMonthChange" />
                <div class="month-nav">
                    <el-button size="small" @click="changeMonth(-1)">上个月</el-button>
                    <el-button size="small" @click="goCurrentMonth">本月</el-button>
                    <el-button size="small" @click="changeMonth(1)">下个月</el-button>
                </div>
            </div>

            <div class="panel-block">
                <div class="block-label">备注</div>
                <el-input v-model="remark" type="textarea" :rows="3" placeholder="归档备注（可选）" />
            </div>

            <div class="panel-block">
                <div class="block-label">制表日期</div>
                <el-date-picker v-model="madeDate" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD" :clearable="false" style="width: 100%" />
            </div>

            <div class="panel-block">
                <el-checkbox v-model="showRemark">备注</el-checkbox>
                <el-checkbox v-model="showDetail">明细</el-checkbox>
            </div>

            <div class="btn-row">
                <el-button type="primary" :icon="Refresh" :loading="loading" @click="loadData">刷新数据</el-button>
                <el-button type="success" :icon="Printer" :disabled="loading" @click="onPrint">打印</el-button>
            </div>
        </div>
    </div>
</template>

<script>
import { Refresh, Printer } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import { GetTransactions, Getcategory, GetChartCategory } from "../../api/basic.js";
import { msg } from "../../utils/message.ts";
import { withDelay, convertToLimitOffset } from "../../utils/common.js";
import { getCategoryPath } from "../../utils/category.js";
import { formatAmountValue } from "../../utils/utils.js";
import { SK_LEDGER_ALL_CATEGORY } from "../../utils/constants.js";
import { ePrinter } from "./print.js";
import ePrintCss from "./eprintrt.css?raw";
const PAGE_SIZE = 100;

export default {
    name: "ArchivePrint",
    setup() {
        return { Refresh, Printer };
    },
    data() {
        return {
            loading: false,
            month: dayjs().format("YYYY-MM"),
            madeDate: dayjs().format("YYYY-MM-DD"),
            remark: "",
            showRemark: true,
            showDetail: true,
            transactions: [],
            categoryTree: [],
            incomeList: [],
            expenseList: [],
        };
    },
    computed: {
        monthText() {
            return this.month ? dayjs(this.month + "-01").format("YYYY年MM月") : "";
        },
        incomeCategoryRows() {
            return [...this.incomeList].map((r) => ({ ...r, amount: Number(r.amount) || 0 })).sort((a, b) => b.amount - a.amount);
        },
        expenseCategoryRows() {
            return [...this.expenseList].map((r) => ({ ...r, amount: Number(r.amount) || 0 })).sort((a, b) => b.amount - a.amount);
        },
        summary() {
            const incomeFromChart = this.incomeList.reduce((s, r) => s + (Number(r.amount) || 0), 0);
            const expenseFromChart = this.expenseList.reduce((s, r) => s + (Number(r.amount) || 0), 0);
            const hasChart = this.incomeList.length > 0 || this.expenseList.length > 0;
            let income = incomeFromChart;
            let expense = expenseFromChart;
            if (!hasChart) {
                income = 0;
                expense = 0;
                this.transactions.forEach((t) => {
                    const amount = Number(t.amount) || 0;
                    if (amount >= 0) income += amount;
                    else expense += Math.abs(amount);
                });
            }
            return {
                income: Number(income.toFixed(2)),
                expense: Number(expense.toFixed(2)),
                balance: Number((income - expense).toFixed(2)),
                count: this.transactions.length,
            };
        },
        detailRows() {
            const tree = this.categoryTree;
            const baseRows = this.transactions.map((t) => {
                const amount = Number(t.amount) || 0;
                const path = getCategoryPath(tree, t.category_id) || t.category_title || "未知分类";
                return {
                    id: t.id,
                    dateText: dayjs(t.occ_time).format("YYYY-MM-DD"),
                    categoryText: path,
                    remark: t.remark,
                    direction: amount >= 0 ? "收" : "支",
                    signedAmount: Number(amount.toFixed(2)),
                    dateRowspan: 0,
                };
            });
            let i = 0;
            while (i < baseRows.length) {
                let j = i;
                while (j < baseRows.length && baseRows[j].dateText === baseRows[i].dateText) {
                    j++;
                }
                baseRows[i].dateRowspan = j - i;
                i = j;
            }
            return baseRows;
        },
    },
    created() {
        this.loadAll();
    },
    methods: {
        formatAmount(val) {
            return formatAmountValue(val);
        },
        formatSignedAmount(val) {
            const num = Number(val) || 0;
            const sign = num >= 0 ? "+" : "-";
            return `${sign}${formatAmountValue(Math.abs(num))}`;
        },
        onMonthChange() {
            this.loadAll();
        },
        changeMonth(offset) {
            const base = this.month ? dayjs(this.month + "-01") : dayjs();
            this.month = base.add(offset, "month").format("YYYY-MM");
            this.loadAll();
        },
        goCurrentMonth() {
            this.month = dayjs().format("YYYY-MM");
            this.loadAll();
        },
        loadData() {
            this.loadAll();
        },
        async loadAll() {
            await Promise.all([this.loadCategory(), this.loadTransactions(), this.loadCategoryChart()]);
        },
        async loadCategory() {
            try {
                const cached = window.localStorage.getItem(SK_LEDGER_ALL_CATEGORY);
                if (cached) {
                    this.categoryTree = JSON.parse(cached);
                    return;
                }
                const results = await Promise.allSettled([Getcategory({ direction: 1 }), Getcategory({ direction: 2 })]);
                const list = [];
                results.forEach((r) => {
                    if (r.status === "fulfilled") {
                        const items = r.value.payload?.items;
                        if (Array.isArray(items)) list.push(...items);
                    }
                });
                window.localStorage.setItem(SK_LEDGER_ALL_CATEGORY, JSON.stringify(list));
                this.categoryTree = list;
            } catch (e) {
                console.error("加载分类失败", e);
            }
        },
        buildMonthRange() {
            const start = dayjs(this.month + "-01").startOf("month");
            const end = start.endOf("month");
            return { from: start.valueOf(), to: end.valueOf() };
        },
        async loadTransactions() {
            this.loading = true;
            try {
                const { from, to } = this.buildMonthRange();
                const params = {
                    ...convertToLimitOffset(1, PAGE_SIZE),
                    from,
                    to,
                    sort: "occ_at",
                    order: "asc",
                };
                const res = await withDelay(() => GetTransactions(params));
                const items = res.payload?.items || [];
                items.forEach((item) => {
                    item.category_title = getCategoryPath(this.categoryTree, item.category_id) || "未知分类";
                });
                this.transactions = items;
            } catch (err) {
                msg.error("加载归档数据失败：" + err);
            } finally {
                this.loading = false;
            }
        },
        buildMonthRangeForChart() {
            const start = dayjs(this.month + "-01").startOf("month");
            const end = start.endOf("month");
            return {
                from: start.format("YYYY-MM-DD"),
                to: end.format("YYYY-MM-DD"),
            };
        },
        async loadCategoryChart() {
            try {
                const { from, to } = this.buildMonthRangeForChart();
                const res = await withDelay(() => GetChartCategory({ from, to, lg: 1 }));
                const payload = res.payload || {};
                this.incomeList = payload.incomeList || [];
                this.expenseList = payload.expenseList || [];
            } catch (err) {
                console.error("加载大类汇总失败：", err);
                this.incomeList = [];
                this.expenseList = [];
            }
        },

        onPrint() {
            const dom = this.$el.querySelector(".a4-sheet");
            ePrinter(dom, ePrintCss);
        },
    },
};
</script>

<style scoped>
@import url(./eprintrt.css);
.archive-page {
    display: flex;
    gap: 24px;
    padding: 20px;
    min-height: 100vh;
    box-sizing: border-box;

    .side-panel {
        width: 260px;
        flex-shrink: 0;
        background: #fff;
        border-radius: 8px;
        padding: 16px;
        height: fit-content;
        position: sticky;
        top: 20px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        box-sizing: border-box;

        .panel-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            color: #303133;
        }

        .panel-block {
            margin-bottom: 16px;

            .block-label {
                font-size: 13px;
                color: #606266;
                margin-bottom: 6px;
            }

            .month-nav {
                display: flex;
                gap: 6px;
                margin-top: 8px;

                .el-button {
                    flex: 1;
                }
            }
        }

        .btn-row {
            display: flex;
            gap: 8px;

            .el-button {
                flex: 1;
                width: 50%;
                margin-left: 0;
            }
        }
    }

    .preview-area {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        .a4-sheet {
            width: 210mm;
            background: #fff;
            padding: 50px;
            box-sizing: border-box;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
    }
}
</style>
