import { create } from "zustand";

// 移动端剪贴板列表抽屉开关。桌面端 ClipboardList 是静态左栏，此状态无影响。
type ListDrawerStore = {
  open: boolean;
  toggle: () => void;
  openDrawer: () => void;
  close: () => void;
};

export const useListDrawer = create<ListDrawerStore>((set) => ({
  open: false,
  toggle: () => set((s) => ({ open: !s.open })),
  openDrawer: () => set({ open: true }),
  close: () => set({ open: false }),
}));
