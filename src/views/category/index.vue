<template>
    <el-card class="category-page" shadow="never">
        <template #header>
            <div class="page-header">
                <div class="page-header-left">
                    <el-icon class="page-icon"><Grid /></el-icon>
                    <span class="page-title">分类管理</span>
                </div>
                <el-button type="primary" :loading="loading" :disabled="sortMode.active" @click="loadAll()">刷新</el-button>
            </div>
        </template>

        <div class="layout" v-loading="loading">
            <!-- 左侧：主分类 -->
            <div class="col-main">
                <section v-for="panel in panels" :key="panel.direction" class="group" :class="`theme-${panel.theme}`">
                    <header class="group-header">
                        <div class="group-title">
                            <el-icon class="group-icon"><component :is="panel.icon" /></el-icon>
                            <span>{{ panel.title }}</span>
                            <span class="group-count">{{ panel.tree.length }}</span>
                        </div>
                        <el-space>
                            <template v-if="isSortingMain(panel.direction)">
                                <el-button size="small" @click="cancelSort">取消</el-button>
                                <el-button type="success" size="small" :loading="saving" @click="saveSortMain">完成</el-button>
                            </template>
                            <el-button
                                v-else
                                type="warning"
                                plain
                                size="small"
                                :disabled="sortMode.active || panel.tree.length < 2"
                                @click="startSort(panel.direction)">
                                排序
                            </el-button>
                            <el-button type="primary" size="small" :disabled="sortMode.active" @click="openCreate(panel.direction, 'main')">
                                新增主分类
                            </el-button>
                        </el-space>
                    </header>

                    <draggable
                        v-if="panel.tree.length"
                        :list="getTree(panel.direction)"
                        item-key="id"
                        class="main-grid"
                        :disabled="!isSortingMain(panel.direction)"
                        ghost-class="drag-ghost"
                        chosen-class="drag-chosen"
                        :animation="150"
                        @update:list="(l) => setTree(panel.direction, l)">
                        <template #item="{ element: cat }">
                            <article
                                class="main-card"
                                :class="{ active: isActive(panel.direction, cat.id), dragging: isSortingMain(panel.direction) }"
                                @click="select(panel.direction, cat.id)">
                                <span class="main-dot" />
                                <span class="main-name" :title="cat.name">{{ cat.name }}</span>
                                <span class="main-count">{{ cat.children?.length ?? 0 }}</span>
                                <button v-if="!isSortingMain(panel.direction)" class="main-edit" title="修改名称" @click.stop="openEdit(panel.direction, cat)">
                                    <el-icon><Edit /></el-icon>
                                </button>
                                <el-icon v-else class="drag-handle"><Rank /></el-icon>
                            </article>
                        </template>
                    </draggable>
                    <el-empty v-else description="暂无主分类" :image-size="56" />
                </section>
            </div>

            <!-- 右侧：子分类 -->
            <aside class="col-sub" :class="`theme-${currentTheme}`">
                <template v-if="current">
                    <header class="sub-head">
                        <div class="sub-head-title">
                            <span class="sub-dot" />
                            <span class="sub-name" :title="current.name">{{ current.name }}</span>
                            <span class="sub-count">{{ current.children?.length ?? 0 }}</span>
                        </div>
                        <el-space>
                            <template v-if="isSortingSub(current.id)">
                                <el-button size="small" @click="cancelSort">取消</el-button>
                                <el-button type="success" size="small" :loading="saving" @click="saveSortSub">完成</el-button>
                            </template>
                            <el-button
                                v-else
                                type="warning"
                                plain
                                size="small"
                                :disabled="sortMode.active || (current.children?.length ?? 0) < 2"
                                @click="startSortSub(currentDirection, current)">
                                排序
                            </el-button>
                            <el-button type="primary" size="small" :disabled="sortMode.active" @click="openCreate(currentDirection, 'sub', current)">
                                新增子分类
                            </el-button>
                        </el-space>
                    </header>

                    <div class="sub-body">
                        <draggable
                            v-if="current.children?.length"
                            :list="current.children"
                            item-key="id"
                            class="sub-list"
                            :disabled="!isSortingSub(current.id)"
                            ghost-class="drag-ghost"
                            chosen-class="drag-chosen"
                            :animation="150"
                            @update:list="(l) => (current.children = l)">
                            <template #item="{ element: sub }">
                                <li class="sub-item" :class="{ dragging: isSortingSub(current.id) }">
                                    <span class="sub-item-dot" />
                                    <span class="sub-item-name" :title="sub.name">{{ sub.name }}</span>
                                    <template v-if="!isSortingSub(current.id)">
                                        <button class="sub-item-edit" title="修改名称" @click.stop="openEdit(currentDirection, sub)">
                                            <el-icon><Edit /></el-icon>
                                        </button>
                                        <button class="sub-item-del" title="删除" @click="removeSub(sub)">
                                            <el-icon><Delete /></el-icon>
                                        </button>
                                    </template>
                                    <el-icon v-else class="drag-handle"><Rank /></el-icon>
                                </li>
                            </template>
                        </draggable>
                        <el-empty v-else description="还没有子分类" :image-size="72">
                            <el-button type="primary" plain @click="openCreate(currentDirection, 'sub', current)">添加第一个子分类</el-button>
                        </el-empty>
                    </div>

                    <footer class="sub-footer">
                        <el-button type="danger" plain :disabled="!!current.children?.length || sortMode.active" @click="removeCategory(current)">
                            删除主分类
                        </el-button>
                    </footer>
                </template>

                <el-empty v-else description="点击左侧主分类查看子分类" :image-size="90" />
            </aside>
        </div>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.title" width="440px" align-center>
        <el-form label-width="80px" @submit.prevent="submitCreate">
            <el-form-item label="分类名称" required>
                <el-input v-model="dialog.name" maxlength="20" show-word-limit placeholder="请输入分类名称" @keyup.enter="submitCreate" />
            </el-form-item>
            <el-form-item v-if="dialog.parentName" label="上级分类">
                <el-text type="info">{{ dialog.parentName }}</el-text>
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="dialog.visible = false">取消</el-button>
            <el-button type="primary" :loading="dialog.submitting" @click="submitCreate">确定</el-button>
        </template>
    </el-dialog>
