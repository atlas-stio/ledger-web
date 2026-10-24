<template>
    <div>
        <!-- 顶部切换按钮组 -->
        <div style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center">
            <span>视图模式：</span>
            <button
                @click="
                    currentMode = 'normalBreak';
                    renderChart();
                "
                :style="modeStyle('normalBreak')">
                自动断轴
            </button>
            <button
                @click="
                    currentMode = 'logAxis';
                    renderChart();
                "
                :style="modeStyle('logAxis')">
                对数坐标轴
            </button>
        </div>
        <div class="chart-card" ref="chart" style="height: 300px; width: 100%"></div>
    </div>
</template>
<script>
import { GetChartDay } from "../../../api/basic.js";
import { withDelay } from "../../../utils/common.js";
import * as echarts from "echarts";
export default {
    name: "DayIncomeChart",
    props: {
        queryParams: Object,
    },
    data() {
        return {
            myChart: null,
            resizeTimer: null,
            loadingFlag: false,
            // 剩余两种模式：normalBreak / logAxis
            currentMode: "normalBreak",
            cacheXData: [],
            cacheIncomeRaw: [],
        };
    },
    mounted() {
        this.myChart = echarts.init(this.$refs.chart);
        this.getBillChartData();
        window.addEventListener("resize", this.handleResize);
    },
    beforeUnmount() {
        clearTimeout(this.resizeTimer);
        window.removeEventListener("resize", this.handleResize);
        if (this.myChart) {
            this.myChart.dispose();
            this.myChart = null;
        }
    },
    watch: {
        queryParams: {
            handler(newVal, oldVal) {
                if (oldVal !== undefined) {
                    this.getBillChartData();
                }
            },
            deep: true,
        },
    },
    methods: {
        handleResize() {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                this.myChart && this.myChart.resize();
            }, 100);
        },
        // 按钮样式
        modeStyle(mode) {
            return {
                padding: "4px 10px",
                border: this.currentMode === mode ? "1px solid #409EFF" : "1px solid #ccc",
                background: this.currentMode === mode ? "#409EFF" : "#fff",
                color: this.currentMode === mode ? "#fff" : "#333",
                borderRadius: "4px",
                cursor: "pointer",
            };
        },
        // 四分位公共函数
        getQuartile(sorted, pos) {
            const idx = (sorted.length - 1) * pos;
            const f = Math.floor(idx);
            const c = Math.ceil(idx);
            if (f === c) return sorted[idx];
            return sorted[f] + (sorted[c] - sorted[f]) * (idx - f);
        },
        // 公共IQR计算，返回 {statData, upperBound, breaks, breakTipText}
        calcIQR(dataArr) {
            const statData = [...dataArr].filter((v) => {
                return v != null && !isNaN(v) && v > 0;
            });
            let breaks = [];
            let breakTipText = "";
            let upperBound = null;
            const MIN_STAT_COUNT = 6;
            const K_FACTOR = 2.0;
            const MIDDLE_RATIO_THRESHOLD = 0.2;
            if (statData.length >= MIN_STAT_COUNT) {
                const arr = [...statData].sort((a, b) => a - b);
                const Q1 = this.getQuartile(arr, 0.25);
                const Q3 = this.getQuartile(arr, 0.75);
                const IQR = Q3 - Q1;
                upperBound = Q3 + K_FACTOR * IQR;
                const maxVal = arr[arr.length - 1];
                const middlePoints = arr.filter((v) => v > upperBound && v < maxVal);
                const middleRatio = middlePoints.length / arr.length;
                if (maxVal > upperBound && middleRatio <= MIDDLE_RATIO_THRESHOLD) {
                    const breakStart = Number(upperBound.toFixed(2));
                    const breakEnd = Number((maxVal * 0.95).toFixed(2));
                    breaks.push({
                        start: breakStart,
                        end: breakEnd,
                        gap: "12%",
                    });
                    breakTipText = `Y轴已截断，省略区间：[${breakStart.toFixed(2)} ~ ${breakEnd.toFixed(2)}]`;
                }
            }
            return { statData, upperBound, breaks, breakTipText };
        },
        // 根据缓存的数据 + currentMode 渲染图表
        renderChart() {
            const xData = this.cacheXData;
            const incomeRaw = this.cacheIncomeRaw;
            if (!xData.length) return;
            const { breaks, breakTipText } = this.calcIQR(incomeRaw);
            let option = null;

            if (this.currentMode === "normalBreak") {
                // 模式1：自动断轴
                option = {
                    grid: {
                        left: 80,
                        right: 60,
                        top: breakTipText ? 60 : 40,
                        bottom: 40,
                    },
                    title: {
                        text: "月度每日收入统计【自动断轴】",
                        left: "center",
                        subtext: breakTipText,
                        subtextStyle: { fontSize: 11, color: "#f56c6c" },
                        textStyle: { fontSize: 16 },
                    },
                    tooltip: {
                        trigger: "axis",
                        formatter(params) {
                            let tip = params[0].axisValue;
                            params.forEach((p) => {
                                tip += `<br />${p.seriesName}：${p.value.toFixed(2)}元`;
                            });
                            return tip;
                        },
                    },
                    xAxis: {
                        type: "category",
                        data: xData,
                        axisLabel: { interval: 2, rotate: 30 },
                        boundaryGap: false,
                    },
                    yAxis: {
                        type: "value",
                        name: "金额(元)",
                        min: 0,
                        breaks: breaks,
                        breakLine: {
                            lineStyle: { color: "#aaaaaa", width: 1.4, type: "solid" },
                        },
                    },
                    series: [
                        {
                            name: "收入",
                            type: "line",
                            smooth: true,
                            data: incomeRaw,
                            itemStyle: { color: "#36cbcb" },
                            lineStyle: { width: 2 },
                            symbol: "circle",
                            symbolSize: 6,
                        },
                    ],
                };
            } else if (this.currentMode === "logAxis") {
                // 模式2：对数坐标轴，0转为'-'，默认断开空值
                const logData = incomeRaw.map((v) => (v > 0 ? v : "-"));
                option = {
                    grid: {
                        left: 80,
                        right: 60,
                        top: 40,
                        bottom: 40,
                    },
                    title: {
                        text: "月度每日收入统计【对数坐标轴】",
                        left: "center",
                        textStyle: { fontSize: 16 },
                    },
                    tooltip: {
                        trigger: "axis",
                        formatter(params) {
                            let tip = params[0].axisValue;
                            params.forEach((p) => {
                                tip += `<br />${p.seriesName}：${p.value !== "-" ? Number(p.value).toFixed(2) : "0.00"}元`;
                            });
                            return tip;
                        },
                    },
                    xAxis: {
                        type: "category",
                        data: xData,
                        axisLabel: { interval: 2, rotate: 30 },
                        boundaryGap: false,
                    },
                    yAxis: {
                        type: "log",
                        name: "金额(元)",
                        min: 1,
                    },
                    series: [
                        {
                            name: "收入",
                            type: "line",
                            smooth: true,
                            data: logData,
                            itemStyle: { color: "#36cbcb" },
                            lineStyle: { width: 2 },
                            symbol: "circle",
                            symbolSize: 6,
                        },
                    ],
                };
            }

            this.myChart.setOption(option, { notMerge: true });
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
                const xData = [];
                const incomeData = [];
                list.forEach((item) => {
                    xData.push(item.day.slice(5));
                    incomeData.push(Number(item.income));
                });
                this.cacheXData = xData;
                this.cacheIncomeRaw = incomeData;
                this.renderChart();
                this.myChart?.hideLoading();
            } catch (err) {
                this.myChart?.hideLoading();
                console.error("获取每日收入图表失败：", err);
            } finally {
                this.loadingFlag = false;
            }
        },
        refreshChart() {
            this.getBillChartData();
        },
    },
};
</script>
