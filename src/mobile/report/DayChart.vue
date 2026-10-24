<template>
    <div class="chart-card">
        <div class="chart-header">
            <span class="chart-title">每日{{ cfg.label }}趋势</span>
            <span class="chart-total" :style="{ color: cfg.color }">合计 {{ currentTotal }} 元</span>
        </div>
        <div class="chart-body" ref="chart"></div>
    </div>
</template>
<script>
import { GetChartDay } from "../../api/basic.js";
import { withDelay } from "../../utils/common.js";
import * as echarts from "echarts";
const TYPE_OPTIONS = [
    { value: "expense", label: "支出", color: "#f56c6c" },
    { value: "income", label: "收入", color: "#36cbcb" },
];
export default {
    name: "DayChart",
    props: {
        type: { type: String, default: "expense" },
        queryParams: Object,
    },
    data() {
        return {
            myChart: null,
            resizeTimer: null,
            loadingFlag: false,
            chartData: { xData: [], incomeData: [], expenseData: [] },
        };
    },
    computed: {
        cfg() {
            return TYPE_OPTIONS.find((i) => i.value === this.type) || TYPE_OPTIONS[0];
        },
        currentTotal() {
            const data = this.type === "income" ? this.chartData.incomeData : this.chartData.expenseData;
            return data.reduce((s, v) => s + Number(v || 0), 0).toFixed(2);
        },
        activeRawData() {
            return this.type === "income" ? this.chartData.incomeData : this.chartData.expenseData;
        },
    },
    mounted() {
        this.myChart = echarts.init(this.$refs.chart);
        this.getBillChartData();
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
            handler(n, o) {
                if (o !== undefined) this.getBillChartData();
            },
            deep: true,
        },
        type() {
            this.renderChart();
        },
    },
    methods: {
        handleResize() {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => this.myChart?.resize(), 100);
        },
        getQuartile(sorted, pos) {
            const idx = (sorted.length - 1) * pos;
            const f = Math.floor(idx);
            const c = Math.ceil(idx);
            if (f === c) return sorted[idx];
            return sorted[f] + (sorted[c] - sorted[f]) * (idx - f);
        },
        // IQR 计算断轴区间：只要最大值超出上界就断
        calcIQR(dataArr) {
            const statData = dataArr.filter((v) => v != null && !isNaN(v) && Number(v) > 0).map(Number);
            let breaks = [];
            const MIN_STAT_COUNT = 4;
            const K_FACTOR = 2.0;
            if (statData.length >= MIN_STAT_COUNT) {
                const arr = [...statData].sort((a, b) => a - b);
                const Q1 = this.getQuartile(arr, 0.25);
                const Q3 = this.getQuartile(arr, 0.75);
                const IQR = Q3 - Q1;
                const upperBound = Q3 + K_FACTOR * IQR;
                const maxVal = arr[arr.length - 1];
                if (IQR > 0 && maxVal > upperBound) {
                    const breakStart = Number(upperBound.toFixed(2));
                    const breakEnd = Number((maxVal * 0.95).toFixed(2));
                    if (breakEnd > breakStart) {
                        breaks.push({ start: breakStart, end: breakEnd, gap: "12%" });
                    }
                }
            }
            return { breaks };
        },
        async getBillChartData() {
            if (!this.queryParams || this.loadingFlag) return;
            this.loadingFlag = true;
            try {
                this.myChart?.showLoading({
                    text: "加载中...",
                    textColor: "#666",
                    maskColor: "rgba(255,255,255,0.7)",
                });
                const res = await withDelay(() => GetChartDay(this.queryParams));
                const list = res.payload || [];
                const xData = [],
                    incomeData = [],
                    expenseData = [];
                list.forEach((item) => {
                    xData.push(item.day.slice(5));
                    incomeData.push(Number(item.income));
                    expenseData.push(Number(item.expense));
                });
                this.chartData = { xData, incomeData, expenseData };
                this.renderChart();
            } catch (err) {
                console.error("获取每日收支图表失败：", err);
            } finally {
                this.myChart?.hideLoading();
                this.loadingFlag = false;
            }
        },
        renderChart() {
            if (!this.myChart) return;
            const { xData } = this.chartData;
            const rawData = this.activeRawData;
            if (!xData.length) return;

            const { breaks } = this.calcIQR(rawData);

            const option = {
                grid: { left: 44, right: 24, top: 16, bottom: 28 },
                tooltip: {
                    trigger: "axis",
                    confine: true,
                    formatter: (params) => {
                        const p = params[0];
                        if (!p) return "";
                        const realVal = rawData[p.dataIndex];
                        return `${p.axisValue}<br />${this.cfg.label}：${Number(realVal || 0).toFixed(2)}元`;
                    },
                },
                xAxis: {
                    type: "category",
                    data: xData,
                    boundaryGap: false,
                    axisLabel: { interval: "auto", fontSize: 10, color: "#909399" },
                    axisLine: { lineStyle: { color: "#e4e7ed" } },
                },
                yAxis: {
                    type: "value",
                    min: 0,
                    breaks,
                    breakLine: {
                        lineStyle: { color: "#aaaaaa", width: 1.4, type: "solid" },
                    },
                    axisLabel: { fontSize: 10, color: "#909399" },
                    splitLine: { lineStyle: { color: "#f0f0f0" } },
                },
                series: [
                    {
                        name: this.cfg.label,
                        type: "line",
                        smooth: true,
                        data: rawData,
                        symbol: "circle",
                        symbolSize: 4,
                        itemStyle: { color: this.cfg.color },
                        lineStyle: { width: 2 },
                        areaStyle: { opacity: 0.12, color: this.cfg.color },
                    },
                ],
            };
            this.myChart.setOption(option, true);
        },
        refreshChart() {
            this.getBillChartData();
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
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 6px;
    gap: 8px;
}
.chart-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    white-space: nowrap;
}
.chart-total {
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.chart-body {
    height: 240px;
    width: 100%;
}
</style>
