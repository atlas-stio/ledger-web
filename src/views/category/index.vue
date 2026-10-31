<template>
    <el-card class="category-page" shadow="never">
        <template #header>
            <div class="page-header">
                <div class="page-header-left">
                    <el-icon class="page-icon"><Grid /></el-icon>
                    <span class="page-title">分类管理</span>
                </div>
                <el-button type="primary" :icon="Refresh" :loading="loading" @click="loadAll">刷新</el-button>
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
                        <el-button type="primary" size="small" :icon="Plus" @click="openCreate(panel.direction, 'main')"> 新增主分类 </el-button>
                    </header>

                    <div v-if="panel.tree.length" class="main-grid">
                        <article
                            v-for="cat in panel.tree"
                            :key="cat.id"
                            class="main-card"
                            :class="{ active: isActive(panel.direction, cat.id) }"
                            @click="select(panel.direction, cat.id)">
                            <span class="main-dot" />
                            <span class="main-name" :title="cat.name">{{ cat.name }}</span>
                            <span class="main-count">{{ cat.children?.length ?? 0 }}</span>
                        </article>
                    </div>
                    <el-empty v-else description="暂无主分类" :image-size="56" />
                </section>
            </div>

            <!-- 右侧：选中主分类的子分类 -->
            <aside class="col-sub" :class="`theme-${currentTheme}`">
                <template v-if="current">
                    <header class="sub-head">
                        <div class="sub-head-title">
                            <span class="sub-dot" />
                            <span class="sub-name" :title="current.name">{{ current.name }}</span>
                            <span class="sub-count">{{ current.children?.length ?? 0 }}</span>
                        </div>
                        <el-button type="primary" size="small" :icon="Plus" @click="openCreate(currentDirection, 'sub', current)"> 新增子分类 </el-button>
                    </header>

                    <div class="sub-body">
                        <ul v-if="current.children?.length" class="sub-list">
                            <li v-for="sub in current.children" :key="sub.id" class="sub-item">
                                <span class="sub-item-dot" />
                                <span class="sub-item-name" :title="sub.name">{{ sub.name }}</span>
                                <button class="sub-item-del" title="删除" @click="removeSub(sub)">
                                    <el-icon><Delete /></el-icon>
                                </button>
                            </li>
                        </ul>
                        <el-empty v-else description="还没有子分类" :image-size="72">
                            <el-button type="primary" plain :icon="Plus" @click="openCreate(currentDirection, 'sub', current)"> 添加第一个子分类 </el-button>
                        </el-empty>
                    </div>

                    <footer class="sub-footer">
                        <el-button type="danger" plain :icon="Delete" :disabled="!!current.children?.length" @click="removeCategory(current)">
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
import { ElMessage, ElMessageBox } from "element-plus";
import { Delete, Grid, Plus, Refresh, ShoppingCart, TrendCharts } from "@element-plus/icons-vue";
import { AddMainCategory, AddSubCategory, DelCategory, Getcategory } from "../../api/basic.js";
import { withDelay } from "../../utils/common.js";
import { msgcon } from "../../utils/message.js";

const DIRECTIONS = { INCOME: 1, EXPENSE: 2 };

/** 递归整理：去掉空 children，避免多出无意义的层级 */
function normalizeCategories(list) {
    return (list ?? []).map(({ children, ...rest }) => {
        const normalizedChildren = normalizeCategories(children);
        return { ...rest, children: normalizedChildren.length ? normalizedChildren : undefined };
    });
}

