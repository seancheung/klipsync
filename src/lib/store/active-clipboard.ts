import { create } from "zustand";

// 当前打开的剪贴板 id。Workbench 从草稿态切到已保存态时，
// URL 用 history.replaceState 静默更新不会触发 Next.js 导航，
// 所以列表高亮单靠 prop / usePathname 就会过期；由这里托管。
type ActiveClipboardStore = {
  id: string | null;
  setId: (id: string | null) => void;
};

export const useActiveClipboard = create<ActiveClipboardStore>((set) => ({
  id: null,
  setId: (id) => set({ id }),
}));
