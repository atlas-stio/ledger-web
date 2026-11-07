<template>
    <div>
        <el-card class="transactions-card">
            <template #header>
                <div class="my_refresh">
                    <span>记账管理</span>
                    <el-space>
                        <el-date-picker
                            v-model="monthPicker"
                            style="width: 140px"
                            type="month"
                            format="YYYY年MM月"
                            :clearable="false"
                            :editable="false"
                            placeholder="选择月份"
                            @change="onMonthPickerChange" />
                        <el-button-group>
                            <el-button title="上个月" @click="changeMonth(-1)">
                                <el-icon><ArrowLeft /></el-icon>
                            </el-button>
                            <el-button @click="goToday">本月</el-button>
                            <el-button title="下个月" @click="changeMonth(1)">
                                <el-icon><ArrowRight /></el-icon>
                            </el-button>
                        </el-button-group>
                        <el-input v-model="searchForm.keyword" clearable placeholder="备注" style="width: 160px" @keyup.enter="onSearch" />
                        <el-button type="primary" @click="onSearch">查询</el-button>
                        <el-button @click="onResetSearch">重置</el-button>
                        <el-popover
                            v-model:visible="advancedVisible"
                            placement="bottom-end"
                            :width="360"
                            trigger="manual"
                            popper-class="advanced-search-popper">
                            <template #reference>
                                <el-button type="primary" plain class="advanced-btn" @click.stop="advancedVisible = !advancedVisible">
                                    高级查询
                                    <el-badge v-if="advancedCount > 0" :value="advancedCount" class="advanced-badge" />
                                </el-button>
                            </template>
                            <div ref="popoverContentRef">
                                <el-form :model="searchForm" label-width="70px" class="advanced-form">
                                    <el-form-item label="备注">
                                        <el-input v-model="searchForm.keyword" clearable placeholder="备注" style="width: 100%" @keyup.enter="onSearch" />
                                    </el-form-item>
                                    <el-form-item label="分类">
                                        <el-tree-select
                                            v-model="searchForm.cid"
                                            :data="categoryTree"
                                            :props="{ label: 'name', value: 'id', children: 'children' }"
                                            check-strictly
                                            clearable
                                            filterable
                                            :teleported="false"
                                            placeholder="全部分类"
                                            style="width: 100%" />
                                    </el-form-item>
                                    <el-form-item label="收支">
                                        <el-radio-group v-model="searchForm.direction" class="direction-radio-group">
                                            <el-radio border :value="0">全部</el-radio>
                                            <el-radio border :value="1">收入</el-radio>
                                            <el-radio border :value="2">支出</el-radio>
                                        </el-radio-group>
                                    </el-form-item>
                                    <el-form-item label="时间">
                                        <el-date-picker
                                            v-model="searchForm.dateRange"
                                            type="daterange"
                                            value-format="x"
                                            range-separator="至"
                                            start-placeholder="开始日期"
                                            end-placeholder="结束日期"
                                            :teleported="false"
                                            style="width: 100%" />
                                    </el-form-item>
                                    <el-form-item label="金额">
                                        <div class="amount-range">
                                            <el-input v-model="searchForm.min_amount" placeholder="最小" clearable style="width: 120px" />
                                            <span class="amount-sep">-</span>
                                            <el-input v-model="searchForm.max_amount" placeholder="最大" clearable style="width: 120px" />
                                        </div>
                                    </el-form-item>
                                    <el-form-item label="排序">
                                        <div class="sort-row">
                                            <el-select
                                                v-model="searchForm.sort"
                                                placeholder="默认(交易时间)"
                                                clearable
                                                :teleported="false"
                                                style="flex: 1; min-width: 0"
                                                @clear="searchForm.order = ''">
                                                <el-option label="交易时间" value="occ_at" />
                                                <el-option label="金额" value="amount" />
                                                <el-option label="创建时间" value="create_time" />
                                            </el-select>
                                            <el-select
                                                v-model="searchForm.order"
                                                placeholder="默认(降序)"
                                                clearable
                                                :teleported="false"
                                                :disabled="!searchForm.sort"
                                                style="width: 110px; margin-left: 8px">
                                                <el-option label="降序" value="desc" />
                                                <el-option label="升序" value="asc" />
                                            </el-select>
                                        </div>
                                    </el-form-item>
                                    <el-form-item>
                                        <el-button type="primary" @click="onSearch">查询</el-button>
                                        <el-button @click="onResetSearch">重置</el-button>
                                        <el-button @click="advancedVisible = false">取消</el-button>
                                    </el-form-item>
                                </el-form>
                            </div>
                        </el-popover>

                        <el-button type="success" @click="onImportBill">导入</el-button>
                        <el-button type="success" @click="onAddBill">记一笔</el-button>
                        <el-button type="primary" :icon="Refresh" @click="onRefresh" :loading="loading">刷新</el-button>
                    </el-space>
                </div>
            </template>

            <MyTable :data="transactions" :columns="columns" v-loading="loading">
                <template #occ_time="{ row }">
                    {{ formatDate(row.occ_time) }}
                </template>
                <template #category_title="{ row }">
                    {{ row.category_title }}
                </template>
                <template #amount="{ row }">
                    <span :style="{ color: row.amount > 0 ? '#f53f3f' : undefined }">
                        {{ row.amount }}
                    </span>
                </template>
                <template #remark="{ row }">
                    {{ row.remark }}
                </template>
                <template #action="{ row }">
                    <el-button link type="primary" @click="onDetail(row)">详情</el-button>
                    <el-button link type="primary" @click="onUpdate(row)">修改</el-button>
                    <el-button link type="primary" @click="onDeleteTransactions(row)">删除</el-button>
                </template>
            </MyTable>

            <div class="pagination">
                <pagination :pageTotal="pageTotal" :pageSize="pageSize" @syncsize="onSyncsize" @CurrentChange="onCurrentChange" @SizeChange="onSizeChange" />
            </div>
        </el-card>
        <add-transactions ref="AddTransactions" />
        <UpdateTransactions ref="UpdateTransactions" />
        <TranDetail ref="TranDetail" />
        <ImportBill ref="ImportBill" />
    </div>
