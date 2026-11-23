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
                <!-- 分类收支 -->
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
                                            <span class="fw-7 income">{{ formatAmount(summary.income) }}</span>
                                        </div>
                                        <div class="summary-item">
                                            <span>总支出</span>
                                            <span class="fw-7 expense">{{ formatAmount(summary.expense) }}</span>
                                        </div>
                                        <div class="summary-item">
                                            <span>结余</span>
                                            <span class="fw-7" :class="summary.balance >= 0 ? 'income' : 'expense'">{{ formatAmount(summary.balance) }}</span>
                                        </div>
                                        <div class="summary-item">
                                            <span>笔数</span>
                                            <span class="fw-7">{{ summary.count }}</span>
                                        </div>
                                    </div>
                                </td>
                                <td style="vertical-align: top">
                                    <div class="cat-list">
                                        <div v-if="incomeCategoryRows.length === 0" class="empty">本月暂无收入</div>
                                        <div v-for="row in incomeCategoryRows" :key="'i-' + row.categoryId" class="cat-item">
                                            <span class="cat-name">{{ row.categoryName }}</span>
                                            <span class="fw-7 income">{{ formatAmount(row.amount) }}</span>
                                        </div>
                                        <div v-if="incomeCategoryRows.length > 0" class="cat-total">
                                            <span>收入合计</span>
                                            <span class="fw-7 income">{{ formatAmount(summary.income) }}</span>
                                        </div>
                                    </div>
                                </td>
                                <td style="vertical-align: top">
                                    <div class="cat-list">
                                        <div v-if="expenseCategoryRows.length === 0" class="empty">本月暂无支出</div>
                                        <div v-for="row in expenseCategoryRows" :key="'e-' + row.categoryId" class="cat-item">
                                            <span class="cat-name">{{ row.categoryName }}</span>
                                            <span class="fw-7 expense">{{ formatAmount(row.amount) }}</span>
                                        </div>
                                        <div v-if="expenseCategoryRows.length > 0" class="cat-total">
                                            <span>支出合计</span>
                                            <span class="fw-7 expense">{{ formatAmount(summary.expense) }}</span>
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
                <div v-if="showDetail" class="detail">
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
                                <td class="remark-cell">{{ row.remark || "" }}</td>
                                <td>{{ row.direction === "收" ? "+" : "−" }}</td>
                                <td class="num">{{ formatSignedAmount(row.signedAmount) }}</td>
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
                <el-input v-model="remark" type="textarea" :rows="3" placeholder="备注" />
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
import { formatAmountValue, SessStor } from "../../utils/utils.js";
import { SK_LEDGER_ALL_CATEGORY } from "../../utils/constants.js";
import { setRouteQuery, getRouteQuery } from "../../utils/routeQuery";
import { ePrinter } from "./printer.js";
import ePrintCss from "./eprinter.css?raw";

const PAGE_SIZE = 100;
const QUERY_KEYS = ["month", "made"];
const QUERY_DEFAULTS = { month: "", made: "" };

// Normalize a category list: coerce amount to number and sort by amount desc.
// Single source of truth for the {amount} type used by both rendering and summing.
function normalizeRows(list) {
    return [...list].map((r) => ({ ...r, amount: Number(r.amount) || 0 })).sort((a, b) => b.amount - a.amount);
}

