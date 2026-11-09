<template>
    <div>
        <!-- 主表单弹窗 -->
        <van-popup v-model:show="showBottom" closeable round position="bottom" :style="{ height: '85%' }">
            <div class="add-body">
                <!-- 顶部：收支 + 时间 -->
                <div class="top-row">
                    <div class="btn-group">
                        <van-button round size="mini" class="dir-btn" :type="formdata.direction === 2 ? 'primary' : 'default'" @click="switchDirection(2)">
                            支出
                        </van-button>
                        <van-button round size="mini" class="dir-btn" :type="formdata.direction === 1 ? 'primary' : 'default'" @click="switchDirection(1)">
                            收入
                        </van-button>
                    </div>
                    <div class="btn-group">
                        <van-button round type="default" size="mini" class="time-btn" @click="showDatePicker = true">
                            {{ dateText }}
                        </van-button>
                        <van-button round type="default" size="mini" class="time-btn" @click="showTimePicker = true">
                            {{ currentTime }}
                        </van-button>
                    </div>
                </div>

                <!-- 金额 + 明细入口 -->
                <div class="amount-row">
                    <input
                        id="amount-input"
                        name="amount"
                        type="text"
                        aria-label="金额"
                        class="amount-input"
                        placeholder="请输入金额"
                        v-model="formdata.amount" />
                    <van-button type="default" class="detail-btn" @click="showDetailPopup = true">
                        添加明细{{ detailRows.length ? `(${detailRows.length})` : "" }}
                    </van-button>
                </div>

                <!-- 分类 -->
                <div v-loading="loading" class="category-wrap">
                    <template v-for="(row, rowIdx) in categoryRows" :key="rowIdx">
                        <div class="category-row">
                            <div
                                v-for="item in row"
                                :key="item.id"
                                class="cate-item"
                                :class="{ active: activeParentId === item.id }"
                                @click="selectParent(item, rowIdx)">
                                {{ item.name }}
                            </div>
                        </div>

                        <div v-if="activeRowIndex === rowIdx && activeSubList.length" class="category-row">
                            <div
                                v-for="sub in activeSubList"
                                :key="sub.id"
                                class="cate-item sub"
                                :class="{ active: activeSubId === sub.id }"
                                @click="selectSub(sub)">
                                {{ sub.name }}
                            </div>
                        </div>
                    </template>
                </div>

                <!-- 备注 -->
                <van-field v-model="formdata.remark" name="remark" class="remark-field" placeholder="写点备注..." />

                <!-- 操作按钮 -->
                <div class="action-row">
                    <van-button type="default" block @click="showBottom = false">取消</van-button>
                    <van-button type="primary" block @click="onSubmit">保存</van-button>
                </div>
            </div>
        </van-popup>

        <!-- 日期选择 -->
        <van-calendar v-model:show="showDatePicker" :min-date="new Date(2020, 0, 1)" :row-height="40" @confirm="onConfirmDate" />

        <!-- 时间选择 -->
        <van-popup v-model:show="showTimePicker" round position="bottom">
            <van-time-picker
                v-model="tempTime"
                title="选择时间"
                :columns-type="['hour', 'minute', 'second']"
                @confirm="onConfirmTime"
                @cancel="showTimePicker = false" />
        </van-popup>

        <!-- 明细编辑弹窗 -->
        <van-popup v-model:show="showDetailPopup" closeable round position="bottom" :style="{ height: '80%' }">
            <div class="detail-popup">
                <div class="detail-popup-title">编辑明细</div>

                <div class="detail-toolbar">
                    <van-button type="primary" size="small" class="small-btn" @click="addDetailRow">添加一行</van-button>
                    <van-button size="small" plain class="small-btn" @click="copyDetailsJson">复制</van-button>
                    <div class="detail-toolbar-total">总计：{{ totalAmount.toFixed(4) }}</div>
                </div>

                <div v-if="!detailRows.length" class="detail-empty">暂无明细，点击"添加一行"开始录入</div>

                <div class="detail-list">
                    <div v-for="(row, index) in detailRows" :key="row.id" class="detail-card">
                        <div class="detail-card-head">
                            <span class="detail-card-index">#{{ index + 1 }}</span>
                            <van-button size="mini" type="danger" plain class="mini-btn" @click="removeDetailRow(index)">删除</van-button>
                        </div>
                        <van-field v-model="row.name" class="detail-field" name="detail-name" label="名称" placeholder="物品名称" />
                        <div class="detail-card-row">
                            <van-field
                                v-model="row.quantity"
                                class="detail-field"
                                name="detail-quantity"
                                label="数量"
                                placeholder="数量"
                                type="number"
                                @input="calculateTotal(index)" />
                            <van-field v-model="row.unit" class="detail-field" name="detail-unit" label="单位" placeholder="单位" />
                        </div>
                        <div class="detail-card-row">
                            <van-field
                                v-model="row.price"
                                class="detail-field"
                                name="detail-price"
                                label="单价"
                                placeholder="单价"
                                type="number"
                                @input="calculateTotal(index)" />
                            <van-field v-model="row.total" class="detail-field" name="detail-total" label="总额" placeholder="总额" readonly />
                        </div>
                    </div>
                </div>

                <div class="detail-popup-footer">
                    <van-button type="primary" block @click="showDetailPopup = false">完成</van-button>
                </div>
            </div>
        </van-popup>
    </div>
