<template>
    <div class="details-page" v-loading="loading">
        <!-- 左：搜索 + 物品聚合列表 -->
        <div class="left-panel">
            <div class="search-box">
                <el-space>
                    <el-input v-model="keyword" placeholder="搜索物品名称 / 备注，如：牛奶" clearable @input="onKeywordInput" @clear="onKeywordInput">
                        <template #prefix>
                            <el-icon><Search /></el-icon>
                        </template>
                    </el-input>
                    <el-button :icon="Refresh" @click="onRefresh(true)" :loading="loading">刷新</el-button>
                </el-space>
            </div>
            <el-scrollbar class="item-list">
                <el-empty v-if="!loading && itemList.length === 0" description="没有找到相关物品" />
                <div v-for="item in itemList" :key="item.name" class="item-row" :class="{ active: activeName === item.name }" @click="selectItem(item)">
                    <div class="item-main">
                        <span class="item-name">{{ item.name }}</span>
                        <span class="item-latest">¥{{ fmt(item.latestPrice) }}</span>
                    </div>
                    <div class="item-sub">
                        <span>均价 ¥{{ fmt(item.avgPrice) }}</span>
                        <span>·</span>
                        <span>{{ item.count }} 次</span>
                        <span class="item-date">{{ fmtDate(item.latestAt) }}</span>
                    </div>
                </div>
            </el-scrollbar>
        </div>
        <!-- 右：物品详情 -->
        <div class="right-panel">
            <el-empty v-if="!activeItem" description="请选择左侧物品查看历史价格" />
            <template v-else>
                <!-- 摘要 -->
                <div class="summary-card">
                    <div class="summary-title">{{ activeItem.name }}</div>
                    <div class="summary-grid">
                        <div class="summary-cell">
                            <div class="cell-label">最近单价</div>
                            <div class="cell-value primary">¥{{ fmt(activeItem.latestPrice) }}</div>
                        </div>
                        <div class="summary-cell">
                            <div class="cell-label">均价</div>
                            <div class="cell-value">¥{{ fmt(activeItem.avgPrice) }}</div>
                        </div>
                        <div class="summary-cell">
                            <div class="cell-label">最低</div>
                            <div class="cell-value">¥{{ fmt(activeItem.minPrice) }}</div>
                        </div>
                        <div class="summary-cell">
                            <div class="cell-label">最高</div>
                            <div class="cell-value">¥{{ fmt(activeItem.maxPrice) }}</div>
                        </div>
                        <div class="summary-cell">
                            <div class="cell-label">购买次数</div>
                            <div class="cell-value">{{ activeItem.count }}</div>
                        </div>
                        <div class="summary-cell">
                            <div class="cell-label">较上次</div>
                            <div class="cell-value" :class="diffClass">
                                {{ diffText }}
                            </div>
                        </div>
                    </div>
                </div>
                <!-- 价格走势 -->
                <div class="chart-card">
                    <div class="card-title">价格走势</div>
                    <div ref="chartRef" class="chart"></div>
                </div>
                <!-- 历史时间线 -->
                <div class="history-card">
                    <div class="card-title">历史记录</div>
                    <el-table :data="historyRows" size="small" style="width: 100%">
                        <el-table-column label="时间">
                            <template #default="{ row }">{{ fmtDateTime(row.occAt) }}</template>
                        </el-table-column>
                        <el-table-column label="单价" align="right">
                            <template #default="{ row }">
                                <div class="price-wrap">
                                    <span class="diff" :class="row.diff > 0 ? 'up' : row.diff < 0 ? 'down' : ''">
                                        {{ row.diff !== null ? (row.diff > 0 ? "↑" : row.diff < 0 ? "↓" : "—") : "" }}
                                    </span>
                                    <span class="price-cell">¥{{ fmt(row.price) }}</span>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column label="数量 × 单价 = 总价">
                            <template #default="{ row }"> {{ fmt(row.quantity) }} {{ row.unit }} × ¥{{ fmt(row.price) }} = ¥{{ fmt(row.total) }} </template>
                        </el-table-column>
                        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
                        <el-table-column label="账单" width="90" align="center">
                            <template #default="{ row }">
                                <el-link type="primary">#{{ row.tid }}</el-link>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </template>
        </div>
    </div>