export default {
    name: "CategoryIndex",
    setup() {
        // 模板中直接引用的图标
        return { Grid, Refresh, Plus, Delete };
    },
    data() {
        return {
            loading: false,
            incomeTree: [],
            expenseTree: [],
            // 当前选中主分类：{ direction, id } | null
            selected: null,
            dialog: {
                visible: false,
                title: "",
                name: "",
                parentName: "",
                action: "main",
                direction: DIRECTIONS.INCOME,
                parentId: null,
                submitting: false,
            },
        };
    },
    computed: {
        panels() {
            // icon 字段直接指向组件对象，模板中通过 <component :is> 渲染
            return [
                {
                    direction: DIRECTIONS.INCOME,
                    title: "收入分类",
                    theme: "income",
                    icon: TrendCharts,
                    tree: this.incomeTree,
                },
                {
                    direction: DIRECTIONS.EXPENSE,
                    title: "支出分类",
                    theme: "expense",
                    icon: ShoppingCart,
                    tree: this.expenseTree,
                },
            ];
        },
        current() {
            if (!this.selected) return null;
            const list = this.selected.direction === DIRECTIONS.INCOME ? this.incomeTree : this.expenseTree;
            return list.find((c) => c.id === this.selected.id) ?? null;
        },
        currentDirection() {
            return this.selected?.direction ?? DIRECTIONS.INCOME;
        },
        currentTheme() {
            return this.currentDirection === DIRECTIONS.INCOME ? "income" : "expense";
        },
    },
    methods: {
        async fetchCategory(direction) {
            const res = await withDelay(() => Getcategory({ direction }));
            return normalizeCategories(res.payload?.items);
        },

        /** 维护选中项：原选中仍存在则保留，否则回退到第一个主分类 */
        ensureSelection() {
            const all = [
                ...this.incomeTree.map((c) => ({ direction: DIRECTIONS.INCOME, cat: c })),
                ...this.expenseTree.map((c) => ({ direction: DIRECTIONS.EXPENSE, cat: c })),
            ];
            const stillExists = this.selected && all.some((x) => x.direction === this.selected.direction && x.cat.id === this.selected.id);
            if (!stillExists) {
                this.selected = all.length ? { direction: all[0].direction, id: all[0].cat.id } : null;
            }
        },

        async loadAll() {
            this.loading = true;
            try {
                const [income, expense] = await Promise.all([this.fetchCategory(DIRECTIONS.INCOME), this.fetchCategory(DIRECTIONS.EXPENSE)]);
                this.incomeTree = income;
                this.expenseTree = expense;
                this.ensureSelection();
            } catch (error) {
                console.error("加载分类失败：", error);
                ElMessage.error(msgcon("加载分类列表失败"));
            } finally {
                this.loading = false;
            }
        },

        isActive(direction, id) {
            return this.selected?.direction === direction && this.selected?.id === id;
        },

        select(direction, id) {
            this.selected = { direction, id };
        },

        openCreate(direction, action, parent = null) {
            Object.assign(this.dialog, {
                direction,
                action,
                parentId: parent?.id ?? null,
                parentName: parent?.name ?? "",
                name: "",
                title: action === "main" ? "新增主分类" : "新增子分类",
                visible: true,
            });
        },

        async submitCreate() {
            const name = this.dialog.name.trim();
            if (!name) return ElMessage.warning(msgcon("请输入分类名称"));

            this.dialog.submitting = true;
            try {
                if (this.dialog.action === "main") {
                    await withDelay(() => AddMainCategory({ name, direction: this.dialog.direction }));
                    ElMessage.success(msgcon("新增主分类成功"));
                } else {
                    await withDelay(() => AddSubCategory({ id: this.dialog.parentId }, { name }));
                    ElMessage.success(msgcon("新增子分类成功"));
                }
                this.dialog.visible = false;
                await this.loadAll();
            } catch (error) {
                console.error("新增分类失败：", error);
                ElMessage.error(msgcon("新增分类失败，请稍后重试"));
            } finally {
                this.dialog.submitting = false;
            }
        },

        async confirmAndDelete(id, name) {
            try {
                await ElMessageBox.confirm(`确定要删除【${name}】分类吗？`, "删除提示", { type: "warning" });
                await withDelay(() => DelCategory(id));
                ElMessage.success(msgcon("删除成功"));
                await this.loadAll();
            } catch (error) {
                if (error !== "cancel" && error !== "close") {
                    console.error("删除分类失败：", error);
                    ElMessage.error(msgcon("删除失败，请稍后重试"));
                }
            }
        },

        removeCategory(cat) {
            if (cat.children?.length) {
                return ElMessage.warning(msgcon("该分类下存在子分类，无法删除"));
            }
            this.confirmAndDelete(cat.id, cat.name);
        },

        removeSub(sub) {
            this.confirmAndDelete(sub.id, sub.name);
        },
    },
    created() {
        this.$globalBus?.emit("updateActivePath", "/category");
        this.loadAll();
    },
};
</script>

<style scoped lang="less">
/* ========== 公用 mixin ========== */
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

/* ========== 卡片外壳 ========== */
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

/* ========== 主题色 ========== */
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

/* ========== 两列布局 ========== */
.layout {
    display: flex;
    height: 100%;
    min-height: 0;
    padding: 16px 20px;
    gap: 16px;
}

/* ========== 左列：主分类 ========== */
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

/* ========== 主分类网格 ========== */
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

/* ========== 右列：子分类详情 ========== */
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

/* ========== 子分类列表（两列） ========== */
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

        .sub-item-del {
            opacity: 1;
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
</style>