</template>

<script>
import { Getcategory, AddTransactions } from "../../api/basic.js";
import dayjs from "dayjs";

export default {
    name: "AddTransIndex",
    data() {
        return {
            showBottom: false,
            showDatePicker: false,
            showTimePicker: false,
            showDetailPopup: false,

            currentTime: dayjs().format("HH:mm:ss"),
            tempTime: ["00", "00", "00"],
            selectDate: dayjs().format("YYYY-MM-DD"),

            formdata: {
                direction: 2,
                amount: "",
                cid: "",
                occ_time: dayjs().format("YYYY-MM-DDTHH:mm:ssZZ"),
                remark: "",
            },

            detailRows: [],

            categoryList: [],
            categoryRows: [],
            activeRowIndex: -1,
            activeParentId: null,
            activeSubList: [],
            activeSubId: null,
            loading: false,
        };
    },
    computed: {
        dateText() {
            return this.selectDate === dayjs().format("YYYY-MM-DD") ? "今天" : this.selectDate;
        },
        totalAmount() {
            return this.detailRows.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
        },
    },
    methods: {
        // ---------- 打开 / 重置 ----------
        onOpenDialog() {
            this.resetForm();
            this.showBottom = true;
            this.loadCategory();
        },
        resetForm() {
            this.currentTime = dayjs().format("HH:mm:ss");
            this.selectDate = dayjs().format("YYYY-MM-DD");
            this.formdata = {
                direction: 2,
                amount: "",
                cid: "",
                occ_time: dayjs().format("YYYY-MM-DDTHH:mm:ssZZ"),
                remark: "",
            };
            this.detailRows = [];
            this.resetCategory();
        },
        resetCategory() {
            this.activeRowIndex = -1;
            this.activeParentId = null;
            this.activeSubList = [];
            this.activeSubId = null;
        },

        // ---------- 时间 ----------
        syncOccTime() {
            this.formdata.occ_time = `${this.selectDate}T${this.currentTime}+0800`;
        },
        onConfirmDate(date) {
            this.selectDate = dayjs(date).format("YYYY-MM-DD");
            this.syncOccTime();
            this.showDatePicker = false;
        },
        onConfirmTime({ selectedValues }) {
            this.currentTime = selectedValues.join(":");
            this.syncOccTime();
            this.showTimePicker = false;
        },

        // ---------- 分类 ----------
        async switchDirection(val) {
            this.formdata.direction = val;
            this.resetCategory();
            await this.loadCategory();
        },
        async loadCategory() {
            this.loading = true;
            try {
                const res = await Getcategory({ direction: this.formdata.direction });
                this.categoryList = res.payload?.items || [];
                const rows = [];
                for (let i = 0; i < this.categoryList.length; i += 5) {
                    rows.push(this.categoryList.slice(i, i + 5));
                }
                this.categoryRows = rows;
            } finally {
                this.loading = false;
            }
        },
        selectParent(parent, rowIdx) {
            this.activeParentId = parent.id;
            this.activeRowIndex = rowIdx;
            this.activeSubList = parent.children || [];
            this.activeSubId = null;
            this.formdata.cid = parent.id;
        },
        selectSub(sub) {
            this.activeSubId = sub.id;
            this.formdata.cid = sub.id;
        },

        // ---------- 明细 ----------
        addDetailRow() {
            this.detailRows.push({
                id: Date.now() + Math.random(),
                name: "",
                quantity: "",
                price: "",
                total: "",
                unit: "",
            });
        },
        removeDetailRow(index) {
            this.detailRows.splice(index, 1);
        },
        calculateTotal(index) {
            const row = this.detailRows[index];
            if (row && row.quantity !== "" && row.price !== "") {
                row.total = (Number(row.quantity) * Number(row.price)).toFixed(4);
            } else {
                row.total = "";
            }
        },
        copyDetailsJson() {
            const list = this.detailRows.map((row) => ({
                name: row.name ?? "",
                quantity: row.quantity ?? "",
                price: row.price ?? "",
                total: row.total ?? "",
                unit: row.unit ?? "",
            }));
            const jsonStr = JSON.stringify(list);

            const fallback = () => {
                const textarea = document.createElement("textarea");
                textarea.value = jsonStr;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand("copy");
                    this.$toast("明细已复制到剪贴板");
                } catch {
                    this.$toast("复制失败");
                }
                document.body.removeChild(textarea);
            };

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard
                    .writeText(jsonStr)
                    .then(() => this.$toast("明细已复制到剪贴板"))
                    .catch(fallback);
            } else {
                fallback();
            }
        },

        // ---------- 提交 ----------
        validate() {
            if (!this.formdata.occ_time) return "请选择时间";
            if (this.formdata.amount === "" || this.formdata.amount === null) return "请输入金额";

            const amountNum = Number(this.formdata.amount);
            if (isNaN(amountNum) || amountNum <= 0) return "请输入正确的金额";
            if (!this.formdata.cid) return "请选择分类";

            for (let i = 0; i < this.detailRows.length; i++) {
                const row = this.detailRows[i];
                if (!row.name) return `第${i + 1}行明细：请输入物品名称`;
                if (row.quantity === "" || isNaN(Number(row.quantity)) || Number(row.quantity) <= 0) return `第${i + 1}行明细：请输入有效的数量`;
                if (!row.unit) return `第${i + 1}行明细：请输入有效的单位`;
                if (row.price === "" || isNaN(Number(row.price)) || Number(row.price) <= 0) return `第${i + 1}行明细：请输入有效的单价`;
            }
            return "";
        },
        buildPayload() {
            let amount = Number(this.formdata.amount);
            if (this.formdata.direction === 2) amount = -Math.abs(amount);

            return {
                cid: this.formdata.cid,
                occ_time: this.formdata.occ_time,
                amount,
                remark: this.formdata.remark,
                detail: this.detailRows.map((row) => ({
                    name: row.name,
                    quantity: Number(row.quantity),
                    price: Number(row.price),
                    total: Number(row.total),
                    unit: row.unit,
                })),
            };
        },
        async onSubmit() {
            const err = this.validate();
            if (err) return this.$message.error(err);

            try {
                await AddTransactions(this.buildPayload());
                this.$message.success("添加成功");
                this.$globalBus.emit("onRefresh");
                this.showBottom = false;
                this.detailRows = [];
            } catch (e) {
                this.$message.error(e.data?.metadata?.message || "提交失败");
            }
        },
    },
};
</script>

