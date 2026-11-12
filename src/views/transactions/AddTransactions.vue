<template>
    <el-dialog title="添加记账" v-model="dialogVisible" :close-on-click-modal="false" draggable width="830px">
        <div>
            <el-form :model="formdata" label-width="auto" :rules="formRules" ref="form">
                <el-row :gutter="16">
                    <el-col :span="10">
                        <el-form-item label="金额" prop="amount">
                            <el-space>
                                <el-input v-model="formdata.amount" style="width: 190px" />
                                <el-tooltip content="添加明细" placement="top">
                                    <el-button link :icon="Plus" @click="addDetailRow"> </el-button>
                                </el-tooltip>
                                <el-tooltip content="复制明细" placement="top">
                                    <el-button link class="copy-btn" :icon="DocumentCopy" @click="copyDetailsJson" />
                                </el-tooltip>
                            </el-space>
                        </el-form-item>
                    </el-col>
                    <el-col :span="4">
                        <el-form-item label="">
                            <el-segmented
                                v-model="formdata.direction"
                                :options="[
                                    { value: '2', label: '支出' },
                                    { value: '1', label: '收入' },
                                ]" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="10">
                        <el-form-item label="时间" prop="occ_time">
                            <el-date-picker v-model="formdata.occ_time" type="datetime" style="width: 100%" value-format="YYYY-MM-DDTHH:mm:ssZZ" />
                        </el-form-item>
                    </el-col>
                </el-row>

                <el-form-item label="分类" prop="category">
                    <TreeCategorySelect v-model="formdata.category" :direction="Number(formdata.direction)" />
                </el-form-item>

                <el-form-item label="明细" v-if="detailRows.length > 0">
                    <div class="detail-list">
                        <div v-for="(row, index) in detailRows" :key="row.id" class="detail-row">
                            <el-input class="col-name" v-model="row.name" placeholder="物品名称" @input="calculateTotal(index)" />
                            <el-input class="col-qty" v-model="row.quantity" placeholder="数量" @input="calculateTotal(index)" />
                            <el-select class="col-unit" v-model="row.unit" placeholder="单位" filterable allow-create>
                                <el-option label="斤" value="斤" />
                                <el-option label="克" value="克" />
                                <el-option label="个" value="个" />
                                <el-option label="份" value="份" />
                            </el-select>
                            <el-input class="col-price" v-model="row.price" placeholder="单价" @input="calculateTotal(index)" />
                            <el-input class="col-total" v-model="row.total" placeholder="总额" />
                            <div class="col-actions">
                                <el-space>
                                    <el-button link :icon="Remove" @click="removeDetailRow(index)" />
                                    <el-button link :icon="CirclePlus" @click="addDetailRow" />
                                </el-space>
                            </div>
                        </div>
                        <div class="detail-total">
                            <span>明细总计: {{ totalAmount.toFixed(4) }}</span>
                        </div>
                    </div>
                </el-form-item>

                <el-form-item label="写点备注">
                    <el-input ref="remarkInput" v-model="formdata.remark" style="width: 100%">
                        <template #append>
                            <el-tooltip content="键入分隔符" placement="top">
                                <el-button link @click="appendSeparator">｜</el-button>
                            </el-tooltip>
                        </template>
                    </el-input>
                </el-form-item>

                <el-form-item label="账单标签">
                    <el-select
                        v-model="formdata.tags"
                        multiple
                        filterable
                        remote
                        allow-create
                        default-first-option
                        :reserve-keyword="false"
                        :remote-method="onTagSearch"
                        :loading="tagLoading"
                        placeholder="选择或输入新标签"
                        style="width: 100%"
                        popper-class="narrow-tag-popper"
                        :fit-input-width="false"
                        :teleported="false"
                        @visible-change="onTagDropdown">
                        <el-option v-for="item in tagOptions" :key="item.name" :label="item.name" :value="item.name">
                            <div class="tag-option">
                                <span>{{ item.name }}</span>
                                <span v-if="item.use_count > 0" class="tag-count">{{ item.use_count }}</span>
                            </div>
                        </el-option>
                    </el-select>
                </el-form-item>
            </el-form>

            <div class="footer-bar">
                <div class="footer-amount">
                    <span class="footer-amount-value" :class="Number(formdata.direction) === 2 ? 'is-expense' : 'is-income'">{{ displayAmount }}</span>
                </div>
                <div class="footer-actions">
                    <el-space>
                        <el-button style="width: 120px" @click="onCloseDialog">取消</el-button>
                        <el-button style="width: 120px" type="success" @click="onSubmit(1)">连续添加</el-button>
                        <el-button style="width: 120px" type="primary" @click="onSubmit(0)">添加后关闭</el-button>
                    </el-space>
                </div>
            </div>
        </div>
    </el-dialog>
</template>

<script>
import { Plus, CirclePlus, Remove, DocumentCopy } from "@element-plus/icons-vue";
import TreeCategorySelect from "./TreeCategorySelect.vue";
import { AddTransactions } from "../../api/basic.js";
import { msg } from "../../utils/message.ts";
import tagSelectMixin from "./tagSelectMixin.js";
import {
    AMOUNT_FORM_RULE,
    OCC_TIME_FORM_RULE,
    CATEGORY_FORM_RULE,
    displaySignedAmount,
    buildTagsForSubmit,
    formatDetailRows,
    sumDetailRows,
    calcRowTotal,
    emptyDetailRow,
    validateDetailRows,
    copyText,
    serializeDetailRows,
    insertSeparator,
    nowOccTime,
} from "./utils.js";

