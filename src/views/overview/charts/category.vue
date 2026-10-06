<template>
    <div class="chart-card">
        <div class="chart-header">
            <span class="chart-title">支出分类构成</span>
            <div class="chart-switch">
                <button class="switch-btn" :class="{ active: currentLg === 1 }" @click="handleLgChange(1)">大类</button>
                <button class="switch-btn" :class="{ active: currentLg === 2 }" @click="handleLgChange(2)">小类</button>
            </div>
        </div>

        <div class="chart-body" ref="chart" style="height: 300px; width: 100%"></div>
    </div>
</template>

<script>
import { GetChartCategory } from "../../../api/basic.js";
import { withDelay } from "../../../utils/common.js";
import * as echarts from "echarts";

const PALETTE = [
    "#5B8FF9",
    "#5AD8A6",
    "#F6BD16",
    "#5D7092",
    "#F2637B",
    "#6F5EF9",
    "#6DC8EC",
    "#945FB9",
    "#FF9845",
    "#1E9493",
    "#FF99C3",
    "#4ECB73",
    "#FBD437",
    "#36CBCB",
    "#975FE4",
    "#8C8C8C",
    "#3AA1FF",
    "#E8684A",
    "#9270CA",
    "#269A99",
];

export default {
    name: "CategoryChart",
    props: {
        queryParams: Object,
    },
    data() {
        return {
            myChart: null,
            resizeTimer: null,
            loadingFlag: false,
            currentLg: 1, // 1 parent category / 2 sub category
        };
    },
    mounted() {
        if (this.queryParams?.lg) {
            this.currentLg = Number(this.queryParams.lg);
        }
        this.myChart = echarts.init(this.$refs.chart);
        this.getCategoryChartData();
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
                if (newVal?.lg) this.currentLg = Number(newVal.lg);
                this.getCategoryChartData();
            },
            deep: true,
        },
    },
    methods: {
        handleResize() {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => this.myChart?.resize(), 100);
        },

        handleLgChange(lg) {
            if (this.currentLg === lg) return;
            this.currentLg = lg;
            this.getCategoryChartData();
        },

        formatAmount(val) {
            return (Number(val) || 0).toLocaleString("zh-CN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
        },

        // Aggregate API data by category
        buildCategoryMap(payload, isChild) {
            const map = new Map();
            const add = (name, amount) => {
                const value = Number(amount) || 0;
                if (value > 0) map.set(name, (map.get(name) || 0) + value);
            };

            if (isChild) {
                // Sub category: expenseParentList -> childList
                (payload.expenseParentList || []).forEach((parent) => {
                    (parent.childList || []).forEach((child) => {
                        add(child.subName || parent.parentName, child.amount);
                    });
                });
            } else {
                // Parent category: prefer the flat expenseList
                const flatList = payload.expenseList || [];
                if (flatList.length) {
                    flatList.forEach((item) => {
                        add(item.categoryName || item.parentName || "未知", item.amount ?? item.totalAmount);
                    });
                } else {
                    // Fallback: derive from expenseParentList
                    (payload.expenseParentList || []).forEach((parent) => {
                        add(parent.parentName || "未知", parent.totalAmount);
                    });
                }
            }
            return map;
        },

        async getCategoryChartData() {
            if (this.loadingFlag) return;

            const params = { ...(this.queryParams || {}), lg: this.currentLg };
            if (!params.from || !params.to) return;

            this.loadingFlag = true;

            try {
                this.myChart?.showLoading({
                    text: "加载中...",
                    textColor: "#666",
                    maskColor: "rgba(255,255,255,0.7)",
                });

                const res = await withDelay(() => GetChartCategory(params));
                const map = this.buildCategoryMap(res?.payload || {}, this.currentLg === 2);

                const pieData = [...map.entries()]
                    .map(([name, value], index) => ({
                        name,
                        value: Number(value.toFixed(2)),
                        itemStyle: { color: PALETTE[index % PALETTE.length] },
                    }))
                    .sort((a, b) => b.value - a.value);

                if (!pieData.length) {
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

                const total = pieData.reduce((sum, item) => sum + item.value, 0);

                this.myChart.setOption(
                    {
                        tooltip: {
                            trigger: "item",
                            formatter: (p) => `${p.marker}${p.name}<br/>金额：${this.formatAmount(p.value)} 元<br/>占比：${p.percent}%`,
                        },
                        series: [
                            {
                                name: "支出",
                                type: "pie",
                                center: ["50%", "50%"],
                                radius: ["38%", "58%"],
                                avoidLabelOverlap: true,
                                minAngle: 2,
                                itemStyle: {
                                    borderColor: "#fff",
                                    borderWidth: 2,
                                    borderRadius: 4,
                                },
                                label: {
                                    show: true,
                                    position: "outside",
                                    formatter: "{b} {d}%",
                                    fontSize: 12,
                                    color: "inherit",
                                    padding: [0, 4],
                                },
                                labelLine: {
                                    show: true,
                                    length: 30,
                                    length2: 45,
                                    lineStyle: { width: 1, color: "inherit" },
                                },
                                emphasis: {
                                    scale: true,
                                    scaleSize: 8,
                                    label: { fontSize: 14, fontWeight: "bold" },
                                },
                                data: pieData,
                            },
                        ],
                        graphic: [
                            {
                                type: "text",
                                left: "center",
                                top: "44%",
                                style: {
                                    text: this.formatAmount(total),
                                    textAlign: "center",
                                    fill: "#303133",
                                    fontSize: 20,
                                    fontWeight: "bold",
                                },
                            },
                            {
                                type: "text",
                                left: "center",
                                top: "53%",
                                style: {
                                    text: "共支出(元)",
                                    textAlign: "center",
                                    fill: "#909399",
                                    fontSize: 12,
                                },
                            },
                        ],
                    },
                    { notMerge: true },
                );
            } catch (err) {
                console.error("获取支出分类图表失败：", err);
            } finally {
                this.myChart?.hideLoading();
                this.loadingFlag = false;
            }
        },

        refreshChart() {
            this.getCategoryChartData();
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
