import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://nest-back-hfgh.onrender.com';

// Public API slice (no auth)
export const publicApi = createApi({
  reducerPath: 'publicApi',
  baseQuery: fetchBaseQuery({ baseUrl }),
  endpoints: (builder) => ({
    login: builder.mutation<any, { email: string; password: string }>({
      query: (body) => ({
        url: '/v1/auth/login',
        method: 'POST',
        body,
      }),
    }),
    register: builder.mutation<any, { email: string; password: string; companyName: string }>({
      query: (body) => ({
        url: '/v1/auth/register',
        method: 'POST',
        body,
      }),
    }),
    getCompanies: builder.query<any[], void>({
      query: () => '/v1/companies',
    }),
  }),
});

// Protected API slice (with auth)
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Product', 'Report', 'Bill', 'Salesman', 'Buyer'],
  endpoints: (builder) => ({
    getProducts: builder.query<Product[], void>({
      query: () => '/v1/products',
      providesTags: ['Product'],
    }),
    getReportByDate: builder.query<Report, string>({
      query: (date) => `/v1/reports/date/${date}`,
      providesTags: (result, error, date) => [{ type: 'Report', id: date }],
    }),
    generateReport: builder.mutation<Report, { date: string }>({
      query: ({ date }) => ({
        url: '/v1/reports/generate',
        method: 'POST',
        body: { date },
      }),
      invalidatesTags: (result, error, { date }) => [{ type: 'Report', id: date }],
    }),
    getBills: builder.query<Bill[], void>({
      query: () => '/v1/bills',
      providesTags: ['Bill'],
    }),
    getSalesmen: builder.query<Salesman[], void>({
      query: () => '/v1/salesmen',
      providesTags: ['Salesman'],
    }),
    getBuyers: builder.query<Buyer[], void>({
      query: () => '/v1/buyers',
      providesTags: ['Buyer'],
    }),
    getDailySalesReport: builder.query<any, { companyId: string; date: string }>({
      query: ({ companyId, date }) => `/v1/bills/daily-sales-report?companyId=${companyId}&date=${date}`,
    }),
    getSalesmanCommissionReport: builder.query<any, { companyId: string; date: string }>({
      query: ({ companyId, date }) => `/v1/bills/salesman-commission-report?companyId=${companyId}&date=${date}`,
    }),
    // Add more protected endpoints as needed...
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetCompaniesQuery,
} = publicApi;

export const {
  useGetProductsQuery,
  useGetReportByDateQuery,
  useGenerateReportMutation,
  useGetBillsQuery,
  useGetSalesmenQuery,
  useGetBuyersQuery,
  useGetDailySalesReportQuery,
  useGetSalesmanCommissionReportQuery,
} = api; 