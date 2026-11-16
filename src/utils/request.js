/**
 * 基于 axios 封装的请求模块
 */
import axios from "axios";
import { toLoginPage } from "./common.js";
import { ElMessage } from "element-plus";
import { resolveEcodeMessage } from "./ecode.js";

function paramsSerializer(params) {
    const sp = new URLSearchParams();
    for (const key in params) {
        if (Object.prototype.hasOwnProperty.call(params, key)) {
            const val = params[key];
            if (Array.isArray(val)) {
                for (const item of val) {
                    sp.append(key, item);
                }
            } else if (val != null) {
                sp.append(key, val);
            }
        }
    }
    return sp.toString();
}

const request = axios.create({
    paramsSerializer: {
        serialize: paramsSerializer,
    },
});

request.interceptors.request.use(
    function (config) {
        if (config.method === "get") {
            config.data = true;
        }
        config.headers = {
            "Content-Type": "application/json;charset=utf-8",
        };
        return config;
    },
    function (error) {
        return Promise.reject(error);
    },
);

// 响应拦截器
request.interceptors.response.use(
    function (response) {
        return response;
    },

    function (error) {
        const { response } = error;
        const status = response?.status;
        const resData = response?.data;
        const meta = resData?.metadata;

        if (status === 401) {
            toLoginPage();
            return Promise.reject(error.response);
        }

        if (meta) {
            const msg = resolveEcodeMessage(meta);
            const err = new Error(msg);
            err.ecode = meta.ecode;
            err.meta = meta;
            return Promise.reject(err);
        }

        if (status === 403) {
            ElMessage.warning({ message: "没有操作权限", plain: true, grouping: true });
            return Promise.reject(error.response);
        } else if (status >= 500) {
            ElMessage.error({ message: "服务端内部异常，请稍后重试", plain: true, grouping: true });
            return Promise.reject(error.response);
        }
        return Promise.reject(error.response);
    },
);

// 导出请求方法
export default request;
