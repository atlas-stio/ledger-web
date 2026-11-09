<template>
    <div class="chart-card">
        <div class="chart-header">
            <span class="chart-title">{{ isExpense ? "支出" : "收入" }}分类 TOP 排行</span>
        </div>
        <div class="chart-body" ref="chart"></div>
    </div>
</template>

<script>
import { GetChartExpenseRank } from "../../api/basic.js";
import { withDelay } from "../../utils/common.js";
import * as echarts from "echarts";

const EXPENSE_COLOR = "#f56c6c";
const INCOME_COLOR = "#36cbcb";

export default {
    name: "RankChart",
    props: {
        type: { type: String, default: "expense" },
        queryParams: Object,
    },
    data() {
        return {
            myChart: null,
            resizeTimer: null,
            reqSeq: 0,
        };
    },
    computed: {
        isExpense() {
            return this.type === "expense";
        },
    },
    mounted() {
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
            handler() {
                this.getRankChartData();
            },
            deep: true,
        },
        type() {
            this.getRankChartData();
        },
    },
    methods: {
        handleResize() {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => this.myChart?.resize(), 100);
        },
        formatAmount(val) {
            return (Number(val) || 0).toLocaleString("zh-CN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        },
        async getRankChartData() {
            if (!this.queryParams?.from || !this.queryParams?.to) return;

            const params = { ...this.queryParams, dt: this.isExpense ? 2 : 1 };
            const seq = ++this.reqSeq;

            this.myChart?.showLoading({
                text: "加载中...",
                textColor: "#666",
                maskColor: "rgba(255,255,255,0.7)",
            });

            try {
                const res = await withDelay(() => GetChartExpenseRank(params));
                if (seq !== this.reqSeq) return;

                const list = res?.payload?.list || [];
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

                const names = rankData.map((item) => item.name).reverse();
                const values = rankData.map((item) => item.value).reverse();
                const maxValue = Math.max(...values);
                const barColor = this.isExpense ? EXPENSE_COLOR : INCOME_COLOR;

                this.myChart.setOption(
                    {
                        grid: { left: 12, right: 70, top: 10, bottom: 10, containLabel: true },
                        tooltip: {
                            trigger: "axis",
                            axisPointer: { type: "shadow" },
                            confine: true,
                            formatter: (params) => {
                                const p = params[0];
                                return `${p.name}<br/>金额：${this.formatAmount(p.value)} 元`;
                            },
                        },
                        xAxis: {
                            type: "value",
                            max: maxValue * 1.15,
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
                            axisLabel: { color: "#606266", fontSize: 12, width: 60, overflow: "truncate" },
                        },
                        series: [
                            {
                                type: "bar",
                                data: values,
                                barWidth: 12,
                                itemStyle: { color: barColor, borderRadius: [0, 6, 6, 0] },
                                label: {
                                    show: true,
                                    position: "right",
                                    distance: 6,
                                    formatter: (p) => this.formatAmount(p.value),
                                    color: "#606266",
                                    fontSize: 11,
                                },
                                showBackground: true,
                                backgroundStyle: { color: "rgba(0, 0, 0, 0.04)", borderRadius: [0, 6, 6, 0] },
                            },
                        ],
                    },
                    { notMerge: true },
                );
            } catch (err) {
                console.error("获取分类排行图表失败：", err);
            } finally {
                if (seq === this.reqSeq) this.myChart?.hideLoading();
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
    background: #fff;
    border-radius: 10px;
    padding: 12px;
    box-sizing: border-box;
}

.chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
}

.chart-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
}

.chart-body {
    height: 280px;
    width: 100%;
}
</style>
