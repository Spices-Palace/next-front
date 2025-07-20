import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Bill } from '../types';

export interface BillPayment {
  method: string;
  amount: number;
}

export interface BillItem {
  productId: string;
  productName: string;
  priceIncrease?: number;
  quantity: number;
}

export interface Bill {
  id: string;
  billNo: string;
  date: string;
  salesmanName: string;
  items: BillItem[];
  discountAmount: number;
  finalTotal: number;
  payments: BillPayment[];
}

interface BillsState {
  items: Bill[];
  loading: boolean;
  error: string | null;
}

const initialState: BillsState = {
  items: [],
  loading: false,
  error: null,
};

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const BILLS_API_URL = BASE_URL + '/v1/bills/by-company-date';

export const fetchBills = createAsyncThunk<Bill[], { date: string; companyId: string }, { rejectValue: string }>(
  'bills/fetchBills',
  async ({ date, companyId }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${BILLS_API_URL}?companyId=${companyId}&date=${date}`);
      if (!res.ok) throw new Error('Failed to fetch bills');
      return await res.json();
    } catch (err: unknown) {
      if (err instanceof Error) {
        return rejectWithValue(err.message || 'Unknown error');
      }
      return rejectWithValue('Unknown error');
    }
  }
);

const billsSlice = createSlice({
  name: 'bills',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchBills.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBills.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchBills.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch bills';
      });
  },
});

export default billsSlice.reducer; 