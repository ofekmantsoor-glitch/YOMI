import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { PatientLayout, TherapistLayout } from './Layouts'
import { Helplines } from './patient/Helplines'
import { Join, MyTasks, NonCompletionScreen, ReportScreen, RequirePatient, Transparency } from './patient/screens'
import { AddPatient, AssignTask, FullReport, Login, PatientWeek, Patients, RequireTherapist } from './therapist/screens'

// The role comes from how you enter (PRD assumption 1): patients at /, therapists at /therapist. No role picker.
const router = createBrowserRouter([
  {
    element: <PatientLayout />,
    children: [
      { path: '/join', element: <Join /> },
      { path: '/help', element: <Helplines /> },
      { path: '/about', element: <Transparency /> },
      {
        element: <RequirePatient />,
        children: [
          { path: '/', element: <MyTasks /> },
          { path: '/report/:taskId', element: <ReportScreen /> },
          { path: '/not-done/:taskId', element: <NonCompletionScreen /> },
        ],
      },
    ],
  },
  {
    path: '/therapist',
    element: <TherapistLayout />,
    children: [
      { path: 'login', element: <Login /> },
      {
        element: <RequireTherapist />,
        children: [
          { index: true, element: <Patients /> },
          { path: 'new-patient', element: <AddPatient /> },
          { path: 'p/:id', element: <PatientWeek /> },
          { path: 'p/:id/new-task', element: <AssignTask /> },
          { path: 'r/:reportId', element: <FullReport /> },
        ],
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
