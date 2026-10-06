<template>
    <div class="chart-card">
        <div class="chart-header">
            <span class="chart-title">支出分类 TOP 排行</span>
            <div class="chart-switch">
                <button class="switch-btn" :class="{ active: currentDt === 2 }" @click="handleDtChange(2)">支出</button>
                <button class="switch-btn" :class="{ active: currentDt === 1 }" @click="handleDtChange(1)">收入</button>
            </div>
        </div>

        <div class="chart-body" ref="chart" style="height: 360px; width: 100%"></div>
    </div>
</template>

<script>
import { GetChartExpenseRank } from "../../../api/basic.js";
import { withDelay } from "../../../utils/common.js";
import * as echarts from "echarts";

const EXPENSE_COLOR = "#5B8FF9";
const INCOME_COLOR = "#5AD8A6";

export default {
    name: "RankChart",
    props: {
        queryParams: Object,
    },
    data() {
        return {
            myChart: null,
            resizeTimer: null,
            loadingFlag: false,
            currentDt: 2, // 1 income / 2 expense
        };
    },
    mounted() {
        if (this.queryParams?.dt) {
            this.currentDt = Number(this.queryParams.dt);
        }
        this.myChart = echarts.init(this.$refs.chart);
        this.getRankChartData();
        window.addEventListener("resize", this.handleResize);
    },
    beforeUnmount() {
        clearTimeout(this.resizeTimer);
        window.removeEventListener("resize", this.handleResize);
        this.myChart?.dispose();
        this.myChart = null;
    },
    watch: {
        queryParams: {
            handler(newVal, oldVal) {
                if (oldVal === undefined) return;
                if (newVal?.dt) this.currentDt = Number(newVal.dt);
                this.getRankChartData();
            },
            deep: true,
        },
    },
    methods: {
        handleResize() {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => this.myChart?.resize(), 100);
        },

        handleDtChange(dt) {
            if (this.currentDt === dt) return;
            this.currentDt = dt;
            this.getRankChartData();
        },

        formatAmount(val) {
            return (Number(val) || 0).toLocaleString("zh-CN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        },

        async getRankChartData() {
            if (this.loadingFlag) return;

            const params = { ...(this.queryParams || {}), dt: this.currentDt };
            if (!params.from || !params.to) return;

            this.loadingFlag = true;
            const isExpense = this.currentDt === 2;

            try {
                this.myChart?.showLoading({
                    text: "加载中...",
                    textColor: "#666",
                    maskColor: "rgba(255,255,255,0.7)",
                });

                const res = await withDelay(() => GetChartExpenseRank(params));
                const list = res?.payload?.list || [];

                // Sort by amount descending, keep top 10
                const rankData = list
                    .map((item) => ({
                        name: item.categoryName || "未知",
                        value: Number(item.totalAmount) || 0,
                    }))
                    .filter((item) => item.value > 0)
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10);

                if (!rankData.length) {
                    this.myChart?.clear();
                    this.myChart?.setOption({
                        title: {
                            text: "暂无数据",
                            left: "center",
                            top: "middle",
                            textStyle: { color: "#909399", fontSize: 14, fontWeight: "normal" },
                        },
                    });
                    return;
                }

                // Horizontal bars: ECharts draws categories bottom-up,
                // so reverse the array to put the largest amount on top
                const names = rankData.map((item) => item.name).reverse();
                const values = rankData.map((item) => item.value).reverse();
                const maxValue = Math.max(...values);
                const barColor = isExpense ? EXPENSE_COLOR : INCOME_COLOR;

                this.myChart.setOption(
                    {
                        grid: {
                            left: 12,
                            right: 70,
                            top: 10,
                            bottom: 10,
                            containLabel: true,
                        },
                        tooltip: {
                            trigger: "axis",
                            axisPointer: { type: "shadow" },
                            formatter: (params) => {
                                const p = params[0];
                                return `${p.name}<br/>金额：${this.formatAmount(p.value)} 元`;
                            },
                        },
                        xAxis: {
                            type: "value",
                            max: maxValue * 1.15, // Reserve space on the right for value labels
                            axisLine: { show: false },
                            axisTick: { show: false },
                            axisLabel: { show: false },
                            splitLine: { show: false },
                        },
                        yAxis: {
                            type: "category",
                            data: names,
                            axisLine: { show: false },
                            axisTick: { show: false },
                            axisLabel: {
                                color: "#606266",
                                fontSize: 12,
                            },
                        },
                        series: [
                            {
                                type: "bar",
                                data: values,
                                barWidth: 14,
                                itemStyle: {
                                    color: barColor,
                                    borderRadius: [0, 7, 7, 0],
                                },
                                // Show amount to the right of each bar
                                label: {
                                    show: true,
                                    position: "right",
                                    distance: 8,
                                    formatter: (p) => this.formatAmount(p.value),
                                    color: "#606266",
                                    fontSize: 12,
                                },
                                // Background track behind each bar
                                showBackground: true,
                                backgroundStyle: {
                                    color: "rgba(0, 0, 0, 0.04)",
                                    borderRadius: [0, 7, 7, 0],
                                },
                            },
                        ],
                    },
                    { notMerge: true },
                );
            } catch (err) {
                console.error("获取分类排行图表失败：", err);
            } finally {
                this.myChart?.hideLoading();
                this.loadingFlag = false;
            }
        },

        refreshChart() {
            this.getRankChartData();
        },
    },
};
</script>

<style scoped>
.chart-card {
    width: 100%;
}

.chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px 0;
}

.chart-title {
    font-size: 15px;
    font-weight: 600;
    color: #303133;
}

.chart-switch {
    display: inline-flex;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    overflow: hidden;
}

.switch-btn {
    padding: 4px 16px;
    font-size: 13px;
    color: #606266;
    background: #fff;
    border: none;
    outline: none;
    cursor: pointer;
    transition: all 0.2s;
}

.switch-btn + .switch-btn {
    border-left: 1px solid #dcdfe6;
}

.switch-btn:hover {
    color: #409eff;
}

.switch-btn.active {
    color: #fff;
    background: #409eff;
}
</style>
