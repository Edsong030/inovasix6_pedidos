export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
export { demoStore } from './store'
export {
  DEMO_USER, DEMO_CREDENTIALS,
  DEMO_CATEGORIES, DEMO_PRODUCTS, DEMO_TABLES, DEMO_ORDERS,
  buildDemoDashboard, buildDemoSalesReport, getDemoHistoryOrders, getDemoDataset, toLocalYMD,
} from './data'
export { getDemoBusinessType, saveDemoBusinessType } from './businessType'
export { getDemoSettings, saveDemoSettings, clearDemoSettings, demoDefaultSettings } from './settings'