</template>

<script>
import { ElMessageBox } from "element-plus";
import { Delete, Edit, Grid, ShoppingCart, TrendCharts, Rank } from "@element-plus/icons-vue";
import draggable from "vuedraggable";
import { AddMainCategory, AddSubCategory, DelCategory, EditCategory, Getcategory, SortMainCategory, SortSubCategory } from "../../api/basic.js";
import { withDelay } from "../../utils/common.js";
import { msg } from "../../utils/message.ts";
import { setRouteQuery, getRouteQuery } from "../../utils/routeQuery";

const DIRECTIONS = { INCOME: 1, EXPENSE: 2 };
const QUERY_KEYS = ["direction", "id"];
const QUERY_DEFAULTS = { direction: null, id: null };

function normalizeCategories(list) {
    return (list ?? []).map(({ children, ...rest }) => {
        const normalizedChildren = normalizeCategories(children);
        return { ...rest, children: normalizedChildren.length ? normalizedChildren : undefined };
    });
}

export default {
    name: "CategoryIndex",
    components: { draggable },
    setup() {
        return { Grid, Delete, Edit, Rank };
    },
    data() {
        return {
            loading: false,
            saving: false,
            incomeTree: [],
            expenseTree: [],
            selected: null,
            isReady: false,
            sortMode: { active: false, direction: null, parentId: null },
            dialog: {
                visible: false,
                title: "",
                name: "",
                parentName: "",
                action: "main",
                direction: DIRECTIONS.INCOME,
                parentId: null,
                editId: null,
                submitting: false,
            },
        };
    },
    computed: {
        panels() {
            return [
                { direction: DIRECTIONS.INCOME, title: "收入分类", theme: "income", icon: TrendCharts, tree: this.incomeTree },
                { direction: DIRECTIONS.EXPENSE, title: "支出分类", theme: "expense", icon: ShoppingCart, tree: this.expenseTree },
            ];
        },
        current() {
            if (!this.selected) return null;
            const list = this.selected.direction === DIRECTIONS.INCOME ? this.incomeTree : this.expenseTree;
            return list.find((c) => String(c.id) === String(this.selected.id)) ?? null;
        },
        currentDirection() {
            return this.selected?.direction ?? DIRECTIONS.INCOME;
        },
        currentTheme() {
            return this.currentDirection === DIRECTIONS.INCOME ? "income" : "expense";
        },
    },
    watch: {
        selected() {
            this.syncToUrl();
        },
    },
    methods: {
        isSortingMain(direction) {
            return this.sortMode.active && this.sortMode.parentId === null && this.sortMode.direction === direction;
        },
        isSortingSub(parentId) {
            return this.sortMode.active && this.sortMode.parentId !== null && String(this.sortMode.parentId) === String(parentId);
        },

        getTree(direction) {
            return direction === DIRECTIONS.INCOME ? this.incomeTree : this.expenseTree;
        },
        setTree(direction, list) {
            if (direction === DIRECTIONS.INCOME) this.incomeTree = list;
            else this.expenseTree = list;
        },

        startSort(direction) {
            if (this.sortMode.active) return;
            this.sortMode = { active: true, direction, parentId: null };
        },
        startSortSub(direction, parent) {
            if (this.sortMode.active) return;
            this.sortMode = { active: true, direction, parentId: parent.id };
        },
        async cancelSort() {
            this.sortMode = { active: false, direction: null, parentId: null };
            await this.loadAll(true);
        },

        async saveSortMain() {
            const direction = this.sortMode.direction;
            const ids = this.getTree(direction).map((c) => c.id);
            if (!ids.length) return this.cancelSort();

            this.saving = true;
            this.loading = true;
            try {
                await withDelay(() => SortMainCategory({ direction, category: { ids } }));
                msg.success("排序已保存");
                this.sortMode = { active: false, direction: null, parentId: null };
            } catch (error) {
                console.error("保存主分类排序失败：", error);
                msg.error("保存排序失败，请稍后重试");
                this.sortMode = { active: false, direction: null, parentId: null };
                await this.loadAll(true);
            } finally {
                this.saving = false;
                this.loading = false;
            }
        },

        async saveSortSub() {
            const ids = (this.current?.children ?? []).map((c) => c.id);
            if (!ids.length) return this.cancelSort();

            const parentId = this.sortMode.parentId;
            this.saving = true;
            this.loading = true;
            try {
                await withDelay(() => SortSubCategory(parentId, { category: { ids } }));
                msg.success("排序已保存");
                this.sortMode = { active: false, direction: null, parentId: null };
            } catch (error) {
                console.error("保存子分类排序失败：", error);
                msg.error("保存排序失败，请稍后重试");
                this.sortMode = { active: false, direction: null, parentId: null };
                await this.loadAll(true);
            } finally {
                this.saving = false;
                this.loading = false;
            }
        },

        restoreFromUrl() {
            const saved = getRouteQuery(this.$route, QUERY_KEYS, QUERY_DEFAULTS);
            const dir = Number(saved.direction);
            if ((dir === DIRECTIONS.INCOME || dir === DIRECTIONS.EXPENSE) && saved.id) {
                this.selected = { direction: dir, id: saved.id };
            }
        },
        syncToUrl() {
            if (!this.isReady) return;
            setRouteQuery(
                this.$router,
                this.$route,
                this.selected ? { direction: this.selected.direction, id: this.selected.id } : { direction: null, id: null },
            );
        },

        async fetchCategory(direction) {
            const res = await withDelay(() => Getcategory({ direction }));
            return normalizeCategories(res.payload?.items);
        },
        ensureSelection() {
            const all = [
                ...this.incomeTree.map((c) => ({ direction: DIRECTIONS.INCOME, cat: c })),
                ...this.expenseTree.map((c) => ({ direction: DIRECTIONS.EXPENSE, cat: c })),
            ];
            const exists = this.selected && all.some((x) => x.direction === this.selected.direction && String(x.cat.id) === String(this.selected.id));
            if (!exists) {
                this.selected = all.length ? { direction: all[0].direction, id: all[0].cat.id } : null;
            }
        },
        async loadAll(silent = false) {
            if (!silent) this.loading = true;
            try {
                const [income, expense] = await Promise.all([this.fetchCategory(DIRECTIONS.INCOME), this.fetchCategory(DIRECTIONS.EXPENSE)]);
                this.incomeTree = income;
                this.expenseTree = expense;
                this.ensureSelection();
            } catch {
                msg.error("加载分类列表失败");
            } finally {
                if (!silent) this.loading = false;
            }
        },

        isActive(direction, id) {
            return this.selected?.direction === direction && String(this.selected?.id) === String(id);
        },
        select(direction, id) {
            if (this.sortMode.active) return;
            this.selected = { direction, id };
        },
        openCreate(direction, action, parent = null) {
            if (this.sortMode.active) return;
            Object.assign(this.dialog, {
                direction,
                action,
                parentId: parent?.id ?? null,
                parentName: parent?.name ?? "",
                editId: null,
                name: "",
                title: action === "main" ? "新增主分类" : "新增子分类",
                visible: true,
            });
        },
        openEdit(direction, cat) {
            if (this.sortMode.active) return;
            Object.assign(this.dialog, {
                direction,
                action: "edit",
                parentId: null,
                parentName: "",
                editId: cat.id,
                name: cat.name,
                title: "修改分类名称",
                visible: true,
            });
        },
        async submitCreate() {
            const name = this.dialog.name.trim();
            if (!name) return msg.warning("请输入分类名称");

            this.dialog.submitting = true;
            try {
                if (this.dialog.action === "main") {
                    await withDelay(() => AddMainCategory({ name, direction: this.dialog.direction }));
                    msg.success("新增主分类成功");
                } else if (this.dialog.action === "sub") {
                    await withDelay(() => AddSubCategory({ id: this.dialog.parentId }, { name }));
                    msg.success("新增子分类成功");
                } else {
                    await withDelay(() => EditCategory(this.dialog.editId, { name }));
                    msg.success("修改成功");
                }
                this.dialog.visible = false;
                await this.loadAll();
            } catch (error) {
                console.error("提交分类失败：", error);
                msg.error(this.dialog.action === "edit" ? "修改失败，请稍后重试" : "新增分类失败，请稍后重试");
            } finally {
                this.dialog.submitting = false;
            }
        },
        async confirmAndDelete(id, name) {
            try {
                await ElMessageBox.confirm(`确定要删除【${name}】分类吗？`, "删除提示", { type: "warning" });
                await withDelay(() => DelCategory(id));
                msg.success("删除成功");
                await this.loadAll();
            } catch (error) {
                if (error !== "cancel" && error !== "close") {
                    console.error("删除分类失败：", error);
                    msg.error("删除失败，请稍后重试");
                }
            }
        },
        removeCategory(cat) {
            if (cat.children?.length) return msg.warning("该分类下存在子分类，无法删除");
            this.confirmAndDelete(cat.id, cat.name);
        },
        removeSub(sub) {
            this.confirmAndDelete(sub.id, sub.name);
        },
    },
    created() {
        this.restoreFromUrl();
        this.$nextTick(() => {
            this.isReady = true;
        });
        this.loadAll();
    },
};
</script>

