<template>
    <div class="chart-card">
        <div class="chart-header">
            <span class="chart-title">{{ cfg.title }}</span>
            <div class="chart-switch">
                <button
                    class="switch-btn"
                    :class="{ active: currentLg === 1 }"
                    :style="currentLg === 1 ? { background: cfg.color, borderColor: cfg.color } : {}"
                    @click="handleLgChange(1)">
                    大类
                </button>
                <button
                    class="switch-btn"
                    :class="{ active: currentLg === 2 }"
                    :style="currentLg === 2 ? { background: cfg.color, borderColor: cfg.color } : {}"
                    @click="handleLgChange(2)">
                    小类
                </button>
            </div>
        </div>
        <div class="chart-body" ref="chart"></div>
    </div>
</template>

<script>
import { GetChartCategory } from "../../api/basic.js";
import { withDelay } from "../../utils/common.js";
import * as echarts from "echarts";

const TYPE_CONFIG = {
    expense: {
        title: "支出分类构成",
        seriesName: "支出",
        totalLabel: "共支出(元)",
        color: "#409eff",
        field: {
            flatList: "expenseList",
            parentList: "expenseParentList",
            parentName: "parentName",
            flatName: "categoryName",
            childName: "subName",
            amount: "amount",
            totalAmount: "totalAmount",
        },
        palette: [
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
        ],
    },
    income: {
        title: "收入分类构成",
        seriesName: "收入",
        totalLabel: "共收入(元)",
        color: "#36cbcb",
        field: {
            flatList: "incomeList",
            parentList: "incomeParentList",
            parentName: "parentName",
            flatName: "categoryName",
            childName: "subName",
            amount: "amount",
            totalAmount: "totalAmount",
        },
        palette: [
            "#36CBCB",
            "#4ECB73",
            "#5AD8A6",
            "#1E9493",
            "#6DC8EC",
            "#3AA1FF",
            "#5B8FF9",
            "#269A99",
            "#945FB9",
            "#6F5EF9",
            "#F6BD16",
            "#FBD437",
            "#FF9845",
            "#F2637B",
            "#8C8C8C",
            "#9270CA",
            "#FF99C3",
            "#E8684A",
            "#975FE4",
            "#5D7092",
        ],
    },
};

export default {
    name: "CategoryChart",
    props: {
        type: {
            type: String,
            default: "expense",
            validator: (v) => ["expense", "income"].includes(v),
        },
        queryParams: Object,
    },
    data() {
        return {
            myChart: null,
            resizeTimer: null,
            loadingFlag: false,
            currentLg: 1, // 1 大类 / 2 小类
        };
    },
    computed: {
        cfg() {
            return TYPE_CONFIG[this.type] || TYPE_CONFIG.expense;
        },
    },
    mounted() {
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
            handler(n, o) {
                if (o !== undefined) this.getCategoryChartData();
            },
            deep: true,
        },
        type() {
            this.getCategoryChartData();
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
        buildCategoryMap(payload, isChild) {
            const map = new Map();
            const f = this.cfg.field;
            const add = (name, amount) => {
                const value = Number(amount) || 0;
                if (value > 0) map.set(name, (map.get(name) || 0) + value);
            };
            if (isChild) {
                (payload[f.parentList] || []).forEach((parent) => {
                    (parent.childList || []).forEach((child) => {
                        add(child[f.childName] || parent[f.parentName], child[f.amount]);
                    });
                });
            } else {
                const flatList = payload[f.flatList] || [];
                if (flatList.length) {
                    flatList.forEach((item) => {
                        add(item[f.flatName] || item[f.parentName] || "未知", item[f.amount] ?? item[f.totalAmount]);
                    });
                } else {
                    (payload[f.parentList] || []).forEach((parent) => {
                        add(parent[f.parentName] || "未知", parent[f.totalAmount]);
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

                // 1. 先按金额降序排序
                const sortedEntries = [...map.entries()].sort((a, b) => b[1] - a[1]);

                // 2. 根据排序后的结果生成数据，并给前 9 个开启 label 和 labelLine
                const pieData = sortedEntries.map(([name, value], index) => ({
                    name,
                    value: Number(value.toFixed(2)),
                    itemStyle: { color: this.cfg.palette[index % this.cfg.palette.length] },
                    label: { show: index < 9 },
                    labelLine: { show: index < 9 },
                }));

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
                            confine: true,
                            formatter: (p) => `${p.marker}${p.name}<br/>金额：${this.formatAmount(p.value)} 元<br/>占比：${p.percent}%`,
                        },
                        series: [
                            {
                                name: this.cfg.seriesName,
                                type: "pie",
                                center: ["50%", "50%"],
                                radius: ["32%", "48%"],
                                avoidLabelOverlap: true,
                                minAngle: 2,
                                itemStyle: {
                                    borderColor: "#fff",
                                    borderWidth: 2,
                                    borderRadius: 3,
                                },
                                // series 级别的 label，默认显示，数据项内部可以覆盖隐藏
                                label: {
                                    show: true,
                                    position: "outside",
                                    formatter: (p) => {
                                        // 去掉截断逻辑，显示完整名称
                                        return `{name|${p.name}}\n{percent|${p.percent}%}`;
                                    },
                                    rich: {
                                        name: {
                                            fontSize: 11,
                                            color: "#303133",
                                            lineHeight: 16,
                                            align: "center",
                                            fontWeight: 500,
                                        },
                                        percent: {
                                            fontSize: 11,
                                            color: "#909399",
                                            lineHeight: 16,
                                            align: "center",
                                        },
                                    },
                                },
                                labelLine: {
                                    show: true, // 数据项内部会覆盖
                                    length: 15,
                                    length2: 35,
                                    smooth: false,
                                    lineStyle: {
                                        color: "#c0c4cc",
                                        width: 1,
                                    },
                                },
                                // 3. 点击（或悬浮）时的强调状态，强制显示文字和引线
                                emphasis: {
                                    scale: true,
                                    scaleSize: 4,
                                    label: {
                                        show: true,
                                        formatter: (p) => {
                                            return `{name|${p.name}}\n{percent|${p.percent}%}`;
                                        },
                                        rich: {
                                            name: { fontSize: 13, color: "#303133", fontWeight: "bold", lineHeight: 18, align: "center" },
                                            percent: { fontSize: 12, color: "#606266", lineHeight: 18, align: "center" },
                                        },
                                    },
                                    labelLine: {
                                        show: true, // 强制显示引线
                                    },
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
                                    fontSize: 14,
                                    fontWeight: "bold",
                                },
                            },
                            {
                                type: "text",
                                left: "center",
                                top: "52%",
                                style: {
                                    text: this.cfg.totalLabel,
                                    textAlign: "center",
                                    fill: "#909399",
                                    fontSize: 10,
                                },
                            },
                        ],
                    },
                    { notMerge: true },
                );
            } catch (err) {
                console.error("获取分类图表失败：", err);
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

.chart-switch {
    display: inline-flex;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    overflow: hidden;
}

.switch-btn {
    padding: 3px 12px;
    font-size: 12px;
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

.switch-btn.active {
    color: #fff;
    border-color: transparent;
}

.chart-body {
    height: 320px;
    width: 100%;
}
</style>
