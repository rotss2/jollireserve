import React from "react";
import { Navigate } from "react-router-dom";

export default function AdminRoute({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (!(user.role === "admin" || user.role === "staff")) return <Navigate to="/" replace />;
  return children;
}
