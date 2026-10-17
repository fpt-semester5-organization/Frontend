import React, { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/app/AppShell';
import { NotFoundPage } from '@/app/NotFoundPage';
import { MainLayout } from '@/layouts/MainLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { RequireAuth, GuestOnly, RequireAdmin } from '@/routes/guards';
import { PATHS } from '@/routes/paths';

import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { VerifyOtpPage } from '@/features/auth/pages/VerifyOtpPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { ChangePasswordPage } from '@/features/auth/pages/ChangePasswordPage';

// Tải trang theo route (code splitting); Suspense nằm trong MainLayout.
const HomePage = lazy(() => import('@/features/home/pages/HomePage'));
const RecipeList = lazy(() => import('@/features/recipes/pages/RecipeList'));
const RecipeDetail = lazy(() => import('@/features/recipes/pages/RecipeDetail'));
const RecipeEditor = lazy(() => import('@/features/recipes/pages/RecipeEditor'));
const MyRecipes = lazy(() => import('@/features/recipes/pages/MyRecipes'));
const PostFeed = lazy(() => import('@/features/community/pages/PostFeed'));
const VideoPlayer = lazy(() => import('@/features/videos/pages/VideoPlayer'));
const PostDetail = lazy(() => import('@/features/community/pages/PostDetail'));
const BarcodeScan = lazy(() => import('@/features/scanner/pages/BarcodeScan'));
const ScanHistory = lazy(() => import('@/features/scanner/pages/ScanHistory'));
const PostEditor = lazy(() => import('@/features/community/pages/PostEditor'));
const VenueMap = lazy(() => import('@/features/venues/pages/VenueMap'));
const MyPosts = lazy(() => import('@/features/community/pages/MyPosts'));
const MealPlanList = lazy(() => import('@/features/meal-plans/pages/MealPlanList'));
const MealPlanGenerate = lazy(() => import('@/features/meal-plans/pages/MealPlanGenerate'));
const MealPlanDetail = lazy(() => import('@/features/meal-plans/pages/MealPlanDetail'));
const ShoppingList = lazy(() => import('@/features/shopping-lists/pages/ShoppingList'));
const ChatPage = lazy(() => import('@/features/chat/pages/ChatPage'));
const FridgePage = lazy(() => import('@/features/fridge/pages/FridgePage'));

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        element: <MainLayout />,
        children: [
          // Bản đồ quán chay (SCR-18)
          { path: PATHS.VENUES.ROOT, element: <VenueMap /> },

          // Trang chủ (SCR-10)
          { path: PATHS.HOME, element: <HomePage /> },

          // Công thức (SCR-11 → SCR-14). Trang soạn mở cho cả Khách, guard theo từng nút (SCR-13);
          // trang sửa và Công thức của tôi tự mời đăng nhập. key riêng để đổi qua lại giữa soạn mới và sửa không giữ state cũ.
          { path: PATHS.RECIPES.ROOT, element: <RecipeList /> },
          { path: PATHS.RECIPES.NEW, element: <RecipeEditor key="new" /> },
          { path: PATHS.RECIPES.EDIT(':id'), element: <RecipeEditor key="edit" /> },
          { path: PATHS.RECIPES.DETAIL(':id'), element: <RecipeDetail /> },
          { path: PATHS.ME.RECIPES, element: <MyRecipes /> },

          // Videos (SCR-21)
          { path: PATHS.VIDEOS.DETAIL(':id'), element: <VideoPlayer /> },

          // Community (SCR-25 → SCR-28)
          { path: PATHS.COMMUNITY.ROOT, element: <PostFeed /> },
          { path: PATHS.COMMUNITY.POST_DETAIL(':id'), element: <PostDetail /> },
          { path: PATHS.ME.POSTS, element: <MyPosts /> },
          {
            element: <RequireAuth />,
            children: [
              { path: PATHS.COMMUNITY.NEW_POST, element: <PostEditor /> },
              { path: PATHS.COMMUNITY.EDIT_POST(':id'), element: <PostEditor /> },
              { path: PATHS.AUTH.CHANGE_PASSWORD, element: <ChangePasswordPage /> },
            ],
          },

          // Thực đơn tuần & danh sách đi chợ (SCR-22 → SCR-24): chỉ Thành viên/VIP
          {
            element: <RequireAuth />,
            children: [
              { path: PATHS.MEAL_PLANS.ROOT, element: <MealPlanList /> },
              { path: PATHS.MEAL_PLANS.NEW, element: <MealPlanGenerate /> },
              { path: PATHS.MEAL_PLANS.DETAIL(':id'), element: <MealPlanDetail /> },
              { path: PATHS.SHOPPING_LISTS.DETAIL(':id'), element: <ShoppingList /> },
            ],
          },

          // Chatbot RAG (SCR-29)
          { path: PATHS.CHAT.ROOT, element: <ChatPage /> },
          { path: PATHS.CHAT.SESSION(':sessionId'), element: <ChatPage /> },

          // Quét mã vạch (SCR-15: mọi người dùng) và lịch sử quét (SCR-16: chỉ Thành viên)
          { path: PATHS.SCANNER.ROOT, element: <BarcodeScan /> },
          {
            element: <RequireAuth />,
            children: [{ path: PATHS.SCANNER.HISTORY, element: <ScanHistory /> }],
          },

          // Fridge Vision (SCR-17)
          { path: PATHS.FRIDGE, element: <FridgePage /> },

          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        element: <GuestOnly />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: PATHS.AUTH.LOGIN, element: <LoginPage /> },
              { path: PATHS.AUTH.REGISTER, element: <RegisterPage /> },
              { path: PATHS.AUTH.VERIFY_OTP, element: <VerifyOtpPage /> },
              { path: PATHS.AUTH.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
              { path: PATHS.AUTH.RESET_PASSWORD, element: <ResetPasswordPage /> },
            ],
          },
        ],
      },
      {
        path: PATHS.ADMIN.DASHBOARD,
        element: <RequireAdmin />,
        children: [
          {
            element: <AdminLayout />,
            children: [{ index: true, element: <div className="p-8">Admin Dashboard</div> }],
          },
        ],
      },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
