import { createRouter, createWebHashHistory } from "vue-router";
import { isMobile } from "../utils/device";

const NotFound = () => import("../views/404/index.vue");
const Overview = () => import("../views/overview/index.vue");
const Home = () => import("../views/home/index.vue");
const Layout = () => import("../views/layout/index.vue");
const Transactions = () => import("../views/transactions/index.vue");
const Category = () => import("../views/category/index.vue");

// 移动端
const MobileLayout = () => import("../mobile/layout/index.vue");
const MobileHome = () => import("../mobile/home/index.vue");
const MobileBill = () => import("../mobile/bill/index.vue");
const MobileBillDetails = () => import("../mobile/bill/details.vue");
const MobileReport = () => import("../mobile/report/index.vue");
const MobileSetting = () => import("../mobile/setting/index.vue");
const Mobilecategory = () => import("../mobile/setting/category.vue");

// 判断当前设备
const isMobileDevice = isMobile();

// 根据设备生成完全隔离的子路由，避免路径冲突
const generateChildren = () => {
    if (isMobileDevice) {
        // 移动端路由树
        return [
            {
                meta: { title: "首页" },
                path: "/",
                name: "home",
                component: MobileHome,
                children: [
                    { meta: {}, path: "/transactions", name: "MobileBill", component: MobileBill },
                    { meta: {}, path: "/overview", name: "MobileReport", component: MobileReport },
                    { meta: {}, path: "/setting", name: "MobileSetting", component: MobileSetting },
                    { meta: {}, path: "/setting/category", name: "Mobilecategory", component: Mobilecategory },
                ],
            },
        ];
    }
    // 电脑端路由树
    return [
        { meta: { title: "首页" }, path: "/", name: "home", component: Home },
        { meta: { title: "数据总览" }, path: "/overview", name: "overview", component: Overview },
        { meta: { title: "记账管理" }, path: "/transactions", name: "transactions", component: Transactions },
        { meta: { title: "分类管理" }, path: "/category", name: "category", component: Category },
    ];
};

const routes = [
    {
        path: "/",
        component: isMobileDevice ? MobileLayout : Layout,
        children: generateChildren(),
    },
    { meta: {}, path: "/bill/:id", name: "MobileBillDetails", component: MobileBillDetails },
    { meta: { title: "404 页面未找到" }, path: "/:pathMatch(.*)*", component: NotFound },
];

const router = createRouter({
    history: createWebHashHistory("/ledger/"),
    routes,
});

router.beforeEach((to, from, next) => {
    if (to.meta && to.meta.title) {
        document.title = to.meta.title;
    }

    // 根路径设备重定向
    if (to.path === "/") {
        if (isMobileDevice) {
            next("/transactions"); // 手机端默认去记账页
        } else {
            next("/overview"); // 电脑端默认去数据总览
        }
        return;
    }

    next();
});

export default router;
