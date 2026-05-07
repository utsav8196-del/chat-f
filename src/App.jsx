// App.jsx (complete – replace yours)
import React from 'react'
import { Toaster } from 'react-hot-toast'
import { Routes, Route, Navigate } from 'react-router'
import HomePage from './Pages/HomePage'
import LoginPage from './Pages/LoginPage'
import SignUpPage from './Pages/SignUpPage'
import OnboardingPage from './Pages/OnboardingPage'
import CallPage from './Pages/CallPage'
import ChatPage from './Pages/ChatPage'
import NotificationsPage from './Pages/NotificationsPage'
import FriendRequestPopup from "./components/FriendRequestPopup";
import EnableNotifications from "./components/EnableNotifications";
import useNotifications from "./hooks/useNotifications";
import PageLoader from './components/PageLoader'
import Layout from './components/Layout'
import useAuthUser from "./hooks/useAuthUser"
import { useThemeStore } from "./store/useThemeStore";
import FriendsPage from './Pages/FriendsPage'
import ProfilePage from './Pages/ProfilePage'
import LandingPage from './Pages/LandingPage'

const App = () => {
  const { isLoading, authUser } = useAuthUser();
  const { theme } = useThemeStore();

  const {
    friendRequestPopup,
    acceptFriendRequest,
    declineFriendRequest,
  } = useNotifications();

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;

  if (isLoading) return <PageLoader />;

  return (
    <div className="min-h-screen w-full" data-theme={theme}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={
          !isAuthenticated ? <SignUpPage /> : <Navigate to={isOnboarded ? "/home" : "/onboarding"} />
        } />
        <Route path="/login" element={
          !isAuthenticated ? <LoginPage /> : <Navigate to={isOnboarded ? "/home" : "/onboarding"} />
        } />
        <Route path="/onboarding" element={
          isAuthenticated
            ? (!isOnboarded ? <OnboardingPage /> : <Navigate to="/home" />)
            : <Navigate to="/login" />
        } />
        <Route path="/home" element={
          isAuthenticated && isOnboarded ? (
            <Layout showSidebar={true}><HomePage /></Layout>
          ) : (
            !isAuthenticated ? <Navigate to="/login" /> : <Navigate to="/onboarding" />
          )
        } />
        <Route path="/chat/:id" element={
          isAuthenticated && isOnboarded ? (
            <Layout showSidebar={false}><ChatPage /></Layout>
          ) : (
            <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
          )
        } />
        <Route path="/call/:id" element={
          isAuthenticated && isOnboarded ? <CallPage /> : <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
        } />
        <Route path="/notifications" element={
          isAuthenticated && isOnboarded ? (
            <Layout showSidebar={true}><NotificationsPage /></Layout>
          ) : (
            <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
          )
        } />
        <Route path="/friends" element={
          isAuthenticated && isOnboarded ? (
            <Layout showSidebar={true}><FriendsPage /></Layout>
          ) : (
            <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
          )
        } />
        <Route path="/profile" element={
          isAuthenticated && isOnboarded ? (
            <Layout showSidebar={true}><ProfilePage /></Layout>
          ) : (
            <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
          )
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster />
      <FriendRequestPopup
        request={friendRequestPopup}
        onAccept={acceptFriendRequest}
        onDecline={declineFriendRequest}
      />
      <EnableNotifications />
    </div>
  )
}

export default App