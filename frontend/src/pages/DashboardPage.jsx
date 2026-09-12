import React from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from '../components/Dashboard';
import ChatAssistant from '../components/ChatAssistant';
import ErrorBoundary from '../components/ErrorBoundary';
import { useTrips } from '../context/TripsContext';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { savedTrips, deleteTrip, loadingTrips, deletingTripId } = useTrips();

  const handleSelectTrip = (trip) => {
    if (!trip) return;
    const targetId = trip._id || trip.id;
    if (targetId) {
      navigate(`/plan/${targetId}`);
    }
  };

  return (
    <ErrorBoundary fallbackTitle="Dashboard Error" onReset={() => navigate('/')}>
      <Dashboard
        savedTrips={savedTrips}
        onDeleteTrip={deleteTrip}
        onSelectTrip={handleSelectTrip}
        setView={(view) => navigate(view === 'home' ? '/' : `/${view}`)}
        deletingTripId={deletingTripId}
        loadingTrips={loadingTrips}
      />
      {/* Show Chatbot on dashboard with most recent active trip info */}
      {savedTrips?.length > 0 && savedTrips[0] && (
        <ChatAssistant tripData={savedTrips[0]} />
      )}
    </ErrorBoundary>
  );
}