<style scoped lang="less">
// 公用 mixin
.scrollable() {
    overflow-y: auto;

    &::-webkit-scrollbar {
        width: 6px;
    }
    &::-webkit-scrollbar-thumb {
        background: var(--el-border-color);
        border-radius: 3px;
    }
    &::-webkit-scrollbar-track {
        background: transparent;
    }
}

.badge() {
    flex-shrink: 0;
    min-width: 18px;
    padding: 0 6px;
    font-size: 11px;
    line-height: 16px;
    text-align: center;
    border-radius: 8px;
}

.ellipsis() {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

// 卡片外壳
.category-page {
    --page-gap: 120px;

    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: calc(100vh - var(--page-gap));
    overflow: hidden;

    :deep(.el-card__header) {
        flex-shrink: 0;
    }
    :deep(.el-card__body) {
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

// 主题色
.theme-income {
    --accent: #10b981;
    --accent-soft: #ecfdf5;
    --accent-border: #a7f3d0;
}

.theme-expense {
    --accent: #f59e0b;
    --accent-soft: #fffbeb;
    --accent-border: #fde68a;
}

// 两列布局
.layout {
    display: flex;
    height: 100%;
    min-height: 0;
    padding: 16px 20px;
    gap: 16px;
}

// 左列：主分类
.col-main {
    flex: 1;
    min-width: 0;
    .scrollable();
}

.group + .group {
    margin-top: 18px;
}

.group-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.group-title,
.sub-head-title {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.group-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.group-icon {
    font-size: 16px;
    color: var(--accent);
}

.group-count {
    .badge();
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color);
}

// 主分类网格
.main-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 10px;
}

.main-card {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 48px;
    padding: 0 14px;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    cursor: pointer;
    transition:
        border-color 0.15s ease,
        background-color 0.15s ease,
        box-shadow 0.15s ease;

    &:hover {
        border-color: var(--accent-border);
        background: var(--el-fill-color-lighter);

        .main-edit {
            opacity: 1;
        }
    }

    &.active {
        background: var(--accent-soft);
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);

        .main-name {
            color: var(--accent);
            font-weight: 600;
        }

        .main-count {
            color: var(--accent);
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid var(--accent-border);
        }
    }

    &.dragging {
        cursor: grab;

        &:active {
            cursor: grabbing;
        }
    }
}

.main-dot {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    background: var(--accent);
    border-radius: 50%;
}

.main-name {
    flex: 1;
    min-width: 0;
    font-size: 15px;
    color: var(--el-text-color-primary);
    .ellipsis();
}

.main-count {
    .badge();
    padding: 0 7px;
    font-size: 12px;
    line-height: 18px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color);
}

