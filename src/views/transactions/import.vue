<template>
    <el-dialog title="导入记账" v-model="dialogVisible" :close-on-click-modal="false" width="720px" draggable @closed="onClosed">
        <!-- Upload: shown only when no data loaded yet -->
        <el-upload
            v-if="!parsedData.length"
            ref="uploadRef"
            drag
            action="#"
            :auto-upload="false"
            :show-file-list="false"
            accept=".csv"
            :on-change="handleFileChange">
            <el-icon class="el-icon--upload"><upload-filled /></el-icon>
            <div class="el-upload__text">拖拽 CSV 文件到此处，或 <em>点击选择</em></div>
            <template #tip>
                <div class="el-upload__tip">
                    仅支持 .csv 格式，第一行作为字段名（表头）<br />
                    必需列：<b>cid, occ_time, amount, remark</b>；可选列：<b>detail</b>（JSON 字符串）
                </div>
            </template>
        </el-upload>

        <!-- Download template -->
        <div v-if="!parsedData.length" class="template-row">
            <el-button type="primary" link @click="downloadTemplate">
                <el-icon><Download /></el-icon>
                下载模板
            </el-button>
        </div>

        <!-- Error alert -->
        <el-alert v-if="errorMsg" :title="errorMsg" type="error" show-icon :closable="false" class="mt-12" />

        <!-- Submitting alert -->
        <el-alert
            v-if="submitting"
            title="导入进行中，请勿刷新页面或关闭窗口，否则可能导致数据不完整"
            type="warning"
            show-icon
            :closable="false"
            class="mt-12" />

        <!-- File info + data preview -->
        <div v-if="parsedData.length > 0" class="preview-area">
            <div class="file-header">
                <el-descriptions :column="2" border size="small" style="flex: 1">
                    <el-descriptions-item label="文件名">{{ fileName }}</el-descriptions-item>
                    <el-descriptions-item label="数据行数">{{ parsedData.length }}</el-descriptions-item>
                </el-descriptions>
                <el-button class="reselect-btn" @click="onReselect" :disabled="submitting">重新选择文件</el-button>
            </div>

            <el-table :data="parsedData" height="260" border size="small" class="mt-12">
                <el-table-column
                    v-for="col in columns"
                    :key="col.prop"
                    :prop="col.prop"
                    :label="col.label"
                    :width="col.width"
                    :min-width="col.minWidth"
                    show-overflow-tooltip />
            </el-table>

            <!-- Progress -->
            <div v-if="submitting || progress.total > 0" class="progress-box mt-12">
                <div class="progress-text">
                    进度：{{ progress.done }} / {{ progress.total }}
                    <span class="ok">成功 {{ progress.success }}</span>
                    <span class="fail" v-if="progress.fail">失败 {{ progress.fail }}</span>
                    <span class="elapsed" v-if="elapsedText">耗时 {{ elapsedText }}</span>
                </div>
                <el-progress
                    :percentage="progress.total ? Math.round((progress.done / progress.total) * 100) : 0"
                    :status="progress.fail > 0 ? 'warning' : undefined" />
            </div>
        </div>

        <template #footer>
            <el-button style="min-width: 120px" @click="onCloseDialog" :disabled="submitting">取 消</el-button>
            <el-button style="min-width: 120px" type="primary" :loading="submitting" :disabled="parsedData.length === 0" @click="onSubmit">
                {{ submitting ? `导入中 (${progress.done}/${progress.total})` : `导入（${parsedData.length} 条）` }}
            </el-button>
        </template>
    </el-dialog>
</template>

<script>
import dayjs from "dayjs";
import { Download, UploadFilled } from "@element-plus/icons-vue";
import { AddTransactions } from "../../api/basic.js";
import { msg } from "../../utils/message.ts";

const MAX_CONCURRENCY = 10;
const LEAVE_TIP = "导入正在进行中，离开页面可能导致数据不完整，确定要离开吗？";
const TEMPLATE_ROWS = [
    ["cid", "occ_time", "amount", "remark"],
    ["1002", "2025-09-24 20:15:42", "-333.12", "示例备注（支出金额为负数）（cid为分类id，在分类管理中查询）"],
    ["5006", "2025-09-24 20:15:42", "100", "示例备注（收入金额为正数）"],
];
const TABLE_COLUMNS = [
    { prop: "cid", label: "cid", width: 100 },
    { prop: "occ_time", label: "occ_time", minWidth: 170 },
    { prop: "amount", label: "amount", width: 140 },
    { prop: "remark", label: "remark", minWidth: 140 },
];

const emptyProgress = () => ({ total: 0, done: 0, success: 0, fail: 0 });

const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    const sec = ms / 1000;
    if (sec < 60) return `${sec.toFixed(1)}s`;
    return `${Math.floor(sec / 60)}m${(sec % 60).toFixed(0).padStart(2, "0")}s`;
};

