// tagSelectMixin.js
import { GetHotTags, SearchTags } from "../../api/basic.js";

export default {
    data() {
        return {
            tagOptions: [],
            tagLoading: false,
            tagSearchTimer: null,
            tagCurrentKeyword: "",
        };
    },
    beforeUnmount() {
        clearTimeout(this.tagSearchTimer);
    },
    methods: {
        onTagDropdown(visible) {
            if (!visible) return;
            if (this.tagCurrentKeyword) {
                this.onTagSearch(this.tagCurrentKeyword);
            } else {
                this.loadHotTags();
            }
        },
        onTagSearch(keyword) {
            clearTimeout(this.tagSearchTimer);
            const kw = (keyword || "").trim();
            this.tagCurrentKeyword = kw;

            if (!kw) {
                this.loadHotTags();
                return;
            }

            this.tagSearchTimer = setTimeout(async () => {
                this.tagLoading = true;
                try {
                    const res = await SearchTags({ keyword: kw, limit: 20 });
                    const list = res?.payload?.list || res?.data?.payload?.list || [];
                    this.tagOptions = list;
                } catch (e) {
                    console.error("search tags failed", e);
                } finally {
                    this.tagLoading = false;
                }
            }, 300);
        },
        async loadHotTags() {
            this.tagLoading = true;
            try {
                const res = await GetHotTags({ limit: 30 });
                const list = res?.payload?.list || res?.data?.payload?.list || [];
                this.tagOptions = list;
            } catch (e) {
                console.error("load hot tags failed", e);
            } finally {
                this.tagLoading = false;
            }
        },
        resetTagState() {
            this.tagOptions = [];
            this.tagCurrentKeyword = "";
            clearTimeout(this.tagSearchTimer);
        },
    },
};
