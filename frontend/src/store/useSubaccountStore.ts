import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Subaccount {
  id: string;
  friendlyName: string;
  twilioSid: string;
  isActive: boolean;
  createdAt: string;
}

interface SubaccountState {
  subaccounts: Subaccount[];
  activeSubaccountId: string | null;
  setSubaccounts: (subaccounts: Subaccount[]) => void;
  setActiveSubaccount: (id: string) => void;
  addSubaccount: (subaccount: Subaccount) => void;
  removeSubaccount: (id: string) => void;
  getActiveSubaccount: () => Subaccount | null;
}

export const useSubaccountStore = create<SubaccountState>()(
  persist(
    (set, get) => ({
      subaccounts: [],
      activeSubaccountId: null,
      setSubaccounts: (subaccounts) => set({ subaccounts }),
      setActiveSubaccount: (id) => set({ activeSubaccountId: id }),
      addSubaccount: (subaccount) =>
        set((state) => ({
          subaccounts: [...state.subaccounts, subaccount],
        })),
      removeSubaccount: (id) =>
        set((state) => ({
          subaccounts: state.subaccounts.filter((s) => s.id !== id),
          activeSubaccountId:
            state.activeSubaccountId === id ? null : state.activeSubaccountId,
        })),
      getActiveSubaccount: () => {
        const state = get();
        return (
          state.subaccounts.find((s) => s.id === state.activeSubaccountId) || null
        );
      },
    }),
    {
      name: 'subaccount-storage',
    }
  )
);