export default {
    name: "ImportBillIndex",
    components: { UploadFilled, Download },
    data() {
        return {
            dialogVisible: false,
            fileName: "",
            parsedData: [],
            errorMsg: "",
            submitting: false,
            progress: emptyProgress(),
            columns: TABLE_COLUMNS,
            elapsedText: "",
        };
    },
    beforeUnmount() {
        this.removeBeforeUnload();
    },
    methods: {
        onOpenDialog() {
            this.resetAll();
            this.dialogVisible = true;
        },

        downloadTemplate() {
            const csv = TEMPLATE_ROWS.map((r) =>
                r
                    .map((cell) => {
                        const s = String(cell ?? "");
                        return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                    })
                    .join(","),
            ).join("\r\n");

            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "导入记账模板.csv";
            a.click();
            URL.revokeObjectURL(url);
        },

        // Close dialog: blocked while submitting
        onCloseDialog() {
            if (this.submitting) {
                msg.warning("导入进行中，请等待完成后再关闭");
                return;
            }
            this.dialogVisible = false;
        },

        onClosed() {
            this.resetAll();
        },

        // Reset parsed state (file, preview, error, progress, elapsed)
        resetParsed() {
            this.fileName = "";
            this.parsedData = [];
            this.errorMsg = "";
            this.elapsedText = "";
            this.progress = emptyProgress();
        },

        // Full reset: used on close / reselect
        resetAll() {
            this.resetParsed();
            this.submitting = false;
            this.$refs.uploadRef?.clearFiles();
            this.removeBeforeUnload();
        },

        // beforeunload guard
        handleBeforeUnload(e) {
            e.preventDefault();
            e.returnValue = LEAVE_TIP;
            return LEAVE_TIP;
        },
        addBeforeUnload() {
            window.addEventListener("beforeunload", this.handleBeforeUnload);
        },
        removeBeforeUnload() {
            window.removeEventListener("beforeunload", this.handleBeforeUnload);
        },

        onReselect() {
            if (this.submitting) return;
            this.resetAll();
            this.$nextTick(() => {
                const input = this.$refs.uploadRef?.$el?.querySelector('input[type="file"]');
                input?.click();
            });
        },

        handleFileChange(uploadFile) {
            const rawFile = uploadFile.raw;
            if (!rawFile) return;

            this.resetParsed();

            if (!/\.csv$/i.test(rawFile.name)) {
                this.errorMsg = "请选择有效的 .csv 文件";
                return;
            }

            this.fileName = rawFile.name;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = String(e.target.result).replace(/^\uFEFF/, "");
                    this.parsedData = this.parseCSV(text);
                } catch (err) {
                    console.error(err);
                    this.errorMsg = `解析失败：${err.message || "未知错误"}`;
                }
            };
            reader.onerror = () => {
                this.errorMsg = "读取文件失败，请重试";
            };
            reader.readAsText(rawFile, "UTF-8");
        },

        // Parse CSV (supports quotes, commas, newlines)
        parseCSV(text) {
            const rows = [];
            let row = [];
            let field = "";
            let inQuotes = false;

            for (let i = 0; i < text.length; i++) {
                const c = text[i];
                const next = text[i + 1];

                if (inQuotes) {
                    if (c === '"') {
                        if (next === '"') {
                            field += '"';
                            i++;
                        } else {
                            inQuotes = false;
                        }
                    } else {
                        field += c;
                    }
                } else if (c === '"') {
                    inQuotes = true;
                } else if (c === ",") {
                    row.push(field);
                    field = "";
                } else if (c === "\n" || c === "\r") {
                    row.push(field);
                    rows.push(row);
                    row = [];
                    field = "";
                    if (c === "\r" && next === "\n") i++;
                } else {
                    field += c;
                }
            }
            if (field !== "" || row.length) {
                row.push(field);
                rows.push(row);
            }

            const nonEmpty = rows.filter((r) => r.some((v) => String(v).trim() !== ""));
            if (nonEmpty.length < 2) throw new Error("CSV 至少需要表头和一行数据");

            const headers = nonEmpty[0].map((h) => String(h).trim());
            return nonEmpty.slice(1).map((r) => {
                const obj = {};
                headers.forEach((h, idx) => {
                    obj[h] = r[idx] !== undefined ? String(r[idx]).trim() : "";
                });
                return obj;
            });
        },

        // Normalize occ_time to `YYYY-MM-DDTHH:mm:ss+0800`
        formatOccTime(input) {
            const str = String(input ?? "").trim();
            if (!str) return "";
            // Already in target format
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+0800$/.test(str)) return str;

            // Normalize Chinese/slash separators so dayjs can parse
            const normalized = str.replace(/年|月/g, "-").replace(/日/g, "").replace(/\//g, "-");
            const d = dayjs(normalized);
            if (!d.isValid()) return str;
            return d.format("YYYY-MM-DDTHH:mm:ss+0800");
        },

        // Build one transaction payload from a CSV row
        buildTransaction(row) {
            const tx = {
                cid: row.cid !== "" ? Number(row.cid) : undefined,
                occ_time: this.formatOccTime(row.occ_time),
                amount: row.amount !== "" ? Number(row.amount) : undefined,
                total: Number(row.total) || 1,
                remark: row.remark || "",
            };

            const rawDetail = row.detail;
            if (rawDetail && String(rawDetail).trim() !== "") {
                try {
                    const detail = typeof rawDetail === "string" ? JSON.parse(rawDetail) : rawDetail;
                    if (Array.isArray(detail) && detail.length) {
                        tx.detail = detail.map((d) => ({
                            quantity: Number(d.quantity) || 0,
                            price: Number(d.price) || 0,
                            total: Number(d.total) || 0,
                            unit: d.unit || "",
                        }));
                    }
                } catch (e) {
                    console.warn("detail 解析失败，已忽略：", rawDetail, e);
                }
            }

            Object.keys(tx).forEach((k) => tx[k] === undefined && delete tx[k]);
            return tx;
        },

        // Submit with a concurrency pool (max MAX_CONCURRENCY in flight)
        async onSubmit() {
            if (!this.parsedData.length) return;

            // 1. Build & validate
            const transactions = [];
            for (let i = 0; i < this.parsedData.length; i++) {
                const tx = this.buildTransaction(this.parsedData[i]);
                const rowNo = i + 2;
                let err = "";
                if (isNaN(tx.cid)) err = `第 ${rowNo} 行 cid 无效`;
                else if (!tx.occ_time) err = `第 ${rowNo} 行 occ_time 无效`;
                else if (isNaN(tx.amount)) err = `第 ${rowNo} 行 amount 无效`;

                if (err) {
                    this.errorMsg = err;
                    msg.error(err);
                    return;
                }
                transactions.push(tx);
            }

            // 2. Init progress + guard
            const total = transactions.length;
            const concurrency = Math.min(MAX_CONCURRENCY, total);
            const startTime = performance.now();

            this.errorMsg = "";
            this.submitting = true;
            this.elapsedText = "";
            this.progress = { total, done: 0, success: 0, fail: 0 };
            this.addBeforeUnload();

            const failMessages = [];
            let cursor = 0;
            let done = 0;
            let success = 0;
            let fail = 0;

            // 3. Worker loop
            const worker = async () => {
                while (cursor < total) {
                    const i = cursor++;
                    const rowNo = i + 2;
                    try {
                        const res = await AddTransactions(transactions[i]);
                        if (res && res.code !== undefined && res.code !== 0 && res.code !== 200) {
                            throw new Error(res.msg || res.message || "导入失败");
                        }
                        success++;
                    } catch (err) {
                        fail++;
                        failMessages.push(`第 ${rowNo} 行：${err.message || "导入失败"}`);
                    } finally {
                        done++;
                        if (done % 5 === 0 || done === total) {
                            this.progress = { total, done, success, fail };
                        }
                    }
                }
            };

            // 4. Run workers
            try {
                await Promise.all(Array.from({ length: concurrency }, () => worker()));
            } finally {
                this.removeBeforeUnload();
            }

            // 5. Finalize
            this.elapsedText = formatDuration(Math.round(performance.now() - startTime));
            this.progress = { total, done, success, fail };
            this.submitting = false;

            // 6. Summary
            if (fail === 0) {
                msg.success(`导入成功，共 ${success} 条，耗时 ${this.elapsedText}`);
                this.dialogVisible = false;
            } else {
                msg.warning(`成功 ${success} 条，失败 ${fail} 条，耗时 ${this.elapsedText}`);
                this.errorMsg = failMessages.slice(0, 8).join("；") + (failMessages.length > 8 ? ` ... 等 ${failMessages.length} 条失败` : "");
            }
        },
    },
};
</script>

<style scoped>
.mt-12 {
    margin-top: 12px;
}
.template-row {
    text-align: center;
    margin-top: 8px;
}
.preview-area {
    margin-top: 8px;
}
.file-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
}
.file-header :deep(.el-descriptions) {
    flex: 1;
}
.reselect-btn {
    flex-shrink: 0;
    height: 32px;
}
.progress-box {
    background: #f8fafc;
    border-radius: 8px;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
}
.progress-text {
    font-size: 13px;
    color: #334155;
    margin-bottom: 6px;
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    align-items: center;
}
.progress-text .ok {
    color: #16a34a;
}
.progress-text .fail {
    color: #dc2626;
}
.progress-text .elapsed {
    color: #3b82f6;
    margin-left: auto;
    font-weight: 500;
}
</style>