</template>

<script>
import { Refresh, ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import { ElMessageBox } from "element-plus";
import MyTable from "../../components/MyTable/MyTable.vue";
import AddTransactions from "./AddTransactions.vue";
import UpdateTransactions from "./update.vue";
import ImportBill from "./import.vue";
import TranDetail from "./detail.vue";
import { GetTransactions, Getcategory, DelTransactions } from "../../api/basic.js";
import { msg } from "../../utils/message.ts";
import { withDelay, convertToLimitOffset } from "../../utils/common.js";
import { getCategoryPath } from "../../utils/category.js";
import { formatTime } from "../../utils/date.js";
import { getRouteQuery } from "../../utils/routeQuery";

const SK_LEDGER_ALL_CATEGORY = "LEDGER_ALL_CATEGORY";
const DEFAULT_PAGE_SIZE = 10;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// 排序白名单
const SORT_WHITELIST = ["occ_at", "amount", "create_time"];
const ORDER_WHITELIST = ["asc", "desc"];

// URL 里与搜索相关的参数 key（不含分页 s/p）
const SEARCH_KEYS = ["cid", "keyword", "direction", "from", "to", "min_amount", "max_amount", "sort", "order"];
// 从 URL 读取时关注的 key（含分页）
const QUERY_KEYS = ["s", "p", ...SEARCH_KEYS];

// 判断搜索值是否为空
function isEmpty(v) {
    return v === "" || v == null;
}

// 空搜索表单
function emptySearchForm() {
    return {
        cid: null,
        keyword: "",
        direction: 0,
        dateRange: null,
        min_amount: "",
        max_amount: "",
        sort: "",
        order: "",
    };
}

function isInsidePopper(target) {
    if (!(target instanceof Element)) return false;
    return !!(
        target.closest(".el-popper") ||
        target.closest(".el-select__popper") ||
        target.closest(".el-picker__popper") ||
        target.closest(".el-tree-select__popper") ||
        target.closest(".el-dropdown__popper")
    );
}

export default {
    name: "TransactionsIndex",
    components: { MyTable, AddTransactions, UpdateTransactions, TranDetail, ImportBill },
    setup() {
        return { Refresh, ArrowLeft, ArrowRight };
    },
    data() {
        return {
            loading: true,
            pageTotal: 0,
            pageSize: DEFAULT_PAGE_SIZE,
            page: 1,
            monthPicker: new Date(),
            transactions: Array.from({ length: 5 }, () => ({})),
            category: [],
            columns: [
                { label: "交易时间", slot: "occ_time" },
                { label: "类别", slot: "category_title" },
                { label: "金额(¥)", slot: "amount" },
                { label: "备注", slot: "remark" },
                { label: "操作", slot: "action" },
            ],
            isReady: false,
            advancedVisible: false,
            searchForm: emptySearchForm(),
        };
    },
    computed: {
        categoryTree() {
            return this.category;
        },
        advancedCount() {
            const f = this.searchForm;
            return [
                f.cid,
                f.direction,
                Array.isArray(f.dateRange) && f.dateRange.length === 2 ? 1 : null,
                isEmpty(f.min_amount) ? null : 1,
                isEmpty(f.max_amount) ? null : 1,
                f.sort ? 1 : null,
                f.order ? 1 : null,
            ].filter(Boolean).length;
        },
    },
    mounted() {
        document.addEventListener("click", this.handleOutsideClick, true);
    },
    beforeUnmount() {
        document.removeEventListener("click", this.handleOutsideClick, true);
        this.$globalBus.off("onRefresh", this.refreshHandler);
    },
    created() {
        this.$globalBus.emit("updateActivePath", "/transactions");
        this.refreshHandler = () => this.onRefresh();
        this.$globalBus.on("onRefresh", this.refreshHandler);

        this.restoreFromUrl();
        this.$nextTick(() => {
            this.isReady = true;
        });
        this.onRefresh();
    },
    methods: {
        // ===== 工具方法 =====
        formatDate(time) {
            return formatTime(time);
        },

        // ===== 弹框外部点击关闭 =====
        handleOutsideClick(e) {
            if (!this.advancedVisible) return;
            const el = this.$refs.popoverContentRef;
            if (el && el.contains(e.target)) return;
            if (isInsidePopper(e.target)) return;
            this.advancedVisible = false;
        },

        // ===== URL 同步 =====
        replaceQuery(extra) {
            if (!this.isReady) return;
            const newQuery = { ...this.$route.query };
            SEARCH_KEYS.forEach((k) => delete newQuery[k]);
            Object.assign(newQuery, extra);
            newQuery.s = this.pageSize;
            this.$router.replace({ path: this.$route.path, query: newQuery });
        },

        syncToUrl() {
            this.replaceQuery({ ...this.buildSearchParams(), p: this.page });
        },

        clearSearchQueryInUrl() {
            this.replaceQuery({ p: 1 });
        },

        // ===== 参数构建 =====
        buildSearchParams() {
            const f = this.searchForm;
            const p = {};
            if (f.cid) p.cid = f.cid;
            if (f.keyword) p.keyword = f.keyword.trim();
            if (f.direction) p.direction = f.direction;
            if (Array.isArray(f.dateRange) && f.dateRange.length === 2) {
                p.from = Number(f.dateRange[0]);
                p.to = Number(f.dateRange[1]) + ONE_DAY_MS;
            }
            if (!isEmpty(f.min_amount)) p.min_amount = String(f.min_amount);
            if (!isEmpty(f.max_amount)) p.max_amount = String(f.max_amount);
            if (SORT_WHITELIST.includes(f.sort)) p.sort = f.sort;
            if (ORDER_WHITELIST.includes(f.order)) p.order = f.order;
            return p;
        },

        // ===== 查询动作 =====
        onSearch() {
            this.page = 1;
            this.advancedVisible = false;
            this.syncToUrl();
            this.loadGetBill(this.pageSize, 1);
        },

        onResetSearch() {
            this.searchForm = emptySearchForm();
            this.page = 1;
            this.advancedVisible = false;
            this.clearSearchQueryInUrl();
            this.loadGetBill(this.pageSize, 1);
        },

        // ===== 月份切换 =====
        onMonthPickerChange(val) {
            if (!val) return;
            const d = new Date(val);
            this.applyMonthRange(d.getFullYear(), d.getMonth());
        },

        changeMonth(offset) {
            const base = this.monthPicker ? new Date(this.monthPicker) : new Date();
            const target = new Date(base.getFullYear(), base.getMonth() + offset, 1);
            this.monthPicker = target;
            this.applyMonthRange(target.getFullYear(), target.getMonth());
        },

        goToday() {
            const now = new Date();
            this.monthPicker = now;
            this.applyMonthRange(now.getFullYear(), now.getMonth());
        },

        applyMonthRange(year, month) {
            // 该月 1 号 ~ 下月 1 号（applyDateRange 内部 to -1 天抵消 buildSearchParams 的 +1 天）
            this.applyDateRange(new Date(year, month, 1), new Date(year, month + 1, 1));
        },

        applyDateRange(fromDate, toDate) {
            // buildSearchParams 会给 to +1 天，这里先 -1 天抵消
            this.searchForm.dateRange = [fromDate.getTime(), toDate.getTime() - ONE_DAY_MS];
            this.page = 1;
            this.advancedVisible = false;
            this.syncToUrl();
            this.loadGetBill(this.pageSize, 1);
        },

        // ===== 分页 =====
        onSyncsize(s, p) {
            this.pageSize = s;
            this.page = p;
            this.syncToUrl();
            this.onRefresh();
        },
        onCurrentChange(p) {
            this.page = p;
            this.syncToUrl();
            this.loadGetBill(this.pageSize, p);
        },
        onSizeChange(s) {
            this.pageSize = s;
            this.page = 1;
            this.syncToUrl();
            this.loadGetBill(s, 1);
        },

        // ===== 数据加载 =====
        readCategoryTree() {
            try {
                const str = window.localStorage.getItem(SK_LEDGER_ALL_CATEGORY);
                return str ? JSON.parse(str) : [];
            } catch (e) {
                msg.error("分类数据解析失败：" + e);
                return [];
            }
        },

        async loadGetBill(pageSize, page) {
            this.loading = true;
            const params = { ...convertToLimitOffset(page, pageSize), ...this.buildSearchParams() };
            try {
                const res = await withDelay(() => GetTransactions(params));
                const items = res.payload?.items || [];
                const tree = this.readCategoryTree();
                items.forEach((item) => {
                    item.category_title = getCategoryPath(tree, item.category_id) || "未知分类";
                });
                this.transactions = items;
                this.pageTotal = res.payload?.page_info?.total || 0;
            } catch (err) {
                msg.error("账单列表请求异常：" + err);
            } finally {
                this.loading = false;
            }
        },

        async loadGetCategory() {
            try {
                const results = await Promise.allSettled([Getcategory({ direction: 1 }), Getcategory({ direction: 2 })]);
                const list = [];
                results.forEach((r) => {
                    if (r.status === "fulfilled") {
                        const items = r.value.payload?.items;
                        if (Array.isArray(items)) list.push(...items);
                    } else {
                        console.error("Category sub-request failed:", r.reason);
                    }
                });
                window.localStorage.setItem(SK_LEDGER_ALL_CATEGORY, JSON.stringify(list));
                this.category = list;
            } catch (err) {
                msg.error("分类加载异常：" + err);
            }
        },

        async onRefresh() {
            this.loading = true;
            await this.loadGetCategory();
            this.loadGetBill(this.pageSize, this.page);
        },

        // ===== 弹窗/操作 =====
        onImportBill() {
            this.$refs.ImportBill.onOpenDialog();
        },
        onAddBill() {
            this.$refs.AddTransactions.onOpenDialog();
        },
        onDetail(val) {
            this.$refs.TranDetail.onOpenDialog(val);
        },
        onUpdate(val) {
            this.$refs.UpdateTransactions.onOpenDialog(val);
        },

        onDeleteTransactions(val) {
            ElMessageBox.confirm(`确定删除这条金额为【${val.amount}】的账单吗？`, "删除确认", {
                confirmButtonText: "确认删除",
                cancelButtonText: "取消",
                type: "warning",
                draggable: true,
            })
                .then(async () => {
                    await DelTransactions(val.id);
                    msg.success("删除成功");
                    this.onRefresh();
                })
                .catch((err) => {
                    if (err) msg.error("删除失败：" + (err?.data?.metadata?.message || "未知错误"));
                });
        },

        // ===== 从 URL 恢复 =====
        restoreFromUrl() {
            const saved = getRouteQuery(this.$route, QUERY_KEYS, { s: DEFAULT_PAGE_SIZE, p: 1 });
            const s = Number(saved.s);
            const p = Number(saved.p);
            this.pageSize = Number.isFinite(s) && s > 0 ? s : DEFAULT_PAGE_SIZE;
            this.page = Number.isFinite(p) && p > 0 ? p : 1;

            const f = this.searchForm;
            f.cid = saved.cid ? Number(saved.cid) : null;
            f.keyword = saved.keyword || "";
            f.direction = saved.direction ? Number(saved.direction) : 0; // 默认 0 = 全部
            if (saved.from && saved.to) {
                f.dateRange = [Number(saved.from), Number(saved.to) - ONE_DAY_MS];
                const d = new Date(Number(saved.from));
                this.monthPicker = new Date(d.getFullYear(), d.getMonth(), 1);
            }
            f.min_amount = saved.min_amount || "";
            f.max_amount = saved.max_amount || "";
            f.sort = SORT_WHITELIST.includes(saved.sort) ? saved.sort : "";
            f.order = ORDER_WHITELIST.includes(saved.order) ? saved.order : "";
        },
    },
};
</script>

<style scoped>
.my_refresh {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
}

.advanced-form :deep(.el-form-item) {
    margin-bottom: 14px;
}

.advanced-form :deep(.el-form-item__label) {
    pointer-events: none;
}

.amount-range {
    display: flex;
    align-items: center;
}

.amount-sep {
    margin: 0 6px;
    color: #999;
}

.direction-radio-group {
    display: flex;
    width: 100%;
    gap: 8px;
}

.direction-radio-group :deep(.el-radio) {
    flex: 1;
    min-width: 0;
    margin: 0;
    justify-content: center;
}

.sort-row {
    display: flex;
    align-items: center;
    width: 100%;
}

/* 高级查询按钮 + 角标飘右上角 */
.advanced-btn {
    position: relative;
    overflow: visible;
}

.advanced-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    margin: 0;
    pointer-events: none;
}

/* 让 el-card 允许弹框溢出 */
.transactions-card {
    overflow: visible !important;
}
</style>