// Sum the already-normalized numeric `amount` across rows
function sumRows(rows) {
    return rows.reduce((s, r) => s + r.amount, 0);
}

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
            isReady: false,
        };
    },
    computed: {
        // Display text for the selected month, e.g. "2024年06月"
        monthText() {
            return this.month ? dayjs(this.month + "-01").format("YYYY年MM月") : "";
        },

        // Query params to keep in sync with the URL
        urlQuery() {
            return { month: this.month || "", made: this.madeDate || "" };
        },

        // Income category rows, normalized and sorted by amount desc
        incomeCategoryRows() {
            return normalizeRows(this.incomeList);
        },
        // Expense category rows, normalized and sorted by amount desc
        expenseCategoryRows() {
            return normalizeRows(this.expenseList);
        },

        // Aggregate summary. Reuses the normalized rows so amounts are not
        // re-coerced and the raw lists are not iterated a second time.
        summary() {
            const incomeRows = this.incomeCategoryRows;
            const expenseRows = this.expenseCategoryRows;
            const hasChart = incomeRows.length > 0 || expenseRows.length > 0;

            let income = 0;
            let expense = 0;

            if (hasChart) {
                income = sumRows(incomeRows);
                expense = sumRows(expenseRows);
            } else {
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

        // Detail rows with category path resolved and date rowspan computed
        detailRows() {
            const tree = this.categoryTree;
            const rows = this.transactions.map((t) => {
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

            // Set rowspan on the first row of each consecutive date group
            let i = 0;
            while (i < rows.length) {
                let j = i + 1;
                while (j < rows.length && rows[j].dateText === rows[i].dateText) j++;
                rows[i].dateRowspan = j - i;
                i = j;
            }
            return rows;
        },
    },
    watch: {
        // Sync current filters to the URL whenever they change
        urlQuery() {
            this.syncToUrl();
        },
    },
    created() {
        // Restore filters from the URL query
        const saved = getRouteQuery(this.$route, QUERY_KEYS, QUERY_DEFAULTS);

        const month = this.parseDatePart(saved.month, "month");
        if (month) this.month = month;

        const made = this.parseDatePart(saved.made, "day");
        if (made) this.madeDate = made;

        // Mark ready after mount so the first syncToUrl is skipped
        this.$nextTick(() => {
            this.isReady = true;
        });

        this.loadAll();
    },
    methods: {
        /**
         * Parse a URL date parameter.
         * @param {string} val
         * @param {"month"|"day"} precision
         * @returns {string|null} normalized "YYYY-MM" or "YYYY-MM-DD", or null if invalid
         */
        parseDatePart(val, precision) {
            if (!val) return null;
            const re = precision === "month" ? /^([0-9]{4})-([0-9]{1,2})$/ : /^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})$/;
            const m = re.exec(String(val).trim());
            if (!m) return null;

            const year = Number(m[1]);
            const month = Number(m[2]);
            const day = precision === "day" ? Number(m[3]) : 1;
            if (year < 1900 || year > 3000 || month < 1 || month > 12) return null;
            if (day < 1 || day > 31) return null;

            const pad = (n) => String(n).padStart(2, "0");
            return precision === "month" ? `${year}-${pad(month)}` : `${year}-${pad(month)}-${pad(day)}`;
        },

        syncToUrl() {
            if (!this.isReady) return;
            setRouteQuery(this.$router, this.$route, this.urlQuery);
        },

        formatAmount(val) {
            return formatAmountValue(val);
        },

        formatSignedAmount(val) {
            const num = Number(val) || 0;
            return `${num >= 0 ? "+" : "-"}${formatAmountValue(Math.abs(num))}`;
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
            await this.loadCategory();
            await Promise.all([this.loadTransactions(), this.loadCategoryChart()]);
        },

        async loadCategory() {
            try {
                const storage = SessStor(SK_LEDGER_ALL_CATEGORY, []);
                const cached = storage.get();
                if (Array.isArray(cached) && cached.length > 0) {
                    this.categoryTree = cached;
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
                storage.set(list);
                this.categoryTree = list;
            } catch (e) {
                console.error("加载分类失败", e);
            }
        },

        buildMonthRange() {
            const start = dayjs(this.month + "-01").startOf("month");
            return { from: start.valueOf(), to: start.endOf("month").valueOf() };
        },

        buildMonthRangeForChart() {
            const start = dayjs(this.month + "-01").startOf("month");
            return {
                from: start.format("YYYY-MM-DD"),
                to: start.endOf("month").format("YYYY-MM-DD"),
            };
        },

        // Paginate through all transactions in the selected month.
        // Assignment happens only on success, so the previous month's rows
        // stay visible until the new data is fully fetched.
        async loadTransactions() {
            this.loading = true;
            try {
                const { from, to } = this.buildMonthRange();
                const allItems = [];
                let page = 1;
                let total = null; // total count from API, if provided
                let fetched = 0; // items fetched so far

                while (true) {
                    const params = {
                        ...convertToLimitOffset(page, PAGE_SIZE),
                        from,
                        to,
                        sort: "occ_at",
                        order: "asc",
                    };
                    const res = await withDelay(() => GetTransactions(params), 200);
                    const items = res.payload?.items || [];

                    const pageTotal = Number(res.payload?.page_info?.total);
                    if (Number.isFinite(pageTotal)) total = pageTotal;

                    allItems.push(...items);
                    fetched += items.length;

                    if (items.length === 0) break;
                    const hasMore = total != null ? fetched < total : items.length === PAGE_SIZE;
                    if (!hasMore) break;

                    page += 1;
                }

                // Resolve category paths against the loaded tree
                allItems.forEach((item) => {
                    item.category_title = getCategoryPath(this.categoryTree, item.category_id) || "未知分类";
                });

                this.transactions = allItems;
            } catch (err) {
                msg.error("加载数据失败：" + err);
            } finally {
                this.loading = false;
            }
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
@import url(./eprinter.css);

.archive-page {
    display: flex;
    gap: 24px;
    padding: 20px;
    min-height: 100vh;
    box-sizing: border-box;
}

.archive-page .side-panel {
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
}

.archive-page .side-panel .panel-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: #303133;
}

.archive-page .side-panel .panel-block {
    margin-bottom: 16px;
}

.archive-page .side-panel .panel-block .block-label {
    font-size: 13px;
    color: #606266;
    margin-bottom: 6px;
}

.archive-page .side-panel .panel-block .month-nav {
    display: flex;
    gap: 6px;
    margin-top: 8px;
}

.archive-page .side-panel .panel-block .month-nav .el-button {
    flex: 1;
}

.archive-page .side-panel .btn-row {
    display: flex;
    gap: 8px;
}

.archive-page .side-panel .btn-row .el-button {
    flex: 1;
    margin-left: 0;
}

.archive-page .preview-area {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: flex-start;
}

.archive-page .preview-area .a4-sheet {
    width: 210mm;
    background: #fff;
    padding: 12mm;
    box-sizing: border-box;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
</style>
