import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import StudentList from "@/pages/StudentList";
import StudentEnroll from "@/pages/StudentEnroll";
import BookingPractice from "@/pages/BookingPractice";
import BookingExam from "@/pages/BookingExam";
import LessonSchedule from "@/pages/LessonSchedule";
import LessonTimetable from "@/pages/LessonTimetable";
import LeaveApply from "@/pages/LeaveApply";
import LeaveAudit from "@/pages/LeaveAudit";
import ExamScore from "@/pages/ExamScore";
import ExamArchive from "@/pages/ExamArchive";
import UserManagement from "@/pages/UserManagement";
import VenueManagement from "@/pages/VenueManagement";
import DataExport from "@/pages/DataExport";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <ProtectedRoute roles={["admin", "coach", "student"]}>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/enroll"
            element={
              <ProtectedRoute roles={["admin"]}>
                <StudentEnroll />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute roles={["admin", "coach"]}>
                <StudentList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/enroll"
            element={
              <ProtectedRoute roles={["admin"]}>
                <StudentEnroll />
              </ProtectedRoute>
            }
          />
          <Route
            path="/practice"
            element={
              <ProtectedRoute roles={["admin", "coach", "student"]}>
                <BookingPractice />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam"
            element={
              <ProtectedRoute roles={["admin", "coach", "student"]}>
                <BookingExam />
              </ProtectedRoute>
            }
          />
          <Route
            path="/schedule"
            element={
              <ProtectedRoute roles={["admin", "coach"]}>
                <LessonSchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timetable"
            element={
              <ProtectedRoute roles={["admin", "coach", "student"]}>
                <LessonTimetable />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-audit"
            element={
              <ProtectedRoute roles={["admin", "coach"]}>
                <LeaveAudit />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leave-apply"
            element={
              <ProtectedRoute roles={["student"]}>
                <LeaveApply />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scores"
            element={
              <ProtectedRoute roles={["admin", "coach"]}>
                <ExamScore />
              </ProtectedRoute>
            }
          />
          <Route
            path="/archives"
            element={
              <ProtectedRoute roles={["admin"]}>
                <ExamArchive />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute roles={["admin"]}>
                <UserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/venues"
            element={
              <ProtectedRoute roles={["admin"]}>
                <VenueManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/export"
            element={
              <ProtectedRoute roles={["admin"]}>
                <DataExport />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<div className="text-center text-xl py-20">404 - 页面不存在</div>} />
      </Routes>
    </Router>
  );
}