.main-edit,
.sub-item-edit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    padding: 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    opacity: 0;
    transition:
        opacity 0.15s ease,
        background-color 0.15s ease,
        color 0.15s ease;

    &:hover {
        color: var(--el-color-primary);
        background: var(--el-color-primary-light-9);
    }
}

// 右列：子分类详情
.col-sub {
    flex: 0 0 420px;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 16px;
    overflow: hidden;
    background: var(--el-fill-color-lighter);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 12px;
}

.sub-head {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-bottom: 12px;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.sub-dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    background: var(--accent);
    border-radius: 50%;
    box-shadow: 0 0 0 3px var(--accent-soft);
}

.sub-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    .ellipsis();
}

.sub-count {
    .badge();
    color: var(--accent);
    background: var(--accent-soft);
    border: 1px solid var(--accent-border);
}

.sub-body {
    flex: 1;
    min-height: 0;
    .scrollable();
}

// 子分类列表
.sub-list {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 0;
    margin: 0;
    list-style: none;
}

.sub-item {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 0 6px 0 12px;
    font-size: 14px;
    color: var(--el-text-color-primary);
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    transition:
        border-color 0.15s ease,
        background-color 0.15s ease;

    &:hover {
        background: var(--accent-soft);
        border-color: var(--accent-border);

        .sub-item-del,
        .sub-item-edit {
            opacity: 1;
        }
    }

    &.dragging {
        cursor: grab;

        &:active {
            cursor: grabbing;
        }
    }
}

.sub-item-dot {
    flex-shrink: 0;
    width: 5px;
    height: 5px;
    background: var(--accent);
    border-radius: 50%;
    opacity: 0.7;
}

.sub-item-name {
    flex: 1;
    min-width: 0;
    .ellipsis();
}

.sub-item-del {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    padding: 0;
    font-size: 13px;
    color: var(--el-color-danger);
    background: transparent;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    opacity: 0;
    transition:
        opacity 0.15s ease,
        background-color 0.15s ease;

    &:hover {
        background: var(--el-color-danger-light-9);
    }
}

.sub-footer {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    padding-top: 12px;
    margin-top: 12px;
    border-top: 1px dashed var(--el-border-color-lighter);
}

// 拖拽辅助
.drag-handle {
    flex-shrink: 0;
    font-size: 15px;
    color: var(--el-text-color-secondary);
    cursor: grab;

    &:active {
        cursor: grabbing;
    }
}

.drag-ghost {
    opacity: 0.4;
    background: var(--accent-soft) !important;
    border-style: dashed !important;
}

.drag-chosen {
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}
</style>
