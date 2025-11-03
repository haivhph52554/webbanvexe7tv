import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import BookingDetail from './components/BookingDetail';
import PaymentPage from './components/PaymentPage';
import PaymentSuccess from './components/PaymentSuccess';
import RoutesPage from './components/RoutesPage';
import MyTicketsPage from './components/MyTicketsPage';
import TicketDetailPage from './components/TicketDetailPage';
import ContactPage from './components/ContactPage';
import AdminPage from './components/AdminPage';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/my-tickets" element={<MyTicketsPage />} />
          <Route path="/ticket-detail" element={<TicketDetailPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/booking/:routeId" element={<BookingDetail />} />
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