<style scoped>
/* ========== 主体 ========== */
.add-body {
    margin: 40px 15px 0;
    padding-bottom: 20px;
}

/* ========== 顶部按钮行 ========== */
.top-row {
    display: flex;
    justify-content: space-between;
}
.btn-group {
    display: flex;
    gap: 5px;
}
.dir-btn {
    width: 50px;
}
.time-btn {
    min-width: 50px;
}

/* ========== 金额 + 明细 ========== */
.amount-row {
    margin: 10px 0;
    display: flex;
    align-items: center;
    gap: 8px;
}
.amount-input {
    flex: 0 0 180px;
    min-width: 0;
    box-sizing: border-box;
    font-size: 18px;
    padding: 8px;
    border: 1px solid #eee;
    border-radius: 6px;
}
.detail-btn {
    flex: 1;
    height: 39px;
    font-size: 16px;
}

/* ========== 分类 ========== */
.category-wrap {
    margin-top: 10px;
}
.category-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
}
.cate-item {
    flex: 1;
    min-width: 60px;
    padding: 8px 4px;
    border-radius: 6px;
    font-size: 13px;
    text-align: center;
    white-space: nowrap;
    box-sizing: border-box;
    background: #f2f3f5;
    color: #333;
}
.cate-item.active {
    background: #1989fa;
    color: #fff;
}
.cate-item.sub {
    background: #e8f4ff;
    color: #1989fa;
}
.cate-item.sub.active {
    background: #1989fa;
    color: #fff;
}

/* ========== 备注 ========== */
.remark-field {
    margin-top: 15px;
}

/* ========== 底部按钮 ========== */
.action-row {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}

/* ========== 明细弹窗 ========== */
.detail-popup {
    padding: 16px 12px;
    height: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
}
.detail-popup-title {
    font-size: 15px;
    font-weight: 600;
    text-align: center;
    margin: 6px 0 10px;
    color: #323233;
}
.detail-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}
.small-btn {
    height: 28px;
    font-size: 12px;
    padding: 0 10px;
    border-radius: 5px;
}
.mini-btn {
    height: 22px;
    font-size: 11px;
    padding: 0 8px;
    border-radius: 4px;
}
.detail-toolbar-total {
    margin-left: auto;
    font-weight: bold;
    color: #1989fa;
    font-size: 12px;
}
.detail-empty {
    text-align: center;
    color: #969799;
    font-size: 12px;
    padding: 20px 0;
}
.detail-list {
    flex: 1;
    overflow-y: auto;
    padding-right: 2px;
}
.detail-card {
    border: 1px solid #ebedf0;
    border-radius: 6px;
    padding: 4px 0 2px;
    margin-bottom: 6px;
    background: #fafbfc;
}
.detail-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px 2px;
}
.detail-card-index {
    font-size: 11px;
    color: #969799;
    font-weight: 600;
}
.detail-card-row {
    display: flex;
}
.detail-card-row .detail-field {
    flex: 1;
}
.detail-field {
    padding: 4px 8px;
}
.detail-popup-footer {
    padding-top: 8px;
}
</style>
