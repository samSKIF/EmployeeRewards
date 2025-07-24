import { LeaveRequestForm } from '../components/leave/LeaveRequestForm';

export default function LeaveRequestPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Submit Leave Request</h1>
      <div className="max-w-2xl bg-white p-6 rounded shadow">
        <LeaveRequestForm />
      </div>
    </div>
  );
}
