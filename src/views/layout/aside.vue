<template>
    <div>
        <div>
            <el-aside class="aside" style="width: auto">
                <p style="text-align: center">记账薄</p>
                <el-menu :default-active="activePath" unique-opened>
                    <el-menu-item index="/overview" @click="OnSwitchRoutes('/overview')">
                        <el-icon><DataLine /></el-icon>
                        <template #title><span>数据总览</span></template>
                    </el-menu-item>
                    <el-menu-item index="/calendar" @click="OnSwitchRoutes('/calendar')">
                        <el-icon><Calendar /></el-icon>
                        <template #title><span>日历视图</span></template>
                    </el-menu-item>
                    <el-menu-item index="/transactions" @click="OnSwitchRoutes('/transactions')">
                        <el-icon><Tickets /></el-icon>
                        <template #title><span>记账管理</span></template>
                    </el-menu-item>
                    <el-menu-item index="/details" @click="OnSwitchRoutes('/details')">
                        <el-icon><Search /></el-icon>
                        <template #title><span>明细查询</span></template>
                    </el-menu-item>
                    <el-menu-item index="/category" @click="OnSwitchRoutes('/category')">
                        <el-icon><PriceTag /></el-icon>
                        <template #title><span>分类管理</span></template>
                    </el-menu-item>
                </el-menu>
            </el-aside>
        </div>
    </div>
</template>

<script>
export default {
    name: "AppAside",
    props: {},
    computed: {
        activePath() {
            return this.$route.meta.am || this.$route.path;
        },
    },
    methods: {
        OnSwitchRoutes(path) {
            this.$router.push({ path });
        },
    },
};
</script>

<style scoped>
.el-aside {
    background-color: #ffffff;
    .el-menu {
        border-right: none;
    }
}
</style>
