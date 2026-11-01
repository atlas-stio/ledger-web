<template>
    <div>
        <div style="margin-bottom: 8px; display: flex; gap: 8px; align-items: center">
            <span>视图模式：</span>
            <button @click="setMode('normalBreak')" :style="modeStyle('normalBreak')">普通坐标轴</button>
            <button @click="setMode('logAxis')" :style="modeStyle('logAxis')">对数坐标轴</button>
        </div>
        <div class="chart-card" ref="chart" style="height: 300px; width: 100%"></div>
    </div>
</template>
<script>
import { GetChartDay, GetChartMonth, GetChartYear } from "../../../api/basic.js";
import { withDelay } from "../../../utils/common.js";
import { setRouteQuery, getRouteQuery } from "../../../utils/routeQuery";
import * as echarts from "echarts";

// 按 from/to 跨度自动选接口：
//   ≤62 天     → chart/day   （X 轴 MM-DD）
//   ≤366 天    → chart/month （X 轴 YYYY-MM）
//   >366 天    → chart/year  （X 轴 YYYY）
function pickTrendApi(from, to) {
    if (!from || !to) return { api: GetChartDay, word: "每日", slice: 5 };
    const days = Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
    if (days <= 62) return { api: GetChartDay, word: "每日", slice: 5 };
    if (days <= 366) return { api: GetChartMonth, word: "每月", slice: 0 };
    return { api: GetChartYear, word: "每年", slice: 0 };
}

const QUERY_MODE = "incMode";
const VALID_MODES = ["normalBreak", "logAxis"];

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
            cacheTitleWord: "每日",
            isReady: false,
        };
    },
    mounted() {
        // 从 URL 恢复视图模式
        const saved = getRouteQuery(this.$route, [QUERY_MODE], { [QUERY_MODE]: "normalBreak" });
        if (VALID_MODES.includes(saved[QUERY_MODE])) {
            this.currentMode = saved[QUERY_MODE];
        }

        this.myChart = echarts.init(this.$refs.chart);
        this.getBillChartData();
        window.addEventListener("resize", this.handleResize);
        this.$nextTick(() => {
            this.isReady = true;
        });
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
        syncToUrl() {
            if (!this.isReady) return;
            setRouteQuery(this.$router, this.$route, { [QUERY_MODE]: this.currentMode });
        },

        setMode(mode) {
            if (this.currentMode === mode) return;
            this.currentMode = mode;
            this.syncToUrl();
            this.renderChart();
        },
        handleResize() {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => {
                this.myChart && this.myChart.resize();
            }, 100);
        },
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
        getQuartile(sorted, pos) {
            const idx = (sorted.length - 1) * pos;
            const f = Math.floor(idx);
            const c = Math.ceil(idx);
            if (f === c) return sorted[idx];
            return sorted[f] + (sorted[c] - sorted[f]) * (idx - f);
        },
        calcIQR(dataArr) {
            const statData = [...dataArr].filter((v) => v != null && !isNaN(v) && v > 0);
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
        renderChart() {
            const xData = this.cacheXData;
            const incomeRaw = this.cacheIncomeRaw;
            if (!xData.length) return;

            const { breaks, breakTipText } = this.calcIQR(incomeRaw);
            const titleWord = this.cacheTitleWord || "每日";
            const labelInterval = xData.length <= 15 ? 0 : Math.floor(xData.length / 12);
            const rotate = 30;

            let option = null;

            if (this.currentMode === "normalBreak") {
                option = {
                    grid: {
                        left: 80,
                        right: 60,
                        top: breakTipText ? 60 : 40,
                        bottom: 40,
                    },
                    title: {
                        text: `${titleWord}收入统计`,
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
                                tip += `<br />${p.seriesName}：${Number(p.value).toFixed(2)}元`;
                            });
                            return tip;
                        },
                    },
                    xAxis: {
                        type: "category",
                        data: xData,
                        axisLabel: { interval: labelInterval, rotate },
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
                const logData = incomeRaw.map((v) => (v > 0 ? v : "-"));
                option = {
                    grid: { left: 80, right: 60, top: 40, bottom: 40 },
                    title: {
                        text: `${titleWord}收入统计【对数坐标轴】`,
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
                        axisLabel: { interval: labelInterval, rotate },
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

                const { api, word, slice } = pickTrendApi(this.queryParams.from, this.queryParams.to);
                this.cacheTitleWord = word;

                const res = await withDelay(() => api(this.queryParams));
                const list = res.payload || [];
                const xData = [];
                const incomeData = [];
                list.forEach((item) => {
                    xData.push(slice ? item.day.slice(slice) : item.day);
                    incomeData.push(Number(item.income));
                });
                this.cacheXData = xData;
                this.cacheIncomeRaw = incomeData;
                this.renderChart();
                this.myChart?.hideLoading();
            } catch (err) {
                this.myChart?.hideLoading();
                console.error("获取收入趋势图表失败：", err);
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