export default {
    name: "AddTransactionsIndex",
    components: { TreeCategorySelect },
    mixins: [tagSelectMixin],
    props: {
        vdata: { type: Object, default: () => ({}) },
    },
    setup() {
        return { Plus, CirclePlus, Remove, DocumentCopy };
    },
    data() {
        return {
            dialogVisible: false,
            formdata: { direction: "2", occ_time: "", amount: "", remark: "", category: null, tags: [] },
            detailRows: [],
            formRules: {
                occ_time: OCC_TIME_FORM_RULE,
                amount: AMOUNT_FORM_RULE,
                category: CATEGORY_FORM_RULE,
            },
        };
    },
    computed: {
        totalAmount() {
            return sumDetailRows(this.detailRows);
        },
        displayAmount() {
            return displaySignedAmount(this.formdata.amount, this.formdata.direction);
        },
    },
    methods: {
        onOpenDialog() {
            this.formdata.amount = "";
            this.formdata.remark = "";
            this.formdata.category = null;
            this.formdata.tags = [];
            this.formdata.direction = "2";
            this.detailRows = [];
            this.resetTagState();
            this.onSetNowTime();
            this.dialogVisible = true;
            this.$nextTick(() => this.$refs["form"]?.resetFields());
        },
        onCloseDialog() {
            this.dialogVisible = false;
        },
        async validateForm() {
            const mainFormValid = await new Promise((resolve) => {
                this.$refs["form"].validate((valid) => resolve(valid));
            });
            if (mainFormValid && !this.formdata.category) {
                msg.error("请选择类别");
                return false;
            }
            const detailErr = validateDetailRows(this.detailRows);
            if (detailErr) {
                msg.warning(detailErr);
                return false;
            }
            return mainFormValid;
        },
        async onSubmit(val) {
            const valid = await this.validateForm();
            if (!valid) return;

            const cid = this.formdata.category;
            if (!cid) {
                msg.error("请选择有效的分类");
                return;
            }

            let amount = Number(this.formdata.amount);
            if (this.formdata.direction === "2") amount = amount * -1;

            const tags = buildTagsForSubmit(this.formdata.tags);
            const data = { cid, occ_time: this.formdata.occ_time, amount, remark: this.formdata.remark };

            if (this.detailRows.length > 0) data.detail = formatDetailRows(this.detailRows);
            if (tags.length > 0) data.tags = tags;

            AddTransactions(data)
                .then(() => {
                    msg.success("添加成功");
                    this.$globalBus.emit("onRefresh");
                    if (val === 1) {
                        this.formdata.amount = "";
                        this.formdata.remark = "";
                        this.formdata.category = null;
                        this.formdata.tags = [];
                        this.formdata.direction = "2";
                        this.detailRows = [];
                        this.onSetNowTime();
                    } else {
                        this.dialogVisible = false;
                        this.detailRows = [];
                    }
                })
                .catch((err) => {
                    const errMsg = err?.data?.metadata?.message || "未知错误";
                    msg.error("添加失败 " + errMsg);
                });
        },
        onSetNowTime() {
            this.formdata.occ_time = nowOccTime();
        },
        addDetailRow() {
            this.detailRows.push(emptyDetailRow());
        },
        removeDetailRow(index) {
            this.detailRows.splice(index, 1);
        },
        calculateTotal(index) {
            if (this.detailRows[index]) calcRowTotal(this.detailRows[index]);
        },
        copyDetailsJson() {
            copyText(serializeDetailRows(this.detailRows), msg.success, msg.error);
        },
        appendSeparator() {
            const input = this.$refs.remarkInput?.$el?.querySelector("input");
            const { value, caret } = insertSeparator(this.formdata.remark, input);
            this.formdata.remark = value;
            this.$nextTick(() => {
                if (input) {
                    input.focus();
                    input.setSelectionRange(caret, caret);
                }
            });
        },
    },
};
</script>

<style scoped lang="less">
.flex {
    display: flex;
    align-items: center;
}
.copy-btn {
    color: #909399;
}
.copy-btn:hover {
    color: #606266;
}
.tag-option {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.tag-count {
    color: #909399;
    font-size: 12px;
    margin-left: 8px;
}
:deep(.narrow-tag-popper) {
    width: 220px !important;
    min-width: 220px !important;
}
.detail-list {
    width: 100%;
}
.detail-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    margin-bottom: 8px;
}
.col-name {
    flex: 4 1 0;
    min-width: 0;
}
.col-qty {
    flex: 2 1 0;
    min-width: 0;
}
.col-unit {
    flex: 2 1 0;
    min-width: 0;
}
.col-price {
    flex: 2 1 0;
    min-width: 0;
}
.col-total {
    flex: 3 1 0;
    min-width: 0;
}
.col-actions {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 4px;
}
.detail-total {
    font-weight: bold;
    color: #1890ff;
    border-top: 1px solid #e8e8e8;
}

.footer-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #ebeef5;
}
.footer-amount {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-left: 70px;
}
.footer-amount-value {
    font-size: 26px;
    font-weight: 700;
    letter-spacing: 0.5px;
    line-height: 1;
    transition: color 0.2s;
}
.footer-amount-value.is-expense {
    color: var(--color-expense);
}
.footer-amount-value.is-income {
    color: var(--color-income);
}
.footer-actions {
    display: flex;
    align-items: center;
}
</style>