</template>
<script>
import { Refresh } from "@element-plus/icons-vue";
import * as echarts from "echarts";
import { withDelay } from "../../utils/common.js";
import { getDetailList } from "../../api/basic.js";
export default {
    name: "DetailsPage",
    setup() {
        return { Refresh };
    },
    data() {
        return {
            keyword: "",
            loading: false,
            rawItems: [],
            activeName: "",
            chart: null,
            chartRef: null,
        };
    },
    computed: {
        itemList() {
            const map = new Map();
            for (const it of this.rawItems) {
                const key = (it.name || "").trim();
                if (!key) continue;
                if (!map.has(key)) map.set(key, []);
                map.get(key).push(it);
            }
            const list = [];
            for (const [name, arr] of map.entries()) {
                arr.sort((a, b) => a.occAt - b.occAt);
                const prices = arr.map((i) => Number(i.price));
                const latest = arr[arr.length - 1];
                list.push({
                    name,
                    count: arr.length,
                    latestPrice: Number(latest.price),
                    latestAt: latest.occAt,
                    avgPrice: prices.reduce((s, v) => s + v, 0) / prices.length,
                    minPrice: Math.min(...prices),
                    maxPrice: Math.max(...prices),
                    records: arr,
                });
            }
            list.sort((a, b) => b.latestAt - a.latestAt);
            return list;
        },
        activeItem() {
            return this.itemList.find((i) => i.name === this.activeName) || null;
        },
        historyRows() {
            if (!this.activeItem) return [];
            // 先正序(旧→新)计算差价
            const asc = [...this.activeItem.records].sort((a, b) => a.occAt - b.occAt);
            let prevPrice = null;
            const ascWithDiff = asc.map((r) => {
                const price = Number(r.price);
                const diff = prevPrice === null ? null : price - prevPrice;
                prevPrice = price;
                return { ...r, price, diff };
            });
            // 反转，表格倒序展示，最新在上
            return ascWithDiff.reverse();
        },
        diffText() {
            const rows = this.historyRows;
            if (rows.length < 2) return "—";
            const latestRow = rows[0];
            const prevRow = rows[1];
            const d = latestRow.diff;
            if (d === null) return "—";
            const prevPrice = Number(prevRow.price);
            let pctStr = "";
            if (prevPrice !== 0) {
                const pct = (d / prevPrice) * 100;
                const sign = pct > 0 ? "+" : "";
                pctStr = ` (${sign}${pct.toFixed(0)}%)`;
            }
            return `${d > 0 ? "↑" : d < 0 ? "↓" : "—"} ¥${Math.abs(d).toFixed(2)}${pctStr}`;
        },
        diffClass() {
            const rows = this.historyRows;
            if (rows.length < 2 || rows[0].diff === null) return "";
            return rows[0].diff > 0 ? "up" : rows[0].diff < 0 ? "down" : "";
        },
    },
    watch: {
        activeItem() {
            this.$nextTick(() => this.renderChart());
        },
    },
    mounted() {
        this.chartRef = this.$refs.chartRef;
        this.fetchData();
    },
    beforeUnmount() {
        if (this.chart) {
            this.chart.dispose();
            this.chart = null;
        }
        clearTimeout(this._timer);
    },
    methods: {
        async fetchData() {
            this.loading = true;
            try {
                const res = await withDelay(() => getDetailList({ keyword: this.keyword || undefined, limit: 100, offset: 0 }));
                const payload = (res && res.payload) || {};
                const items = payload.items || [];
                this.rawItems = items.map((v) => ({
                    id: v.id,
                    tid: v.tid,
                    name: v.name,
                    quantity: v.quantity,
                    unit: v.unit,
                    price: v.price,
                    total: v.total,
                    remark: v.remark,
                    occAt: v.occ_at,
                }));
                if (this.itemList.length > 0) {
                    const stillExists = this.itemList.some((i) => i.name === this.activeName);
                    if (!stillExists) this.activeName = this.itemList[0].name;
                } else {
                    this.activeName = "";
                }
            } catch (e) {
                console.error(e);
                this.$message.error("查询明细失败");
            } finally {
                this.loading = false;
            }
        },
        onRefresh(resetKeyword = false) {
            clearTimeout(this._timer);
            if (resetKeyword) {
                this.keyword = "";
            }
            this.fetchData();
        },
        onKeywordInput() {
            clearTimeout(this._timer);
            this._timer = setTimeout(() => this.fetchData(), 300);
        },
        selectItem(item) {
            this.activeName = item.name;
        },
        renderChart() {
            if (!this.$refs.chartRef || !this.activeItem) return;
            if (!this.chart) {
                this.chart = echarts.init(this.$refs.chartRef);
            }
            const points = [...this.activeItem.records].sort((a, b) => a.occAt - b.occAt).map((r) => [r.occAt, Number(r.price)]);
            const ys = points.map((p) => p[1]);
            const min = Math.min(...ys);
            const max = Math.max(...ys);
            const pad = (max - min) * 0.1 || min * 0.1 || 1;

            const yMin = Math.max(0, Math.floor(min - pad));
            const yMax = Math.ceil(max + pad);

            this.chart.setOption({
                grid: { left: 50, right: 20, top: 30, bottom: 60 },
                tooltip: {
                    trigger: "axis",
                    formatter: (params) => {
                        const p = params[0];
                        return `${this.fmtDateTime(p.value[0])}<br />单价：¥${p.value[1].toFixed(2)}`;
                    },
                },
                xAxis: {
                    type: "time",
                    axisLabel: {
                        formatter: (val) => this.fmtDate(val),
                        rotate: 35,
                    },
                },
                yAxis: {
                    type: "value",
                    min: yMin,
                    max: yMax,
                    axisLabel: { formatter: (val) => `¥${Math.round(val)}` },
                    splitNumber: 5,
                },
                series: [
                    {
                        type: "line",
                        data: points,
                        smooth: true,
                        symbolSize: 8,
                        lineStyle: { width: 2, color: "#409eff" },
                        itemStyle: { color: "#409eff" },
                        areaStyle: { color: "rgba(64,158,255,0.08)" },
                    },
                ],
            });
            this.chart.resize();
        },
        goBill(tid) {
            this.$router.push({ path: `/bill/${tid}` });
        },
        fmt(v) {
            const n = Number(v);
            if (Number.isNaN(n)) return v;
            return n.toFixed(2);
        },
        fmtDate(ms) {
            if (!ms) return "";
            const d = new Date(Number(ms));
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            return `${mm}-${dd}`;
        },
        fmtDateTime(ms) {
            if (!ms) return "";
            const d = new Date(Number(ms));
            const y = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, "0");
            const dd = String(d.getDate()).padStart(2, "0");
            const hh = String(d.getHours()).padStart(2, "0");
            const mi = String(d.getMinutes()).padStart(2, "0");
            return `${y}-${mm}-${dd} ${hh}:${mi}`;
        },
    },
};
</script>
<style scoped>
.details-page {
    display: flex;
    height: 100%;
    gap: 16px;
    box-sizing: border-box;
}
.left-panel {
    width: 350px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 8px;
    padding: 15px;
    box-sizing: border-box;
}
.search-box {
    margin-bottom: 12px;
}
.item-list {
    flex: 1;
    min-height: 0;
}
.item-row {
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
    margin-bottom: 4px;
}
.item-row:hover {
    background: #f5f7fa;
}
.item-row.active {
    background: #ecf5ff;
}
.item-main {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
}
.item-name {
    font-weight: 600;
    color: #303133;
}
.item-latest {
    color: #f56c6c;
    font-weight: 600;
}
.item-sub {
    display: flex;
    gap: 6px;
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
}
.item-date {
    margin-left: auto;
}
.right-panel {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow: auto;
}
.summary-card,
.chart-card,
.history-card {
    background: #fff;
    border-radius: 8px;
    padding: 15px;
    box-sizing: border-box;
}
.summary-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #303133;
}
.summary-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
}
.summary-cell {
    text-align: center;
}
.cell-label {
    font-size: 12px;
    color: #909399;
    margin-bottom: 4px;
}
.cell-value {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
}
.cell-value.primary {
    color: #f56c6c;
    font-size: 18px;
}
.cell-value.up {
    color: #f56c6c;
}
.cell-value.down {
    color: #67c23a;
}
.card-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 12px;
    color: #303133;
}
.chart {
    width: 100%;
    height: 260px;
}
.price-wrap {
    display: inline-flex;
    align-items: baseline;
    justify-content: flex-end;
    gap: 4px;
    width: 100%;
}
.price-cell {
    font-weight: 600;
    color: #f56c6c;
}
.diff {
    width: 14px;
    font-size: 12px;
    text-align: left;
}
.diff.up {
    color: #f56c6c;
}
.diff.down {
    color: #67c23a;
}
</style>
