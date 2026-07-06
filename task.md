# Sprint 8A: Dashboard Intelligence Foundation Checklist

- [x] Create types for the dashboard (`src/types/dashboard.ts`)
- [x] Add real-time `onSnapshot` subscriptions to the 5 services:
  - [x] `plannerService.ts`
  - [x] `reminderService.ts`
  - [x] `financeService.ts`
  - [x] `travelService.ts`
  - [x] `wellnessService.ts`
- [x] Create `dashboardEngine.ts` inside `src/services`
- [x] Update `DashboardGreeting.jsx` to render the smart dynamic greeting
- [x] Modify `TopNavbar.jsx` and `AppLayout.jsx` to pass the greeting prop
- [x] Update `RightWidgetColumn.jsx` to take aggregated data as props
- [x] Integrate subscriptions in `Dashboard.jsx` and pass live data down
- [/] Verify compilation and test changes
