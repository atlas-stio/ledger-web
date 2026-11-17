<script setup>
import zhCn from "element-plus/es/locale/lang/zh-cn";
</script>

<template>
    <el-config-provider :locale="zhCn">
        <div>
            <router-view />
        </div>
    </el-config-provider>
</template>
